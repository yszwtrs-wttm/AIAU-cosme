import type { Category, ProductColor } from "@/lib/types";

type Props = {
  category: Category;
  colors: ProductColor[];
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

const FALLBACK = "#d8d3ce";

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v + amount))),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** アイシャドウパレット: 蓋つきケースに色数ぶんのパンが並ぶ。 */
function Palette({ colors }: { colors: ProductColor[] }) {
  const cols = colors.length > 6 ? 3 : 2;
  const rows = Math.ceil(colors.length / cols);
  const pad = 6;
  const cell = (64 - pad * 2) / cols;

  return (
    <>
      <rect x="1" y="1" width="62" height="62" rx="6" fill="#2b2723" />
      <rect x="3" y="3" width="58" height="58" rx="5" fill="#3a3531" />
      {colors.map((c, i) => {
        const cx = pad + (i % cols) * cell;
        const cy = pad + Math.floor(i / cols) * ((64 - pad * 2) / rows);
        return (
          <rect
            key={c.pos}
            x={cx + 1}
            y={cy + 1}
            width={cell - 2}
            height={(64 - pad * 2) / rows - 2}
            rx="2"
            fill={c.hex}
          />
        );
      })}
    </>
  );
}

/** リップ: 繰り出し式のバレット。 */
function Lipstick({ hex }: { hex: string }) {
  return (
    <>
      <rect x="24" y="4" width="16" height="22" rx="3" fill={hex} />
      <path d="M24 10 L40 4 L40 10 Z" fill={shade(hex, 30)} />
      <rect x="22" y="26" width="20" height="8" rx="2" fill="#c9b79c" />
      <rect x="23" y="34" width="18" height="26" rx="3" fill="#2b2723" />
      <rect x="26" y="38" width="4" height="18" rx="2" fill="#4a443f" />
    </>
  );
}

/** ファンデ・日焼け止め・BB: ポンプ付きのガラス瓶。 */
function Bottle({ hex }: { hex: string }) {
  return (
    <>
      <rect x="27" y="4" width="10" height="8" rx="2" fill="#3a3531" />
      <rect x="30" y="12" width="4" height="6" fill="#3a3531" />
      <rect x="18" y="18" width="28" height="42" rx="5" fill="#efece8" />
      <rect x="20" y="24" width="24" height="34" rx="4" fill={hex} />
      <rect x="21" y="26" width="4" height="30" rx="2" fill="#ffffff" opacity="0.28" />
    </>
  );
}

/** シャンプー・トリートメント: 大きめのボトル。 */
function Tube({ hex }: { hex: string }) {
  return (
    <>
      <rect x="26" y="3" width="12" height="7" rx="2" fill={shade(hex, -50)} />
      <path d="M20 16 Q32 8 44 16 L44 60 Q32 62 20 60 Z" fill={hex} />
      <rect x="24" y="28" width="16" height="14" rx="2" fill="#ffffff" opacity="0.75" />
    </>
  );
}

/**
 * 架空商品なので実写画像は持たない。カテゴリ別のパッケージ形状を色で塗った
 * 疑似商品画像を描く。パレットは色数ぶんのパンをそのまま並べる。
 */
export default function ProductThumb({
  category,
  colors: unordered,
  imageUrl,
  size = 56,
  className,
}: Props) {
  const colors = [...unordered].sort((a, b) => a.pos - b.pos);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-lg border border-neutral-200 object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const hex = colors[0]?.hex ?? FALLBACK;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="商品画像"
      className={`shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 ${className ?? ""}`}
    >
      {category === "eyeshadow" && colors.length > 0 ? (
        <Palette colors={colors} />
      ) : category === "lip" ? (
        <Lipstick hex={hex} />
      ) : category === "shampoo" || category === "treatment" ? (
        <Tube hex={colors[0]?.hex ?? "#6d8ba8"} />
      ) : (
        <Bottle hex={hex} />
      )}
    </svg>
  );
}
