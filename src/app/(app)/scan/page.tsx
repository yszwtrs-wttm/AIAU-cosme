import BarcodeScanner from "@/components/BarcodeScanner";
import QuickStartPicker from "@/components/QuickStartPicker";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default async function ScanPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();
  const { data: popular } = await supabase
    .from("products")
    .select(
      "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
    )
    .order("price_yen", { ascending: true })
    .limit(24)
    .returns<Product[]>();

  return (
    <div className="space-y-5">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">手持ちを登録する</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          全部やらなくて大丈夫。よく使う2〜3個から始めれば、その分だけ判定が正確になります。
        </p>
      </section>

      <QuickStartPicker products={popular ?? []} />

      <div>
        <h2 className="font-display text-lg font-bold">バーコードで登録</h2>
        <p className="text-sm text-ink-600">
          リストに無いものは、パッケージのバーコードをかざしてください。続けて読み取れます。
        </p>
      </div>

      <BarcodeScanner />
    </div>
  );
}
