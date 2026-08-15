"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { SKIN_TYPE_LABEL, type Profile, type SkinType } from "@/lib/types";

/** 肌の色は数値で聞かず、見本から選ばせる（ファンデの番号提案に使う）。 */
const SKIN_TONES = [
  { hex: "#f6e0d2", label: "とても明るい" },
  { hex: "#efd0bc", label: "明るい" },
  { hex: "#e2b899", label: "標準（黄より）" },
  { hex: "#dbb098", label: "標準（赤より）" },
  { hex: "#c69476", label: "少し暗い" },
  { hex: "#a8734f", label: "暗い" },
];

const HUES = [330, 300, 260, 200, 160, 20];

export default function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string | null;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skinTone, setSkinTone] = useState(profile?.skin_tone_hex ?? "");
  const [skinType, setSkinType] = useState<SkinType | "">(profile?.skin_type ?? "");
  const [hue, setHue] = useState(profile?.avatar_hue ?? 330);
  const [stashPublic, setStashPublic] = useState(profile?.stash_public ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <form
      className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const res = await saveProfile({
            handle,
            displayName,
            bio,
            skinToneHex: skinTone || null,
            skinType: skinType || null,
            stashPublic,
            avatarHue: hue,
          });
          if (!res.ok) {
            setError(res.error ?? "保存できませんでした");
            return;
          }
          setMessage("保存しました");
          router.push("/me");
          router.refresh();
        });
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-white"
          style={{ background: `hsl(${hue} 70% 62%)` }}
        >
          {(displayName || handle || "?").slice(0, 1)}
        </span>
        <div className="flex gap-1.5">
          {HUES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHue(h)}
              aria-label="アイコンの色"
              className={`h-7 w-7 rounded-full ${hue === h ? "ring-2 ring-brand-400 ring-offset-2" : ""}`}
              style={{ background: `hsl(${h} 70% 62%)` }}
            />
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-bold">表示名</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="あおい"
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <span className="text-[11px] text-ink-400">口コミには、この名前とアイコンが出ます。</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">ユーザーID</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          placeholder="aoi_cosme"
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <span className="text-[11px] text-ink-400">半角の小文字・数字・_ で3〜20文字。あとから変えられます。</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">ひとこと（任意）</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
      </label>

      <div className="space-y-1">
        <span className="text-sm font-bold">肌の色（任意）</span>
        <p className="text-[11px] text-ink-400">
          選んでおくと、ファンデーションで「あなたに近い番号」を先に出せます。
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {SKIN_TONES.map((t) => (
            <button
              key={t.hex}
              type="button"
              onClick={() => setSkinTone(skinTone === t.hex ? "" : t.hex)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] ${
                skinTone === t.hex ? "border-brand-400 bg-brand-50" : "border-brand-100 bg-white"
              }`}
            >
              <span className="swatch inline-block h-5 w-5 rounded-full" style={{ background: t.hex }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-bold">肌の状態（任意）</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(SKIN_TYPE_LABEL) as SkinType[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSkinType(skinType === k ? "" : k)}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                skinType === k ? "border-brand-400 bg-brand-50 text-brand-700" : "border-brand-100 bg-white"
              }`}
            >
              {SKIN_TYPE_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={stashPublic}
          onChange={(e) => setStashPublic(e.target.checked)}
        />
        ポーチの中身を、ユーザーページで公開する
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存する"}
        </button>
        <button type="button" onClick={() => void signOut()} className="text-xs text-ink-400 underline">
          ログアウト
        </button>
        {email && <span className="text-[11px] text-ink-400">{email}</span>}
      </div>
    </form>
  );
}
