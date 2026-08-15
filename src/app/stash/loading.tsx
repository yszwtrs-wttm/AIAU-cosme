import { ProductGridSkeleton, SkeletonBox, SkeletonCard } from "@/components/Skeleton";

/** Myポーチの骨組み。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <SkeletonBox className="h-7 w-56" />
      <SkeletonCard className="h-40" />
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-44" />
        <SkeletonCard className="h-28" />
      </div>
      <ProductGridSkeleton count={6} />
    </div>
  );
}
