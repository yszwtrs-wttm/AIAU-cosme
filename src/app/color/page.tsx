import ColorLab from "@/components/ColorLab";
import { getMyProfile } from "@/lib/auth";
import { TERMS } from "@/lib/copy";

export default async function ColorPage() {
  const profile = await getMyProfile();

  return (
    <div className="space-y-4">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">写真の色から探す</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          「この色にしたい」という写真を選ぶだけ。近い色のコスメを、{TERMS.pouch}の中や安いものから探します。
        </p>
      </section>
      <ColorLab skinToneHex={profile?.skin_tone_hex ?? null} />
    </div>
  );
}
