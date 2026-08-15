import ColorLab from "@/components/ColorLab";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FrequentColor } from "@/lib/types";

export default async function ColorPage() {
  const profile = await getMyProfile();

  // 記録から「よく使う色」を出して、写真を選ぶ前でも探しはじめられるようにする。
  const supabase = await createClient();
  const { data: frequent } = await supabase
    .rpc("my_frequent_colors", { p_limit: 4 })
    .returns<FrequentColor[]>();

  return (
    <div className="space-y-4">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">写真の色から探す</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          「この色にしたい」という写真を選ぶだけ。近い色のコスメを、手持ちや安いものから探します。
        </p>
      </section>
      <ColorLab skinToneHex={profile?.skin_tone_hex ?? null} frequentColors={frequent ?? []} />
    </div>
  );
}
