import { SkeletonBox, SkeletonCard } from "@/components/Skeleton";

/** 商品詳細の骨組み。実データが来たら上（基本情報）から順に埋まる。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-ink-200 bg-white p-5">
        <SkeletonBox className="h-28 w-28 rounded-xl" />
        <div className="min-w-64 flex-1 space-y-3">
          <SkeletonBox className="h-3 w-32" />
          <SkeletonBox className="h-7 w-3/4" />
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="h-5 w-28" />
          <SkeletonBox className="h-9 w-40 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-40" />
        <SkeletonCard className="h-24" />
      </div>
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-48" />
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}
