"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { attachReviewImages, postReview } from "@/app/actions";
import { axesFor } from "@/lib/feel";
import { averageHash } from "@/lib/phash";
import type { Category } from "@/lib/types";

const MAX_IMAGES = 4;

/**
 * 口コミの入力フォーム。商品詳細（ReviewPanel）とフィードからの投稿で同じものを使う。
 */
export default function ReviewForm({
  productId,
  category,
  title = "使ってみた感想を書く",
  onPosted,
}: {
  productId: number;
  category: Category;
  title?: string;
  onPosted?: () => void;
}) {
  const axes = axesFor(category);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [feel, setFeel] = useState<Record<string, number>>(
    Object.fromEntries(axes.map((a) => [a.key, 50])),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

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
      onPosted?.();
    });
  };

  return (
    <form
      className="space-y-3 rounded-2xl border border-ink-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        submit();
      }}
    >
      <div className="text-sm font-bold">{title}</div>

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
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES))}
          />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-600">
            {files.map((f) => (
              <li key={f.name} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5">
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
  );
}
