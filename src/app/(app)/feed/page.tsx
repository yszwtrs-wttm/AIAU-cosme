import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import type { Profile, Review } from "@/lib/types";

type FeedReview = Review & {
  profiles: Pick<Profile, "handle" | "display_name" | "avatar_hue"> | null;
  products: { id: number; name: string; brands: { name: string } | null } | null;
};

/** 写真つきの口コミを新しい順に並べる、みんなの投稿。 */
export default async function FeedPage() {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "*,profiles(handle,display_name,avatar_hue),review_images(id,review_id,path,pos),products(id,name,brands(name))",
    )
    .eq("excluded", false)
    .order("posted_at", { ascending: false })
    .limit(40)
    .returns<FeedReview[]>();

  const withPhotos = (reviews ?? []).filter((r) => (r.review_images ?? []).length > 0);
  const rest = (reviews ?? []).filter((r) => (r.review_images ?? []).length === 0);

  return (
    <div className="space-y-6">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">みんなの投稿</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          ログインしている人が書いた口コミです。写真とあわせて、使った感想が見られます。
        </p>
      </section>

      {withPhotos.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {withPhotos.map((r) => {
            const images = [...(r.review_images ?? [])].sort((a, b) => a.pos - b.pos);
            return (
              <article key={r.id} className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div className="flex gap-1 overflow-x-auto">
                  {images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={publicImageUrl(img.path)}
                      alt=""
                      className="h-48 w-full shrink-0 object-cover"
                    />
                  ))}
                </div>
                <div className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: `hsl(${r.profiles?.avatar_hue ?? 330} 70% 62%)` }}
                    >
                      {(r.profiles?.display_name ?? "?").slice(0, 1)}
                    </span>
                    {r.profiles?.handle ? (
                      <Link href={`/u/${r.profiles.handle}`} className="font-bold hover:text-brand-600">
                        {r.profiles.display_name}
                      </Link>
                    ) : (
                      <span className="font-bold">{r.author_name}</span>
                    )}
                    <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                  </div>
                  <Link href={`/products/${r.product_id}`} className="block text-sm font-bold hover:text-brand-600">
                    {r.products?.brands?.name} {r.products?.name}
                  </Link>
                  <p className="text-sm leading-relaxed">{r.body}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">写真なしの投稿</h2>
        <ul className="space-y-2">
          {rest.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-ink-400">
                <span>{r.profiles?.display_name ?? r.author_name}</span>
                <span className="text-amber-500">{"★".repeat(r.rating)}</span>
              </div>
              <Link href={`/products/${r.product_id}`} className="text-sm font-bold hover:text-brand-600">
                {r.products?.brands?.name} {r.products?.name}
              </Link>
              <p className="mt-1 text-sm leading-relaxed">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
