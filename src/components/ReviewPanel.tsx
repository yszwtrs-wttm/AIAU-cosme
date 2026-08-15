"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { postReview } from "@/app/actions";
import { FLAG_LABEL, type RatingSummary, type Review } from "@/lib/types";

function Stars({ value }: { value: number }) {
  return <span className="text-amber-500">{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
}

export default function ReviewPanel({
  productId,
  initialReviews,
  initialSummary,
}: {
  productId: number;
  initialReviews: Review[];
  initialSummary: RatingSummary | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();

  // 不正判定は Postgres の trigger が走らせる。結果は Realtime で降ってくる。
  useEffect(() => {
    const supabase = createClient();

    const refresh = async () => {
      const [{ data: rows }, { data: sum }] = await Promise.all([
        supabase.from("reviews").select("*").eq("product_id", productId).order("posted_at", { ascending: false }),
        supabase.from("product_rating_summary").select("*").eq("product_id", productId).maybeSingle(),
      ]);
      if (rows) setReviews(rows as Review[]);
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

  const excluded = reviews.filter((r) => r.excluded);
  const kept = reviews.filter((r) => !r.excluded);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-neutral-500">生の評価</div>
            <div className="text-2xl font-bold tabular-nums text-neutral-400 line-through">
              {summary?.raw_rating?.toFixed(2) ?? "—"}
            </div>
          </div>
          <div className="pb-2 text-neutral-400">→</div>
          <div>
            <div className="text-xs text-neutral-500">不正を除外した評価</div>
            <div className="text-3xl font-bold tabular-nums">{summary?.adjusted_rating?.toFixed(2) ?? "—"}</div>
          </div>
        </div>
        {summary && summary.excluded_count > 0 && (
          <p className="mt-3 text-sm text-neutral-700">
            {summary.review_count}件中<b>{summary.excluded_count}件</b>を総合評価から除外しています。理由：
            {summary.exclusion_reasons.map((f) => FLAG_LABEL[f] ?? f).join(" / ")}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          削除はしていません。除外した口コミも下に残し、除外理由を開示します。
        </p>
      </div>

      <form
        className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          startTransition(async () => {
            await postReview(productId, rating, body, author);
            setBody("");
          });
        }}
      >
        <div className="text-sm font-medium">口コミを投稿する（投稿した瞬間に判定が走ります）</div>
        <div className="flex gap-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="ユーザー名"
            className="w-40 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          />
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="本当に神コスメすぎる！朝塗ったら夜まで崩れない！みんな買って！"
          className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "投稿中…" : "投稿"}
        </button>
      </form>

      <div className="space-y-2">
        {kept.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Stars value={r.rating} />
              <span>{r.author_name}</span>
              <span className="tabular-nums">信頼度 {(r.trust_score * 100).toFixed(0)}%</span>
            </div>
            <p className="mt-1 text-sm">{r.body}</p>
          </div>
        ))}
      </div>

      {excluded.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-600">除外された口コミ（評価には算入していません）</div>
          {excluded.map((r) => (
            <div key={r.id} className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <Stars value={r.rating} />
                <span>{r.author_name}</span>
                <span className="tabular-nums">信頼度 {(r.trust_score * 100).toFixed(0)}%</span>
                {r.flags.map((f) => (
                  <span key={f} className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                    {FLAG_LABEL[f] ?? f}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-sm text-neutral-600">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
