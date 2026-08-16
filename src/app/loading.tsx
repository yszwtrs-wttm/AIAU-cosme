/** ページ遷移の待ち時間に、白画面ではなく骨組みを出す。 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="読み込み中">
      <div className="space-y-3 border-b border-ink-200 pb-6">
        <div className="h-4 w-28 rounded bg-ink-100" />
        <div className="h-8 w-3/4 rounded bg-ink-100" />
        <div className="h-4 w-1/2 rounded bg-ink-100" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-ink-200 bg-ink-0" />
        ))}
      </div>
    </div>
  );
}
