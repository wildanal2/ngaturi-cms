/** Instant skeleton on navigation between dashboard pages. */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-cream-200" />
      <div className="h-4 w-72 rounded bg-cream-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-cream-200" />
        ))}
      </div>
    </div>
  );
}
