"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Flag, ImagePlus, Lock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { attachReviewImages, postReview, reportReview } from "@/app/actions";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { japaneseError } from "@/lib/errors";
import { axesFor } from "@/lib/feel";
import { closenessScore } from "@/lib/fit";
import ReviewImage from "@/components/ReviewImage";
import { IMAGE_ACCEPT, shrinkImage, validateImageFile } from "@/lib/image";
import { averageHash } from "@/lib/phash";
import { THUMB_WIDTH } from "@/lib/storage";
import type { Category, RatingSummary, Review, SkinType } from "@/lib/types";
import { SKIN_TYPE_LABEL } from "@/lib/types";

type Viewer = { skinType: SkinType | null; skinToneHex: string | null };

const MAX_IMAGES = 4;

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value}点`}>
      {"★".repeat(value)}
      <span className="text-amber-200">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function ReviewCard({ review, close }: { review: Review; close: boolean }) {
  const [reported, setReported] = useState(false);
  const showToast = useToast();
  const name = review.profiles?.display_name ?? review.author_name;
  const images = [...(review.review_images ?? [])].sort((a, b) => a.pos - b.pos);
  const skin = review.profiles?.skin_type;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Avatar
          name={name}
          hue={review.profiles?.avatar_hue ?? 330}
          avatarUrl={review.profiles?.avatar_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {review.profiles?.handle ? (
              <Link href={`/u/${review.profiles.handle}`} className="hover:text-brand-600">
                {name}
              </Link>
            ) : (
              name
            )}
          </div>
          <Stars value={review.rating} />
        </div>
        <button
          type="button"
          disabled={reported}
          onClick={async () => {
            try {
              const res = await reportReview(review.id, "fake");
              if (!res.ok) {
                showToast(japaneseError(res.error, "報告できませんでした"));
                return;
              }
            } catch (e) {
              showToast(japaneseError(e, "報告できませんでした"));
              return;
            }
            setReported(true);
          }}
          className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600 disabled:opacity-50"
        >
          <Flag size={12} /> {reported ? "報告しました" : "報告"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {close && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
            あなたと近い肌の人
          </span>
        )}
        {skin && (
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-ink-600">
            {SKIN_TYPE_LABEL[skin]}
          </span>
        )}
        {review.owner_verified && (
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-ink-600">
            この商品を登録している人
          </span>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{review.body}</p>

      {images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img) => (
            <ReviewImage
              key={img.id}
              path={img.path}
              width={THUMB_WIDTH}
              className="h-28 w-28 overflow-hidden rounded-2xl"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewPanel({
  productId,
  category,
  initialReviews,
  initialSummary,
  canPost,
  viewer,
}: {
  productId: number;
  category: Category;
  initialReviews: Review[];
  initialSummary: RatingSummary | null;
  canPost: boolean;
  viewer: Viewer;
}) {
  const axes = axesFor(category);
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [feel, setFeel] = useState<Record<string, number>>(
    Object.fromEntries(axes.map((a) => [a.key, 50])),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ reviewId: number; files: File[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const showToast = useToast();

  // 不正判定は Postgres の trigger が走らせる。結果は Realtime で降ってくる。
  useEffect(() => {
    const supabase = createClient();

    const refresh = async () => {
      const [{ data: rows }, { data: sum }] = await Promise.all([
        supabase
          .from("reviews")
          .select(
            "*,profiles(handle,display_name,avatar_hue,avatar_url,skin_type,skin_tone_hex),review_images(id,review_id,path,pos)",
          )
          .eq("product_id", productId)
          .order("posted_at", { ascending: false }),
        supabase.from("product_rating_summary").select("*").eq("product_id", productId).maybeSingle(),
      ]);
      if (rows) setReviews(rows as unknown as Review[]);
      if (sum) setSummary(sum as RatingSummary);
    };

    const channel = supabase
      .channel(`reviews-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `product_id=eq.${productId}` },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  // 自分と近い肌の人の声を上に出す。同じ近さなら新しい順（元の並び）。
  const shown = reviews
    .filter((r) => !r.excluded)
    .map((r) => ({ review: r, score: closenessScore(viewer, r.profiles) }))
    .sort((a, b) => b.score - a.score);
  const rated = summary?.adjusted_rating ?? null;
  const counted = summary?.counted_count ?? 0;
  const hasViewerProfile = Boolean(viewer.skinType || viewer.skinToneHex);

  const pickFiles = (picked: File[]) => {
    const accepted: File[] = [];
    const messages: string[] = [];
    for (const file of picked) {
      const message = validateImageFile(file);
      if (message) messages.push(message);
      else accepted.push(file);
    }
    setError(messages.length > 0 ? messages.join(" / ") : null);
    setFiles(accepted.slice(0, MAX_IMAGES));
    if (fileInput.current) fileInput.current.value = "";
  };

  /** 縮小してから上げる。失敗した写真は返して再試行できるようにする。 */
  const uploadImages = async (reviewId: number, targets: File[]): Promise<File[]> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return targets;

    const uploaded: { path: string; phash?: string | null }[] = [];
    const rejected: File[] = [];
    setProgress({ done: 0, total: targets.length });

    for (const [index, file] of targets.entries()) {
      try {
        const shrunk = await shrinkImage(file);
        const ext = shrunk.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${reviewId}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("review-images")
          .upload(path, shrunk, { contentType: shrunk.type, upsert: true });
        if (upErr) rejected.push(file);
        else uploaded.push({ path, phash: await averageHash(shrunk) });
      } catch {
        rejected.push(file);
      }
      setProgress({ done: index + 1, total: targets.length });
    }

    // 口コミ本文は保存できているので、写真だけ失敗したことを伝える。
    if (uploaded.length > 0) {
      const attached = await attachReviewImages(reviewId, uploaded);
      if (!attached.ok) {
        setProgress(null);
        showToast(japaneseError(attached.error, "口コミは投稿できましたが、写真を上げられませんでした"));
        return targets;
      }
    }
    setProgress(null);
    if (rejected.length > 0) {
      showToast("口コミは投稿できましたが、一部の写真を上げられませんでした");
    }
    return rejected;
  };

  const submit = () => {
    setError(null);
    setFailed(null);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof postReview>>;
      try {
        res = await postReview({ productId, rating, body, feel });
      } catch (e) {
        setError(japaneseError(e, "投稿できませんでした"));
        return;
      }
      if (!res.ok || !res.reviewId) {
        setError(japaneseError(res.error, "投稿できませんでした"));
        return;
      }

      const rejected = files.length > 0 ? await uploadImages(res.reviewId, files) : [];

      showToast("口コミを投稿しました", "success");
      setBody("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      if (rejected.length > 0) {
        setFailed({ reviewId: res.reviewId, files: rejected });
        setError(`${rejected.length}枚の写真をアップロードできませんでした`);
      }
    });
  };

  const retryUpload = () => {
    if (!failed) return;
    setError(null);
    const target = failed;
    setFailed(null);
    startTransition(async () => {
      const rejected = await uploadImages(target.reviewId, target.files);
      if (rejected.length > 0) {
        setFailed({ reviewId: target.reviewId, files: rejected });
        setError(`${rejected.length}枚の写真をアップロードできませんでした`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4">
        <div>
          <div className="font-display text-4xl font-bold tabular-nums">
            {rated?.toFixed(1) ?? "—"}
          </div>
          <div className="text-[11px] text-ink-400">5点満点</div>
        </div>
        <div className="text-sm text-ink-600">
          {summary?.review_count ? (
            <>
              点数に入っている口コミ {counted} 件
              <p className="mt-0.5 text-[11px] text-ink-400">
                宣伝目的・使い回しと判断した投稿は点数に入れていません。実際に登録している人の声は、
                少し重く見て平均を出しています。
              </p>
            </>
          ) : (
            "まだ口コミがありません"
          )}
        </div>
      </div>

      {hasViewerProfile && shown.some((s) => s.score > 0) && (
        <p className="text-[11px] text-ink-400">あなたと肌が近い人の口コミを上に並べています。</p>
      )}

      {canPost ? (
        <form
          className="space-y-3 rounded-2xl border border-ink-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            submit();
          }}
        >
          <div className="text-sm font-bold">使ってみた感想を書く</div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-amber-200"}`}
                aria-label={`${n}点`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="どんなときに使って、どう良かった（悪かった）かを書くと参考になります"
            className="w-full rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300"
          />

          <div className="space-y-2 rounded-2xl bg-brand-50/60 p-3">
            <div className="text-xs font-bold text-brand-700">使い心地（任意）</div>
            {axes.map((axis) => (
              <label key={axis.key} className="block">
                <span className="flex justify-between text-[11px] text-ink-400">
                  <span>{axis.low}</span>
                  <span className="font-bold text-ink-900">{axis.label}</span>
                  <span>{axis.high}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={feel[axis.key]}
                  onChange={(e) => setFeel({ ...feel, [axis.key]: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            ))}
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-600">
              <ImagePlus size={14} /> 写真を追加（{files.length}/{MAX_IMAGES}）
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => pickFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-600">
                {files.map((f) => (
                  <li
                    key={`${f.name}-${f.lastModified}-${f.size}`}
                    className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((x) => x !== f))}
                      aria-label="この写真を外す"
                    >
                      <X size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] text-ink-400">
            JPEG / PNG / WebP / HEIC、1枚12MBまで。大きい写真は自動で縮小して上げます。
          </p>

          {progress && (
            <p className="text-xs text-ink-600">
              写真をアップロード中… {progress.done}/{progress.total}
            </p>
          )}

          {error && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-red-600">{error}</p>
              {failed && (
                <button
                  type="button"
                  onClick={retryUpload}
                  disabled={pending}
                  className="rounded-full border border-brand-200 px-2.5 py-1 text-[11px] font-bold text-brand-600 disabled:opacity-50"
                >
                  写真を再試行
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "投稿中…" : "投稿する"}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-sm">
          <Lock size={16} className="text-ink-400" />
          <span>口コミを書くにはログインが必要です。</span>
          <Link
            href="/login"
            className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            ログイン
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {shown.map(({ review, score }) => (
          <ReviewCard key={review.id} review={review} close={score > 0} />
        ))}
      </div>
    </div>
  );
}
