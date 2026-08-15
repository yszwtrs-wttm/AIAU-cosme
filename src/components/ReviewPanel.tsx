"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { reportReview } from "@/app/actions";
import Avatar from "@/components/Avatar";
import ReviewForm from "@/components/ReviewForm";
import { closenessScore } from "@/lib/fit";
import { publicImageUrl } from "@/lib/storage";
import type { Category, RatingSummary, Review, SkinType } from "@/lib/types";
import { SKIN_TYPE_LABEL } from "@/lib/types";

type Viewer = { skinType: SkinType | null; skinToneHex: string | null };

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
            await reportReview(review.id, "fake");
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
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);

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
        <ReviewForm productId={productId} category={category} />
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
