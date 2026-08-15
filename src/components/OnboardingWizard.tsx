"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { addManyToStash } from "@/app/actions";
import {
  finishOnboarding,
  pickOnboardingDemo,
  saveOnboardingStep,
  type OnboardingDemo,
} from "@/app/onboarding-actions";
import ProductThumb from "@/components/ProductThumb";
import {
  CATEGORY_LABEL,
  SKIN_TONES,
  SKIN_TYPE_LABEL,
  type Category,
  type Product,
  type Profile,
  type SkinType,
} from "@/lib/types";
import { colorMatchBadge, formulaMatchBadge } from "@/lib/wording";

const STEP_TITLES = ["肌の状態", "肌の色", "よく使うコスメ"];
const RECOMMENDED_PICKS = 3;

/**
 * 初回ログインの3ステップ。すべてスキップできるが、進んだところはその場で保存するので、
 * 途中で離脱しても次にホームへ来たときに同じステップから続けられる。
 */
export default function OnboardingWizard({
  profile,
  products,
}: {
  profile: Profile;
  products: Product[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(profile.onboarding_step, 2) + 1);
  const [skinType, setSkinType] = useState<SkinType | "">(profile.skin_type ?? "");
  const [skinTone, setSkinTone] = useState(profile.skin_tone_hex ?? "");
  const [picked, setPicked] = useState<number[]>([]);
  const [demo, setDemo] = useState<OnboardingDemo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = products.reduce<Record<string, Product[]>>((acc, product) => {
    (acc[product.category] ??= []).push(product);
    return acc;
  }, {});

  const go = (next: number, save: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await save();
      if (!res.ok) {
        setError(res.error ?? "保存できませんでした");
        return;
      }
      if (next <= 3) {
        setStep(next);
        return;
      }
      setDemo(await pickOnboardingDemo());
      await finishOnboarding();
      setStep(4);
      router.refresh();
    });

  const leaveForNow = () =>
    startTransition(async () => {
      await finishOnboarding();
      router.push("/");
      router.refresh();
    });

  if (step === 4) {
    return (
      <DemoResult
        demo={demo}
        pickedCount={picked.length}
        onDone={() => {
          router.push("/");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {STEP_TITLES.map((title, index) => (
            <span
              key={title}
              className={`h-1.5 flex-1 rounded-full ${
                index < step ? "bg-brand-600" : "bg-ink-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-ink-400">
          ステップ {step} / 3 ・ {STEP_TITLES[step - 1]}
        </p>
      </div>

      {step === 1 && (
        <StepCard
          title="肌の状態は、どれに近いですか？"
          note="成分表から「自分の肌に合いそうか」を判定するのに使います。あとから変えられます。"
        >
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SKIN_TYPE_LABEL) as SkinType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSkinType(skinType === key ? "" : key)}
                className={`rounded-full border px-3.5 py-2 text-sm ${
                  skinType === key
                    ? "border-brand-400 bg-brand-50 font-bold text-brand-700"
                    : "border-brand-100 bg-white"
                }`}
              >
                {SKIN_TYPE_LABEL[key]}
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="肌の色は、どれに近いですか？"
          note="ファンデやリップの色番号を、肌の色に近い順で出せるようになります。"
        >
          <div className="flex flex-wrap gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.hex}
                type="button"
                onClick={() => setSkinTone(skinTone === tone.hex ? "" : tone.hex)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
                  skinTone === tone.hex
                    ? "border-brand-400 bg-brand-50 font-bold text-brand-700"
                    : "border-brand-100 bg-white"
                }`}
              >
                <span
                  className="swatch inline-block h-7 w-7 rounded-full"
                  style={{ background: tone.hex }}
                />
                {tone.label}
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          title={`よく使うコスメを${RECOMMENDED_PICKS}つ選んでください`}
          note="ポーチに入れば、気になった商品が手持ちと被っていないかを判定できます。"
        >
          <div className="space-y-3">
            {Object.entries(groups).map(([category, items]) => (
              <div key={category} className="space-y-1.5">
                <div className="text-xs font-bold text-brand-600">
                  {CATEGORY_LABEL[category as Category]}
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((product) => {
                    const on = picked.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          setPicked((prev) =>
                            prev.includes(product.id)
                              ? prev.filter((id) => id !== product.id)
                              : [...prev, product.id],
                          )
                        }
                        className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-xs ${
                          on ? "border-brand-400 bg-brand-50" : "border-brand-100 bg-white"
                        }`}
                      >
                        <ProductThumb
                          category={product.category}
                          colors={product.product_colors ?? []}
                          imageUrl={product.image_url}
                          size={28}
                          className="rounded-xl"
                        />
                        <span className="min-w-0">
                          <span className="block text-[10px] text-ink-400">
                            {product.brands?.name}
                          </span>
                          <span className="block max-w-36 truncate font-bold">{product.name}</span>
                        </span>
                        {on && <Check size={14} className="text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-ink-400">
              選んだのは{picked.length}点です。リストに無いものは、あとで Myポーチ
              のバーコード登録から追加できます。
            </p>
          </div>
        </StepCard>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (step === 1) {
              go(2, () => saveOnboardingStep({ step: 1, skinType: skinType || null }));
              return;
            }
            if (step === 2) {
              go(3, () => saveOnboardingStep({ step: 2, skinToneHex: skinTone || null }));
              return;
            }
            go(4, async () => {
              if (picked.length > 0) {
                const res = await addManyToStash(picked, "quick");
                if (!res.ok) return res;
              }
              return saveOnboardingStep({ step: 3 });
            });
          }}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "保存中…" : step === 3 ? "登録して結果を見る" : "次へ"}
          {!pending && <ArrowRight size={15} />}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (step === 1) {
              go(2, () => saveOnboardingStep({ step: 1 }));
              return;
            }
            if (step === 2) {
              go(3, () => saveOnboardingStep({ step: 2 }));
              return;
            }
            go(4, () => saveOnboardingStep({ step: 3 }));
          }}
          className="text-sm font-bold text-ink-500 underline disabled:opacity-50"
        >
          このステップをスキップ
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={leaveForNow}
          className="ml-auto text-xs text-ink-400 underline disabled:opacity-50"
        >
          あとでやる
        </button>
      </div>
    </div>
  );
}

function StepCard({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-ink-200 bg-white p-5">
      <div>
        <h2 className="font-display text-xl font-bold leading-snug">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** 登録した内容で「いま判定できること」を1件だけ見せる。 */
function DemoResult({
  demo,
  pickedCount,
  onDone,
}: {
  demo: OnboardingDemo | null;
  pickedCount: number;
  onDone: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-brand-600">
          <Sparkles size={16} /> 準備できました
        </p>
        <h1 className="font-display text-2xl font-bold leading-snug">
          {demo && demo.kind === "dupe"
            ? "早速、被りを1件見つけました"
            : demo && demo.kind === "fit"
              ? "早速、合いそうなものを1件見つけました"
              : "いつでも判定できます"}
        </h1>
        {pickedCount > 0 && (
          <p className="text-xs text-ink-500">ポーチに{pickedCount}点を登録しました。</p>
        )}
      </section>

      {demo && demo.kind !== "none" ? (
        <Link
          href={`/products/${demo.productId}`}
          className="block rounded-2xl border border-ink-200 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <ProductThumb
              category={demo.category}
              colors={demo.colorHex ? [{ pos: 0, shade_name: "", hex: demo.colorHex }] : []}
              imageUrl={demo.imageUrl}
              size={56}
              className="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="text-[11px] text-ink-400">{demo.brand}</p>
              <p className="truncate font-bold">{demo.label}</p>
              <p className="text-xs text-ink-500 tabular-nums">¥{demo.priceYen.toLocaleString()}</p>
            </div>
          </div>

          {demo.kind === "dupe" ? (
            <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
              <p className="text-sm font-bold">
                登録した「{demo.ownedLabel}」と{formulaMatchBadge(demo.ingSim)}です
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-700">
                  {formulaMatchBadge(demo.ingSim)}
                </span>
                {demo.deltaE !== null && (
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-700">
                    {colorMatchBadge(demo.deltaE)}
                  </span>
                )}
                {demo.savings > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 tabular-nums">
                    ¥{Math.round(demo.savings).toLocaleString()} 安い
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-600">
                詳しい判定を見る <ArrowRight className="inline" size={13} />
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
              <p className="text-sm font-bold">{demo.headline}</p>
              {demo.reason && <p className="text-xs text-ink-600">{demo.reason}</p>}
              <p className="text-xs text-brand-600">
                詳しい判定を見る <ArrowRight className="inline" size={13} />
              </p>
            </div>
          )}
        </Link>
      ) : (
        <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          <p>
            肌情報も手持ちもまだ登録されていないので、判定に使う材料がありません。
            Myポーチに2〜3点登録すると、気になった商品との被りが出せます。
          </p>
          <Link href="/stash" className="inline-block text-sm font-bold text-brand-600">
            Myポーチを開く <ArrowRight className="inline" size={13} />
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white"
      >
        ホームへ進む
      </button>
    </div>
  );
}
