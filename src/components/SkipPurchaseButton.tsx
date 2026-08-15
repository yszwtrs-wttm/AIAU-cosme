"use client";

import { useState, useTransition } from "react";
import { PiggyBank } from "lucide-react";
import { skipPurchase } from "@/app/actions";

/** 「買わなかった」を記録して、マイページの節約額に積む。判断した瞬間に押させたい。 */
export default function SkipPurchaseButton({
  productId,
  priceYen,
}: {
  productId: number;
  priceYen: number;
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          const res = await skipPurchase(productId, priceYen);
          if (res.ok) setDone(true);
        })
      }
      className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-70"
    >
      <PiggyBank size={15} />
      {done ? `¥${priceYen.toLocaleString()} 節約しました` : "買わないことにする"}
    </button>
  );
}
