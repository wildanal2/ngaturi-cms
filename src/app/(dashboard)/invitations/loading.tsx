export default function InvitationsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-cream-200" />
          <div className="h-4 w-64 rounded bg-cream-200" />
        </div>
        <div className="h-10 w-32 rounded-full bg-cream-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-cream-200" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-cream-200" />
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-cream-200" />
        ))}
      </div>
    </div>
  );
}
