import { createClient } from "@/lib/supabase/server";
import type { Profile, Review } from "@/lib/types";

export type FeedReview = Review & {
  profiles: Pick<Profile, "handle" | "display_name" | "avatar_hue" | "avatar_url"> | null;
  products: { id: number; name: string; brands: { name: string } | null } | null;
};

/** 並び順（posted_at 降順 → id 降順）の最後の1件。ここより後ろを次のページとして読む。 */
export type FeedCursor = { posted_at: string; id: number };

export const FEED_PAGE_SIZE = 20;

const SELECT =
  "*,profiles(handle,display_name,avatar_hue,avatar_url),review_images(id,review_id,path,pos),products(id,name,brands(name))";

/**
 * カーソル（posted_at, id）より後ろの口コミを FEED_PAGE_SIZE 件読む。
 * 1件多めに取って、続きがあるかを判定する。
 */
export async function fetchFeedPage(
  cursor: FeedCursor | null = null,
): Promise<{ reviews: FeedReview[]; nextCursor: FeedCursor | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select(SELECT)
    .eq("excluded", false)
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);

  if (cursor) {
    query = query.or(
      `posted_at.lt."${cursor.posted_at}",and(posted_at.eq."${cursor.posted_at}",id.lt.${cursor.id})`,
    );
  }

  const { data } = await query.returns<FeedReview[]>();
  const rows = data ?? [];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const reviews = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const last = reviews[reviews.length - 1];

  return {
    reviews,
    nextCursor: hasMore && last ? { posted_at: last.posted_at, id: last.id } : null,
  };
}
