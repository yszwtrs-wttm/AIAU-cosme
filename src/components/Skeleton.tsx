/** スケルトンの共通部品。ページごとの loading.tsx と Suspense の fallback で使う。 */
export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-ink-100 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl border border-ink-200 bg-white ${className}`} />;
}

export function SkeletonHeading() {
  return <SkeletonBox className="h-6 w-40" />;
}

export function SkeletonSection({
  children,
  label = "読み込み中",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <section className="animate-pulse space-y-2" aria-label={label}>
      {children}
    </section>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} className="h-32" />
      ))}
    </div>
  );
}
