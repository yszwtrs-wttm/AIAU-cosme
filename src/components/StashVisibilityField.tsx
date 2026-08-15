"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Globe, Link2, Lock } from "lucide-react";
import { regenerateShareToken } from "@/app/actions";
import Avatar from "@/components/Avatar";
import ProductThumb from "@/components/ProductThumb";
import {
  PERSONAL_COLOR_LABEL,
  SKIN_TYPE_LABEL,
  STASH_VISIBILITY_HINT,
  STASH_VISIBILITY_LABEL,
  type PersonalColor,
  type Product,
  type SkinType,
  type StashVisibility,
} from "@/lib/types";

const ICON: Record<StashVisibility, typeof Globe> = {
  public: Globe,
  link: Link2,
  private: Lock,
};

const ORDER: StashVisibility[] = ["public", "link", "private"];

type PreviewProfile = {
  handle: string;
  displayName: string;
  bio: string;
  avatarHue: number;
  avatarUrl: string | null;
  skinToneHex: string;
  skinType: SkinType | "";
  personalColor: PersonalColor | "";
};

/**
 * ポーチの公開範囲。所持コスメは購買履歴に近い情報なので、
 * 何が見えるのかをプレビューで確かめてから公開できるようにする。
 */
export default function StashVisibilityField({
  value,
  onChange,
  profile,
  items,
  shareToken,
}: {
  value: StashVisibility;
  onChange: (next: StashVisibility) => void;
  profile: PreviewProfile;
  items: Product[];
  shareToken: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(shareToken);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const shareUrl =
    typeof window === "undefined" || !profile.handle
      ? ""
      : `${window.location.origin}/u/${profile.handle}${token ? `?stash=${token}` : ""}`;

  return (
    <div className="space-y-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
      <div>
        <span className="text-sm font-bold">ポーチの公開範囲</span>
        <p className="text-[11px] text-ink-500">
          手持ちコスメは買ったものの記録に近い情報です。既定は非公開で、公開するときは見え方を先に確認できます。
          <Link href="/privacy" className="ml-1 text-brand-700 underline">
            公開範囲とプライバシー
          </Link>
        </p>
      </div>

      <div className="space-y-1.5">
        {ORDER.map((option) => {
          const Icon = ICON[option];
          const selected = value === option;
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-3 py-2 ${
                selected ? "border-brand-400 bg-white" : "border-brand-100 bg-white/60"
              }`}
            >
              <input
                type="radio"
                name="stash-visibility"
                className="mt-1"
                checked={selected}
                onChange={() => onChange(option)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Icon size={14} className="text-brand-600" />
                  {STASH_VISIBILITY_LABEL[option]}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {STASH_VISIBILITY_HINT[option]}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {value === "link" && (
        <div className="space-y-1.5 rounded-2xl bg-white p-3">
          <div className="text-[11px] text-ink-500">
            {token
              ? "このリンクを渡した人だけがポーチを見られます。"
              : "保存すると共有リンクが作られます。"}
          </div>
          {token && (
            <>
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-[11px] text-ink-600"
              />
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(shareUrl);
                    setCopied(true);
                  }}
                  className="flex items-center gap-1 rounded-full border border-brand-200 px-3 py-1 text-brand-700"
                >
                  {copied ? <Check size={12} /> : <Link2 size={12} />}
                  {copied ? "コピーしました" : "リンクをコピー"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await regenerateShareToken();
                      if (res.ok && res.token) {
                        setToken(res.token);
                        setCopied(false);
                      }
                    })
                  }
                  className="text-ink-400 underline disabled:opacity-50"
                >
                  リンクを作り直す（古いリンクは見られなくなります）
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-brand-700 underline"
      >
        <Eye size={13} />
        {open ? "プレビューを閉じる" : "公開したときの見え方を確認する"}
      </button>

      {open && (
        <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-3">
          <div className="text-[11px] text-ink-400">
            {value === "private"
              ? "ほかの人には、ポーチの中身は見えません（プロフィールと口コミだけ見えます）。"
              : value === "link"
                ? "共有リンクを開いた人には、こう見えます。"
                : "ユーザーページを開いた人には、こう見えます。"}
          </div>

          <div className="flex items-center gap-3">
            <Avatar
              name={profile.displayName || profile.handle}
              hue={profile.avatarHue}
              avatarUrl={profile.avatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">
                {profile.displayName || profile.handle || "名前未設定"}
              </div>
              <div className="text-[11px] text-ink-400">@{profile.handle || "未設定"}</div>
            </div>
          </div>
          {profile.bio && <p className="text-[11px] text-ink-600">{profile.bio}</p>}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {profile.skinToneHex && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                <span
                  className="swatch inline-block h-3 w-3 rounded-full"
                  style={{ background: profile.skinToneHex }}
                />
                肌のトーン
              </span>
            )}
            {profile.skinType && (
              <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                {SKIN_TYPE_LABEL[profile.skinType]}
              </span>
            )}
            {profile.personalColor && (
              <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                {PERSONAL_COLOR_LABEL[profile.personalColor]}
              </span>
            )}
          </div>

          <div className="border-t border-ink-100 pt-2">
            <div className="text-[11px] font-bold">
              ポーチ（{value === "private" ? "見えません" : `${items.length}点`}）
            </div>
            {value === "private" ? (
              <p className="mt-1 text-[11px] text-ink-400">
                非公開のあいだ、登録した{items.length}点は自分だけが見られます。
              </p>
            ) : items.length === 0 ? (
              <p className="mt-1 text-[11px] text-ink-400">
                まだ登録がないので、「まだ登録がありません」と表示されます。
              </p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {items.map((product) => (
                  <li key={product.id} className="flex items-center gap-2">
                    <ProductThumb
                      category={product.category}
                      colors={[...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos)}
                      imageUrl={product.image_url}
                      size={28}
                      className="rounded-xl"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px]">
                      <span className="text-ink-400">{product.brands?.name}</span> {product.name}
                    </span>
                    <span className="text-[11px] tabular-nums text-ink-500">
                      ¥{product.price_yen.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
