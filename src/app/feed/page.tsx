import FeedList from "@/components/FeedList";
import { fetchFeedPage } from "./feed-data";

/** 口コミを新しい順に並べる、みんなの投稿。20件ずつカーソルで追加読み込みする。 */
export default async function FeedPage() {
  const { reviews, nextCursor } = await fetchFeedPage();

  return (
    <div className="space-y-6">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">みんなの投稿</h1>
      </section>

      <FeedList initialReviews={reviews} initialCursor={nextCursor} />
    </div>
  );
}
