"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { X } from "lucide-react";
import { imageUrl, publicImageUrl } from "@/lib/storage";

const FULL_WIDTH = 1600;

/**
 * 口コミ写真。一覧では表示幅に合わせたサムネを読み、押したときだけ大きい画像を取る。
 * 画像変換が効かない環境では原寸 URL に落とす。
 */
export default function ReviewImage({
  path,
  width,
  priority = false,
  className = "",
}: {
  path: string;
  width: number;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);

  // SSR で描いた画像の読み込みは hydration より前に終わっているので、onError では拾えない。
  // 読み込み済みなのに大きさがない＝失敗しているので、mount 時に自分で見る。
  useEffect(() => {
    const img = thumbRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  // next/image の最適化は挟まず、Storage の画像変換をそのままローダーにする。
  const loader = useCallback(
    ({ src, width: w, quality }: ImageLoaderProps) =>
      failed ? publicImageUrl(src) : imageUrl(src, { width: w, quality }),
    [failed],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative block shrink-0 ${className}`}
      >
        <Image
          ref={thumbRef}
          loader={loader}
          src={path}
          alt=""
          fill
          sizes={`${width}px`}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <Image
            loader={loader}
            src={path}
            alt=""
            width={FULL_WIDTH}
            height={FULL_WIDTH}
            quality={80}
            sizes="100vw"
            onError={() => setFailed(true)}
            className="h-auto max-h-full w-auto max-w-full rounded-2xl object-contain"
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
