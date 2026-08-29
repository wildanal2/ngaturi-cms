export function ViewsChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex h-32 items-end gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-forest/80"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }}
              title={`${d.count} kunjungan`}
            />
            <span className="text-[9px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
