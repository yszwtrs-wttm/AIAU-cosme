"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import ReviewImage from "@/components/ReviewImage";
import { loadMoreFeed } from "@/app/feed/actions";
import type { FeedCursor, FeedReview } from "@/app/feed/feed-data";
import { THUMB_WIDTH } from "@/lib/storage";

function FeedCard({ review }: { review: FeedReview }) {
  const images = [...(review.review_images ?? [])].sort((a, b) => a.pos - b.pos);

  return (
    <article className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      {images.length > 0 && (
        <div className="flex gap-1 overflow-x-auto">
          {images.map((img) => (
            <ReviewImage key={img.id} path={img.path} width={THUMB_WIDTH} className="h-40 w-full" />
          ))}
        </div>
      )}
      <div className="space-y-1.5 p-4">
        <div className="flex items-center gap-2 text-xs">
          <Avatar
            name={review.profiles?.display_name ?? ""}
            hue={review.profiles?.avatar_hue ?? 330}
            avatarUrl={review.profiles?.avatar_url}
            size="sm"
          />
          {review.profiles?.handle ? (
            <Link href={`/u/${review.profiles.handle}`} className="font-bold hover:text-brand-600">
              {review.profiles.display_name}
            </Link>
          ) : (
            <span className="font-bold">{review.author_name}</span>
          )}
          <span className="text-amber-500">{"★".repeat(review.rating)}</span>
        </div>
        <Link href={`/products/${review.product_id}`} className="block text-sm font-bold hover:text-brand-600">
          {review.products?.brands?.name} {review.products?.name}
        </Link>
        <p className="text-sm leading-relaxed">{review.body}</p>
      </div>
    </article>
  );
}

/** サーバーで読んだ1ページ目に、カーソルで続きを足していく投稿一覧。 */
export default function FeedList({
  initialReviews,
  initialCursor,
}: {
  initialReviews: FeedReview[];
  initialCursor: FeedCursor | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(false);
    try {
      const next = await loadMoreFeed(cursor);
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...next.reviews.filter((r) => !seen.has(r.id))];
      });
      setCursor(next.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !cursor || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <FeedCard key={r.id} review={r} />
        ))}
      </section>

      {reviews.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ投稿がありません。
        </p>
      )}

      <div ref={sentinel} className="flex justify-center py-4 text-sm text-ink-400">
        {cursor ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-full border border-ink-200 bg-white px-5 py-2 font-bold text-ink-600 disabled:opacity-60"
          >
            {loading ? "読み込み中…" : error ? "読み込みに失敗しました。もう一度" : "もっと見る"}
          </button>
        ) : (
          reviews.length > 0 && <span>すべて表示しました</span>
        )}
      </div>
    </>
  );
}
