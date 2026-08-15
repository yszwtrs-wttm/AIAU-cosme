import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import {
  PERSONAL_COLOR_LABEL,
  SKIN_TYPE_LABEL,
  type Product,
  type Profile,
  type Review,
} from "@/lib/types";

type PublicReview = Review & { products: { id: number; name: string; brands: { name: string } | null } | null };
type StashRow = { products: Product | null };

export default async function UserPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle<Profile>();

  if (!profile) notFound();

  const [{ data: reviews }, stashRes] = await Promise.all([
    supabase
      .from("reviews")
      .select("*,review_images(id,review_id,path,pos),products(id,name,brands(name))")
      .eq("user_id", profile.user_id)
      .eq("excluded", false)
      .order("posted_at", { ascending: false })
      .returns<PublicReview[]>(),
    profile.stash_public
      ? supabase
          .from("user_items")
          .select(
            "products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
          )
          .eq("user_id", profile.user_id)
          .returns<StashRow[]>()
      : Promise.resolve({ data: [] as StashRow[] }),
  ]);

  const stash = (stashRes.data ?? []).map((r) => r.products).filter((p): p is Product => Boolean(p));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-200 bg-white p-6">
        <Avatar
          name={profile.display_name}
          hue={profile.avatar_hue}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">{profile.display_name}</h1>
          <div className="text-xs text-ink-400">@{profile.handle}</div>
          {profile.bio && <p className="mt-1 text-sm text-ink-600">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {profile.skin_tone_hex && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                <span
                  className="swatch inline-block h-3.5 w-3.5 rounded-full"
                  style={{ background: profile.skin_tone_hex }}
                />
                肌のトーン
              </span>
            )}
            {profile.skin_type && (
              <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                {SKIN_TYPE_LABEL[profile.skin_type]}
              </span>
            )}
            {profile.personal_color && (
              <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                {PERSONAL_COLOR_LABEL[profile.personal_color]}
              </span>
            )}
          </div>
        </div>
      </section>

      {profile.stash_public && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">公開しているポーチ（{stash.length}点）</h2>
          {stash.length === 0 ? (
            <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
              まだ登録がありません。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stash.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">投稿した口コミ</h2>
        {(reviews ?? []).length === 0 ? (
          <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            まだ投稿がありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {(reviews ?? []).map((r) => (
              <li key={r.id} className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="text-xs text-ink-400">{r.products?.brands?.name}</div>
                <Link href={`/products/${r.product_id}`} className="text-sm font-bold hover:text-brand-600">
                  {r.products?.name}
                </Link>
                <div className="text-amber-500">{"★".repeat(r.rating)}</div>
                <p className="mt-1 text-sm leading-relaxed">{r.body}</p>
                {(r.review_images ?? []).length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {(r.review_images ?? []).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.id}
                        src={publicImageUrl(img.path)}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
