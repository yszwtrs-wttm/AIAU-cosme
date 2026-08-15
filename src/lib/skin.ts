import { hexToLab, rgbToHex, type Lab } from "@/lib/color";
import type { PersonalColor } from "@/lib/types";

/** 照明で色が転ぶので、提案はあくまで下書きという注意書き。 */
export const SKIN_TONE_LIGHTING_NOTE =
  "写真の色は照明に強く左右されます（白色灯・逆光・加工アプリで数段変わります）。自然光の下で影のない自撮りがいちばん近い値になります。提案はあくまで下書きなので、実際の肌を見ながら直してください。";

export type SkinToneCandidate = {
  hex: string;
  /** 明るさの位置づけ。ハイライトと影のどちらに寄せた候補かを示す。 */
  label: string;
};

export type SkinToneEstimate = {
  /** いちばん確からしい肌トーン。 */
  hex: string;
  lab: Lab;
  /** 明るめ / 中間 / 暗め の候補。影やテカリでずれたときの手直し用。 */
  candidates: SkinToneCandidate[];
  personalColor: PersonalColor;
  /** 肌と判定できた画素の割合。低いときは撮り直しを促す。 */
  coverage: number;
};

type SkinPixel = { r: number; g: number; b: number; lab: Lab };

/** 肌らしい画素かどうか。RGB の並びと YCbCr の色相範囲を併用する古典的な条件。 */
function isSkinPixel(r: number, g: number, b: number): boolean {
  if (r < 60 || g < 30 || b < 15) return false;
  if (r <= g || r <= b) return false;
  if (Math.max(r, g, b) - Math.min(r, g, b) < 10) return false;
  if (Math.abs(r - g) < 8) return false;

  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 72 && cb <= 132 && cr >= 130 && cr <= 178;
}

/**
 * 自撮りから肌トーンを推定する。顔は中央に寄るので、頬・額の当たる中央帯だけを見て、
 * テカリと影を明るさの上下 20% で切り落とした残りから中央値を取る。
 */
export function estimateSkinTone(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): SkinToneEstimate | null {
  const x0 = Math.floor(width * 0.2);
  const x1 = Math.ceil(width * 0.8);
  const y0 = Math.floor(height * 0.15);
  const y1 = Math.ceil(height * 0.75);

  const pixels: SkinPixel[] = [];
  let scanned = 0;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b, alpha] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (alpha < 200) continue;
      scanned += 1;
      if (!isSkinPixel(r, g, b)) continue;
      const lab = hexToLab(rgbToHex(r, g, b));
      if (lab.l > 94 || lab.l < 20) continue; // 白飛びと黒つぶれ
      pixels.push({ r, g, b, lab });
    }
  }

  if (scanned === 0 || pixels.length < 40) return null;

  const sorted = [...pixels].sort((p, q) => p.lab.l - q.lab.l);
  const main = averageHex(slice(sorted, 0.4, 0.6));
  if (!main) return null;

  const light = averageHex(slice(sorted, 0.6, 0.8));
  const dark = averageHex(slice(sorted, 0.2, 0.4));

  const candidates: SkinToneCandidate[] = [{ hex: main, label: "中間（おすすめ）" }];
  if (light) candidates.push({ hex: light, label: "明るめ" });
  if (dark) candidates.push({ hex: dark, label: "暗め" });

  const lab = hexToLab(main);
  return {
    hex: main,
    lab,
    candidates,
    personalColor: suggestPersonalColor(lab),
    coverage: pixels.length / scanned,
  };
}

function slice(sorted: SkinPixel[], from: number, to: number): SkinPixel[] {
  const start = Math.floor(sorted.length * from);
  const end = Math.max(start + 1, Math.floor(sorted.length * to));
  return sorted.slice(start, end);
}

function averageHex(pixels: SkinPixel[]): string | null {
  if (pixels.length === 0) return null;
  const sum = pixels.reduce(
    (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
    { r: 0, g: 0, b: 0 },
  );
  return rgbToHex(
    Math.round(sum.r / pixels.length),
    Math.round(sum.g / pixels.length),
    Math.round(sum.b / pixels.length),
  );
}

/**
 * 肌の Lab からパーソナルカラーの候補を出す。
 * b*（黄み）と a*（赤み）の比で黄み寄り / 青み寄りを、L* で明るさのグループを決める。
 * 本来は瞳や髪も見るので、あくまで候補。
 */
export function suggestPersonalColor(lab: Lab): PersonalColor {
  const warm = lab.b - lab.a * 0.9 > 5;
  const light = lab.l >= 65;
  if (warm) return light ? "spring" : "autumn";
  return light ? "summer" : "winter";
}

/** 肌の明るさを言葉にする。HEX を出さずに提案を説明するため。 */
export function skinToneWords(lab: Lab): string {
  const brightness =
    lab.l >= 74 ? "とても明るい" : lab.l >= 66 ? "明るい" : lab.l >= 56 ? "標準" : "やや暗い";
  const undertone = lab.b - lab.a * 0.9 > 5 ? "黄み寄り" : "赤み寄り";
  return `${brightness}・${undertone}`;
}
