import { ProductGridSkeleton, SkeletonBox, SkeletonCard } from "@/components/Skeleton";

/** マイページの骨組み。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <SkeletonCard className="h-28" />
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-40" />
        <ProductGridSkeleton count={3} />
      </div>
    </div>
  );
}
