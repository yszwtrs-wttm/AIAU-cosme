import BarcodeScanner from "@/components/BarcodeScanner";
import { createClient } from "@/lib/supabase/server";

export default async function ScanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("jan, name, brands(name)")
    .not("jan", "is", null)
    .limit(3)
    .returns<{ jan: string; name: string; brands: { name: string } | null }[]>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">バーコードで手持ちを登録</h1>
        <p className="text-sm text-neutral-600">
          カメラが使えない環境では JAN を手入力してください。マスタに無い JAN は候補選択にフォールバックします。
        </p>
      </div>

      <BarcodeScanner />

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="font-medium">デモ用の JAN</div>
        <ul className="mt-1 space-y-0.5 text-neutral-600">
          {(data ?? []).map((p) => (
            <li key={p.jan}>
              <code className="rounded bg-neutral-100 px-1">{p.jan}</code> {p.brands?.name} {p.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
