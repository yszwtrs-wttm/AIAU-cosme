import type { Category, ProductColor } from "@/lib/types";

type Props = {
  category: Category;
  colors: ProductColor[];
  imageUrl?: string | null;
  /** ブランドごとに質感（マット / ツヤ）とキャップの色味を変える */
  brand?: string | null;
  size?: number;
  className?: string;
};

const FALLBACK = "#d8d3ce";

/** 色を持たないカテゴリでも中身の想像がつく既定色 */
const CATEGORY_TINT: Record<Category, string> = {
  lip: "#c0574f",
  foundation: "#d8ab86",
  bb: "#cf9d78",
  sunscreen: "#e8e4dd",
  shampoo: "#6d8ba8",
  treatment: "#c9b7a4",
  eyeshadow: "#a97f6b",
};

/** カテゴリごとに背景を薄く色分けして、一覧でも並びの違いが分かるようにする */
const CATEGORY_BG: Record<Category, string> = {
  lip: "#fdf3f2",
  foundation: "#fbf5ee",
  bb: "#faf4ef",
  sunscreen: "#fdfaef",
  shampoo: "#f1f6fa",
  treatment: "#f7f2fa",
  eyeshadow: "#f5f2f0",
};

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return FALLBACK;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v + amount))),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** ブランド名から質感を決める。同じブランドなら常に同じ見え方になる。 */
function finishOf(brand?: string | null): "matte" | "glossy" {
  if (!brand) return "matte";
  let h = 0;
  for (const c of brand) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % 2 === 0 ? "glossy" : "matte";
}

/** 質感の表現。ツヤは白いハイライト、マットはうっすら曇らせる。 */
function Finish({
  finish,
  x,
  y,
  width,
  height,
  rx = 2,
}: {
  finish: "matte" | "glossy";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}) {
  if (finish === "glossy") {
    return (
      <>
        <rect x={x} y={y} width={width * 0.28} height={height} rx={rx} fill="#fff" opacity="0.5" />
        <rect
          x={x + width * 0.62}
          y={y}
          width={width * 0.14}
          height={height}
          rx={rx}
          fill="#fff"
          opacity="0.22"
        />
      </>
    );
  }
  return <rect x={x} y={y} width={width} height={height} rx={rx} fill="#fff" opacity="0.1" />;
}

/** アイシャドウパレット: 開いた蓋の鏡と、色数ぶんのパン。 */
function Palette({ colors, finish }: { colors: ProductColor[]; finish: "matte" | "glossy" }) {
  const cols = colors.length > 6 ? 3 : colors.length > 1 ? 2 : 1;
  const rows = Math.ceil(colors.length / cols);
  const top = 20;
  const pad = 5;
  const cellW = (64 - pad * 2) / cols;
  const cellH = (64 - top - pad) / rows;

  return (
    <>
      <rect x="2" y="2" width="60" height="60" rx="6" fill="#2b2723" />
      {/* 開いた蓋の鏡 */}
      <rect x="5" y="5" width="54" height="12" rx="3" fill="#dfe3e6" />
      <path d="M5 17 L20 5 L30 5 L11 17 Z" fill="#ffffff" opacity="0.65" />
      <rect x="4" y="19" width="56" height="41" rx="4" fill="#3a3531" />
      {colors.map((c, i) => {
        const x = pad + (i % cols) * cellW;
        const y = top + Math.floor(i / cols) * cellH;
        return (
          <g key={c.pos}>
            <rect
              x={x + 1}
              y={y + 1}
              width={cellW - 2}
              height={cellH - 2}
              rx="2"
              fill={c.hex}
            />
            {finish === "glossy" && (
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={(cellW - 3) * 0.4}
                height={cellH - 3}
                rx="1.5"
                fill="#fff"
                opacity="0.3"
              />
            )}
          </g>
        );
      })}
    </>
  );
}

/** リップ: 繰り出し式のバレット。 */
function Lipstick({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <path d="M23 28 H41 V8 L23 17 Z" fill={hex} />
      <path d="M23 17 L41 8 V12 L23 21 Z" fill={shade(hex, 34)} />
      {finish === "glossy" ? (
        <rect x="25" y="20" width="4" height="8" rx="2" fill="#fff" opacity="0.45" />
      ) : (
        <rect x="23" y="21" width="18" height="7" fill="#fff" opacity="0.08" />
      )}
      <rect x="21" y="28" width="22" height="6" rx="1.5" fill="#c9b79c" />
      <rect x="21" y="29.5" width="22" height="1.5" fill="#fff" opacity="0.5" />
      <rect x="22" y="34" width="20" height="26" rx="3" fill="#2b2723" />
      <rect x="22" y="42" width="20" height="7" fill={shade(hex, -30)} />
      <rect x="25" y="52" width="3" height="6" rx="1.5" fill="#4a443f" />
    </>
  );
}

/** ファンデーション: ポンプ付きのガラス瓶。中身の色が液面に出る。 */
function PumpBottle({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <rect x="27" y="3" width="11" height="6" rx="2" fill="#3a3531" />
      <path d="M27 6 H20 V9 H27 Z" fill="#3a3531" />
      <rect x="30" y="9" width="5" height="5" fill="#57504a" />
      <path d="M18 20 Q32 12 46 20 V56 Q46 60 42 60 H22 Q18 60 18 56 Z" fill="#efece8" />
      <path d="M20 26 Q32 20 44 26 V55 Q44 58 41 58 H23 Q20 58 20 55 Z" fill={hex} />
      <Finish finish={finish} x={21} y={28} width={22} height={28} rx={3} />
      <rect x="20" y="38" width="24" height="9" fill="#ffffff" opacity="0.82" />
    </>
  );
}

/** BBクリーム: 上にキャップのあるスクイズチューブ。 */
function CreamTube({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <rect x="27" y="3" width="10" height="7" rx="1.5" fill={shade(hex, -60)} />
      <path d="M22 14 Q32 9 42 14 V56 Q42 60 38 60 H26 Q22 60 22 56 Z" fill={hex} />
      <Finish finish={finish} x={23} y={16} width={18} height={42} rx={4} />
      <rect x="22" y="30" width="20" height="12" fill="#ffffff" opacity="0.85" />
      <rect x="25" y="34" width="14" height="2" rx="1" fill={shade(hex, -40)} />
      <rect x="25" y="38" width="9" height="1.5" rx="0.75" fill={shade(hex, -10)} />
      <rect x="24" y="57" width="16" height="3" rx="1" fill={shade(hex, -70)} />
    </>
  );
}

const SUN = "#e8a33d";

/** 日焼け止め: 白いチューブに太陽マーク。 */
function SunscreenTube({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <rect x="26" y="3" width="12" height="6" rx="1.5" fill={shade(hex, -70)} />
      <path d="M21 13 Q32 8 43 13 V57 Q43 60 40 60 H24 Q21 60 21 57 Z" fill="#f6f4f0" />
      <Finish finish={finish} x={22} y={15} width={20} height={44} rx={4} />
      <rect x="21" y="20" width="22" height="10" fill={hex} />
      {/* 太陽 */}
      <circle cx="32" cy="43" r="5.5" fill={SUN} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect
          key={deg}
          x="31.2"
          y="34"
          width="1.6"
          height="3.4"
          rx="0.8"
          fill={SUN}
          transform={`rotate(${deg} 32 43)`}
        />
      ))}
    </>
  );
}

/** シャンプー: 背の高いポンプボトル。 */
function ShampooBottle({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <path d="M30 2 H37 V6 H44 V9 H30 Z" fill={shade(hex, -70)} />
      <rect x="30" y="9" width="5" height="6" fill={shade(hex, -50)} />
      <rect x="19" y="15" width="26" height="45" rx="6" fill={hex} />
      <Finish finish={finish} x={20} y={17} width={24} height={41} rx={5} />
      <rect x="19" y="30" width="26" height="14" fill="#ffffff" opacity="0.88" />
      <rect x="23" y="34" width="18" height="2.5" rx="1.25" fill={shade(hex, -40)} />
      <rect x="23" y="39" width="11" height="2" rx="1" fill={shade(hex, -10)} />
    </>
  );
}

/** トリートメント: 平たいジャー。 */
function Jar({ hex, finish }: { hex: string; finish: "matte" | "glossy" }) {
  return (
    <>
      <rect x="14" y="14" width="36" height="12" rx="3" fill={shade(hex, -55)} />
      <rect x="14" y="17" width="36" height="2.5" fill="#ffffff" opacity="0.3" />
      <rect x="16" y="26" width="32" height="28" rx="4" fill={hex} />
      <Finish finish={finish} x={17} y={28} width={30} height={24} rx={3} />
      <rect x="16" y="36" width="32" height="10" fill="#ffffff" opacity="0.85" />
      <rect x="21" y="39" width="22" height="2.5" rx="1.25" fill={shade(hex, -40)} />
      <rect x="18" y="54" width="28" height="4" rx="2" fill={shade(hex, -55)} />
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
  brand,
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

  const hex = colors[0]?.hex ?? CATEGORY_TINT[category];
  const finish = finishOf(brand);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="商品画像"
      className={`shrink-0 rounded-lg border border-neutral-200 ${className ?? ""}`}
      style={{ background: CATEGORY_BG[category] }}
    >
      {category === "eyeshadow" && colors.length > 0 ? (
        <Palette colors={colors} finish={finish} />
      ) : category === "lip" ? (
        <Lipstick hex={hex} finish={finish} />
      ) : category === "shampoo" ? (
        <ShampooBottle hex={hex} finish={finish} />
      ) : category === "treatment" ? (
        <Jar hex={hex} finish={finish} />
      ) : category === "sunscreen" ? (
        <SunscreenTube hex={hex} finish={finish} />
      ) : category === "bb" ? (
        <CreamTube hex={hex} finish={finish} />
      ) : (
        <PumpBottle hex={hex} finish={finish} />
      )}
    </svg>
  );
}
