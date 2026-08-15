"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { imageUrl, publicImageUrl } from "@/lib/storage";

const FULL_WIDTH = 1600;

/**
 * 口コミ写真。一覧では表示幅に合わせたサムネを読み、押したときだけ大きい画像を取る。
 * 画像変換が効かない環境（無料プランなど）は原寸 URL に落とす。
 */
export default function ReviewImage({
  path,
  width,
  className = "",
}: {
  path: string;
  width: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const thumb = failed ? publicImageUrl(path) : imageUrl(path, { width });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`block shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={failed ? publicImageUrl(path) : imageUrl(path, { width: FULL_WIDTH, quality: 80 })}
            alt=""
            onError={() => setFailed(true)}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
          <button
            type="button"
            aria-label="閉じる"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
