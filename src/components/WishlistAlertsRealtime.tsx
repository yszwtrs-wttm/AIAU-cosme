"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 値下がりは自分の操作では起きないので、開いたままの画面にも届くように購読する。
 * 通知の中身は取り出さず、届いたらサーバー側を読み直す。
 */
export default function WishlistAlertsRealtime({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("wishlist-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wishlist_alerts",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
