"use server";

import { fetchFeedPage, type FeedCursor, type FeedReview } from "./feed-data";

/** フィードの続きを読む。無限スクロールと「もっと見る」から呼ぶ。 */
export async function loadMoreFeed(
  cursor: FeedCursor,
): Promise<{ reviews: FeedReview[]; nextCursor: FeedCursor | null }> {
  return fetchFeedPage(cursor);
}
