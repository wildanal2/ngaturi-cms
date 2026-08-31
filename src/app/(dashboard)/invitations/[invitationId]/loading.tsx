export default function InvitationDetailLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded bg-cream-200" />
        <div className="h-4 w-40 rounded bg-cream-200" />
        <div className="mt-3 flex gap-2">
          <div className="h-8 w-28 rounded-full bg-cream-200" />
          <div className="h-8 w-32 rounded-full bg-cream-200" />
        </div>
      </div>
      <div className="h-24 rounded-xl bg-cream-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-cream-200" />
        ))}
      </div>
      <div className="h-56 rounded-xl bg-cream-200" />
    </div>
  );
}
