import { SkeletonBox, SkeletonCard } from "@/components/Skeleton";

/** 画像つき口コミの一覧の骨組み。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <div className="border-b border-ink-200 pb-4">
        <SkeletonBox className="h-7 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
