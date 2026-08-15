"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions";
import Avatar from "@/components/Avatar";
import StashVisibilityField from "@/components/StashVisibilityField";
import { createClient } from "@/lib/supabase/client";
import {
  PERSONAL_COLOR_LABEL,
  SKIN_TYPE_LABEL,
  type IngredientMaster,
  type PersonalColor,
  type Product,
  type Profile,
  type SkinType,
  type StashVisibility,
} from "@/lib/types";

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
  ingredients,
  allergenIds,
  stashItems,
  shareToken,
}: {
  profile: Profile | null;
  ingredients: IngredientMaster[];
  allergenIds: number[];
  stashItems: Product[];
  shareToken: string | null;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skinTone, setSkinTone] = useState(profile?.skin_tone_hex ?? "");
  const [skinType, setSkinType] = useState<SkinType | "">(profile?.skin_type ?? "");
  const [personalColor, setPersonalColor] = useState<PersonalColor | "">(
    profile?.personal_color ?? "",
  );
  const [hue, setHue] = useState(profile?.avatar_hue ?? 330);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [stashVisibility, setStashVisibility] = useState<StashVisibility>(
    profile?.stash_visibility ?? "private",
  );
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>(allergenIds);
  const [allergenQuery, setAllergenQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const filteredIngredients = useMemo(() => {
    const query = allergenQuery.trim().toLowerCase();
    return ingredients
      .filter((ingredient) => {
        if (!query) return true;
        return (
          ingredient.inci.toLowerCase().includes(query) ||
          (ingredient.name_ja ?? "").toLowerCase().includes(query)
        );
      })
      .slice(0, 30);
  }, [allergenQuery, ingredients]);

  const selectedIngredients = ingredients.filter((ingredient) =>
    selectedAllergenIds.includes(ingredient.id),
  );

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("画像は5MB以下にしてください");
      return;
    }

    setAvatarBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAvatarBusy(false);
      setError("セッションがありません");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: false });
    if (uploadError) {
      setAvatarBusy(false);
      setError("アイコン画像をアップロードできませんでした");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setAvatarBusy(false);
  };

  const toggleAllergen = (ingredientId: number) => {
    setSelectedAllergenIds((current) =>
      current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId],
    );
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
            personalColor: personalColor || null,
            stashVisibility,
            avatarHue: hue,
            avatarUrl,
            allergenIds: selectedAllergenIds,
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
        <Avatar
          name={displayName || handle || "K"}
          hue={hue}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {HUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHue(value)}
                aria-label="アイコンの色"
                className={`h-7 w-7 rounded-full ${
                  hue === value ? "ring-2 ring-brand-400 ring-offset-2" : ""
                }`}
                style={{ background: `hsl(${value} 70% 62%)` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="cursor-pointer rounded-full border border-brand-200 px-3 py-1.5 text-brand-700">
              画像を選ぶ
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void uploadAvatar(e.target.files?.[0])}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="text-ink-400 underline"
              >
                デフォルトに戻す
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-bold">表示名</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ニックネーム"
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <span className="text-[11px] text-ink-400">口コミには、この名前とアイコンが出ます。</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold">ユーザーID</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          placeholder="kawanai_user"
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <span className="text-[11px] text-ink-400">
          半角の小文字・数字・_ で3〜20文字。あとから変えられます。
        </span>
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
        <span className="text-sm font-bold">肌のトーン（任意）</span>
        <p className="text-[11px] text-ink-400">
          選んでおくと、肌のトーンに近い色の商品を見つけやすくなります。
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.hex}
              type="button"
              onClick={() => setSkinTone(skinTone === tone.hex ? "" : tone.hex)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] ${
                skinTone === tone.hex
                  ? "border-brand-400 bg-brand-50"
                  : "border-brand-100 bg-white"
              }`}
            >
              <span className="swatch inline-block h-5 w-5 rounded-full" style={{ background: tone.hex }} />
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-bold">肌の状態（任意）</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(SKIN_TYPE_LABEL) as SkinType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSkinType(skinType === key ? "" : key)}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                skinType === key
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-brand-100 bg-white"
              }`}
            >
              {SKIN_TYPE_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-bold">パーソナルカラー（任意）</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(PERSONAL_COLOR_LABEL) as PersonalColor[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPersonalColor(personalColor === key ? "" : key)}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                personalColor === key
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-brand-100 bg-white"
              }`}
            >
              {PERSONAL_COLOR_LABEL[key]}
            </button>
          ))}
        </div>
        {personalColor && (
          <button
            type="button"
            onClick={() => setPersonalColor("")}
            className="text-[11px] text-ink-400 underline"
          >
            選択を解除
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-sm font-bold">避けたい成分（任意）</span>
          <p className="text-[11px] text-ink-400">
            登録した成分が入っている商品に注意を表示します。
          </p>
        </div>
        {selectedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedIngredients.map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                onClick={() => toggleAllergen(ingredient.id)}
                className="rounded-full bg-brand-50 px-2 py-1 text-[11px] text-brand-700"
              >
                {ingredient.name_ja || ingredient.inci} ×
              </button>
            ))}
          </div>
        )}
        <input
          type="search"
          value={allergenQuery}
          onChange={(e) => setAllergenQuery(e.target.value)}
          placeholder="成分名またはINCI名で検索"
          className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        <div className="max-h-48 overflow-y-auto rounded-2xl border border-ink-100">
          {filteredIngredients.map((ingredient) => {
            const selected = selectedAllergenIds.includes(ingredient.id);
            return (
              <button
                key={ingredient.id}
                type="button"
                onClick={() => toggleAllergen(ingredient.id)}
                className={`flex w-full items-center justify-between border-b border-ink-100 px-3 py-2 text-left text-xs last:border-b-0 ${
                  selected ? "bg-brand-50 text-brand-700" : "bg-white"
                }`}
              >
                <span>{ingredient.name_ja || ingredient.inci}</span>
                <span className="ml-2 text-[10px] text-ink-400">{ingredient.inci}</span>
              </button>
            );
          })}
          {filteredIngredients.length === 0 && (
            <p className="p-3 text-xs text-ink-400">一致する成分がありません。</p>
          )}
        </div>
      </div>

      <StashVisibilityField
        value={stashVisibility}
        onChange={setStashVisibility}
        profile={{
          handle,
          displayName,
          bio,
          avatarHue: hue,
          avatarUrl,
          skinToneHex: skinTone,
          skinType,
          personalColor,
        }}
        items={stashItems}
        shareToken={shareToken}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={pending || avatarBusy}
        className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending || avatarBusy ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
