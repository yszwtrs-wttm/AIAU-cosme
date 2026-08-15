import { ProductGridSkeleton, SkeletonBox } from "@/components/Skeleton";

/** 検索結果の骨組み。見出し・検索欄・絞り込みの形は先に見せる。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <div className="space-y-4 border-b border-ink-200 pb-5">
        <SkeletonBox className="h-7 w-40" />
        <SkeletonBox className="h-4 w-2/3" />
        <SkeletonBox className="h-11 w-full rounded-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <SkeletonBox key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <ProductGridSkeleton count={6} />
    </div>
  );
}
