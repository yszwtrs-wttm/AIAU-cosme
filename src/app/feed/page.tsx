import Image from "next/image";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import type { Profile, Review } from "@/lib/types";

type FeedReview = Review & {
  profiles: Pick<Profile, "handle" | "display_name" | "avatar_hue" | "avatar_url"> | null;
  products: { id: number; name: string; brands: { name: string } | null } | null;
};

/** 口コミを新しい順に並べる、みんなの投稿。 */
export default async function FeedPage() {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "*,profiles(handle,display_name,avatar_hue,avatar_url),review_images(id,review_id,path,pos),products(id,name,brands(name))",
    )
    .eq("excluded", false)
    .order("posted_at", { ascending: false })
    .limit(40)
    .returns<FeedReview[]>();

  return (
    <div className="space-y-6">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">みんなの投稿</h1>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(reviews ?? []).map((r, index) => {
          const images = [...(r.review_images ?? [])].sort((a, b) => a.pos - b.pos);
          return (
            <article key={r.id} className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {images.length > 0 && (
                <div className="flex gap-1 overflow-x-auto">
                  {images.map((img, imageIndex) => (
                    <div key={img.id} className="relative h-48 w-full shrink-0">
                      <Image
                        src={publicImageUrl(img.path)}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        // 先頭の投稿の1枚目がファーストビューの LCP になる。
                        priority={index === 0 && imageIndex === 0}
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5 p-4">
                <div className="flex items-center gap-2 text-xs">
                  <Avatar
                    name={r.profiles?.display_name ?? ""}
                    hue={r.profiles?.avatar_hue ?? 330}
                    avatarUrl={r.profiles?.avatar_url}
                    size="sm"
                  />
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
    </div>
  );
}
