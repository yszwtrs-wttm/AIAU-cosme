import ColorLab from "@/components/ColorLab";
import { getMyProfile } from "@/lib/auth";

/** ポーチの色マップから「持っていない色」を渡して来られるようにする。 */
function parseHex(value?: string): string | null {
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

export default async function ColorPage({
  searchParams,
}: {
  searchParams: Promise<{ hex?: string }>;
}) {
  const [profile, params] = await Promise.all([getMyProfile(), searchParams]);
  const initialHex = parseHex(params.hex);

  return (
    <div className="space-y-4">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">色から探す</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          {initialHex
            ? "ポーチに無い色から探しています。写真を選べば「この色にしたい」からも探せます。"
            : "「この色にしたい」という写真を選ぶだけ。近い色のコスメを、手持ちや安いものから探します。"}
        </p>
      </section>
      <ColorLab skinToneHex={profile?.skin_tone_hex ?? null} initialHex={initialHex} />
    </div>
  );
}
