import { PRICE_DISCLAIMER, priceSourceText, unitPriceText } from "@/lib/price";

/**
 * 参考価格の一区画。金額・容量あたり単価・出典と時点・参考価格の注記をまとめて出す。
 * 「安い方がある」を言う画面では、この根拠が価格と離れないようにする。
 */
export default function PriceBlock({
  priceYen,
  volume,
  volumeUnit,
  priceSource,
  priceCheckedAt,
}: {
  priceYen: number;
  volume: number | null;
  volumeUnit: string | null;
  priceSource?: string | null;
  priceCheckedAt?: string | null;
}) {
  const unitPrice = unitPriceText(priceYen, volume, volumeUnit);
  const source = priceSourceText(priceSource, priceCheckedAt);

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[10px] font-bold tracking-wider text-ink-400">参考価格</span>
        <span className="text-lg font-bold tabular-nums">¥{priceYen.toLocaleString()}</span>
        <span className="text-xs text-ink-400">
          {volume
            ? `${volume}${volumeUnit ?? ""}${unitPrice ? ` ・ ${unitPrice}` : ""}`
            : "容量未登録"}
        </span>
      </div>
      {source && <p className="mt-0.5 text-[11px] text-ink-400">{source}</p>}
      <p className="mt-0.5 text-[11px] text-ink-400">{PRICE_DISCLAIMER}</p>
    </div>
  );
}
