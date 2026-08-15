"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Flag, ImagePlus, Lock, ShieldAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  attachReviewImages,
  postReview,
  reportReview,
  requestReviewRecheck,
} from "@/app/actions";
import Avatar from "@/components/Avatar";
import { axesFor } from "@/lib/feel";
import { closenessScore } from "@/lib/fit";
import { averageHash } from "@/lib/phash";
import { publicImageUrl } from "@/lib/storage";
import type { Category, RatingSummary, Review, SkinType } from "@/lib/types";
import { FLAG_DETAIL, FLAG_LABEL, SKIN_TYPE_LABEL } from "@/lib/types";

type Viewer = { skinType: SkinType | null; skinToneHex: string | null };

const MAX_IMAGES = 4;

function flagLabel(flag: string) {
  return FLAG_LABEL[flag] ?? flag;
}

/** 除外された自分の口コミに出す、判定の内訳と再判定リクエスト。 */
function AppealBox({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
      <div className="flex items-center gap-1.5 font-bold">
        <ShieldAlert size={13} /> あなたの投稿が点数に入っていない理由
      </div>
      <ul className="space-y-1">
        {review.flags.map((flag) => (
          <li key={flag}>
            <span className="font-bold">{flagLabel(flag)}</span>
            {FLAG_DETAIL[flag] && <span className="ml-1">{FLAG_DETAIL[flag]}</span>}
          </li>
        ))}
        {review.flags.length === 0 && <li>判定の内訳が記録されていません。</li>}
      </ul>
      <p className="text-[11px] text-amber-700">
        投稿は削除していません。判定に心当たりがない場合は、再判定をリクエストできます。
      </p>

      {result ? (
        <p className="font-bold">{result}</p>
      ) : open ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await requestReviewRecheck(review.id, message);
              if (!res.ok) {
                setError(res.error ?? "リクエストできませんでした");
                return;
              }
              setResult(
                res.restored
                  ? "再判定しました。この投稿は点数に入るようになりました。"
                  : "再判定しました。判定は変わりませんでした。内容は運営が確認します。",
              );
            });
          }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="自分で使った感想であることや、写真を撮った状況などを書いてください"
            className="w-full rounded-xl border border-amber-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-amber-400"
          />
          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || !message.trim()}
              className="rounded-full bg-amber-600 px-3 py-1 font-bold text-white disabled:opacity-50"
            >
              {pending ? "送信中…" : "再判定をリクエスト"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 underline">
              やめる
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-amber-300 bg-white px-3 py-1 font-bold text-amber-800"
        >
          異議を申し立てる（再判定をリクエスト）
        </button>
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value}点`}>
      {"★".repeat(value)}
      <span className="text-amber-200">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function ReviewCard({
  review,
  close,
  mine = false,
}: {
  review: Review;
  close: boolean;
  mine?: boolean;
}) {
  const [reported, setReported] = useState(false);
  const name = review.profiles?.display_name ?? review.author_name;
  const images = [...(review.review_images ?? [])].sort((a, b) => a.pos - b.pos);
  const skin = review.profiles?.skin_type;

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        review.excluded ? "border-amber-300" : "border-ink-200"
      }`}
    >
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
            await reportReview(review.id, "fake");
            setReported(true);
          }}
          className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600 disabled:opacity-50"
        >
          <Flag size={12} /> {reported ? "報告しました" : "報告"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {review.excluded && (
          <>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
              点数に入れていません
            </span>
            {review.flags.map((flag) => (
              <span key={flag} className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                {flagLabel(flag)}
              </span>
            ))}
          </>
        )}
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={publicImageUrl(img.path)}
              alt=""
              className="h-28 w-28 shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
      )}

      {review.excluded && mine && <AppealBox review={review} />}
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
  viewerUserId,
}: {
  productId: number;
  category: Category;
  initialReviews: Review[];
  initialSummary: RatingSummary | null;
  canPost: boolean;
  viewer: Viewer;
  viewerUserId: string | null;
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
  const [showExcluded, setShowExcluded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

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
  const excluded = reviews.filter((r) => r.excluded);
  const myExcluded = excluded.filter((r) => viewerUserId && r.user_id === viewerUserId);
  const rated = summary?.adjusted_rating ?? null;
  const counted = summary?.counted_count ?? 0;
  const hasViewerProfile = Boolean(viewer.skinType || viewer.skinToneHex);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await postReview({ productId, rating, body, feel });
      if (!res.ok || !res.reviewId) {
        setError(res.error ?? "投稿できませんでした");
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const uploaded: { path: string; phash?: string | null }[] = [];

        for (const file of files.slice(0, MAX_IMAGES)) {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const path = `${user!.id}/${res.reviewId}-${uploaded.length}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("review-images")
            .upload(path, file, { upsert: true });
          if (upErr) continue;
          uploaded.push({ path, phash: await averageHash(file) });
        }

        if (uploaded.length > 0) await attachReviewImages(res.reviewId, uploaded);
      }

      setBody("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
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
                宣伝目的・使い回しと判断した投稿は点数に入れていません（削除はしていません）。
                {summary.excluded_count > 0 &&
                  `除外した ${summary.excluded_count} 件は下の「除外した口コミも見る」から理由付きで読めます。`}
                実際に登録している人の声は、少し重く見て平均を出しています。
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
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES))
                }
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-600">
                {files.map((f) => (
                  <li
                    key={f.name}
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

          {error && <p className="text-xs text-red-600">{error}</p>}

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

      {myExcluded.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-amber-800">
            あなたの投稿 {myExcluded.length} 件が点数に入っていません
          </h3>
          {myExcluded.map((review) => (
            <ReviewCard key={review.id} review={review} close={false} mine />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {shown.map(({ review, score }) => (
          <ReviewCard key={review.id} review={review} close={score > 0} />
        ))}
      </div>

      {excluded.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowExcluded(!showExcluded)}
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-600"
          >
            {showExcluded
              ? "除外した口コミを隠す"
              : `除外した口コミも見る（${excluded.length}件）`}
          </button>
          {showExcluded && (
            <>
              <p className="text-[11px] text-ink-400">
                下の口コミは、判定した理由を付けたまま残しています。点数には入れていません。
              </p>
              {excluded.map((review) => (
                <ReviewCard key={review.id} review={review} close={false} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
