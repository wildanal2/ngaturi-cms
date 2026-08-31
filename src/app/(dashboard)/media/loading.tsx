export default function MediaLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-28 rounded bg-cream-200" />
        <div className="h-4 w-64 rounded bg-cream-200" />
      </div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="space-y-3">
          <div className="h-5 w-40 rounded bg-cream-200" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-cream-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
