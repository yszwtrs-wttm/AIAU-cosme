import ColorLab from "@/components/ColorLab";

export default function ColorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">画像の色から探す</h1>
        <p className="text-sm text-neutral-600">
          画像の主要色を抽出して CIELAB に変換し、ΔE(CIEDE2000) が小さい順に商品を並べます。
          「この色でメイクしたい」を、手持ちや安い商品に翻訳するための入口です。
        </p>
      </div>
      <ColorLab />
    </div>
  );
}
