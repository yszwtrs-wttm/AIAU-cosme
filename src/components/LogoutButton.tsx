"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-bold text-ink-600"
    >
      <LogOut size={15} />
      ログアウト
    </button>
  );
}
