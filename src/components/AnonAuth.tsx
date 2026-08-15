"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 手持ちは RLS で user_id 単位に保護されている。
 * デモでログインを挟まずに済ませるため、初回訪問時に匿名サインインする。
 */
export default function AnonAuth() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session || cancelled) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (!error && !cancelled) router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
