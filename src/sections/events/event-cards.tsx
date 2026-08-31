import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle, formatEventDate, formatTimeRange } from "../shared";

type EventItem = {
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue_name: string;
  address?: string;
  maps_url?: string;
};

/** Two event cards side by side. */
export function EventCards({ props }: SectionRenderProps) {
  const p = props as { events?: EventItem[] };
  return (
    <SectionShell muted>
      <SectionTitle>Acara</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 inv-stagger">
        {(p.events ?? []).map((e, i) => (
          <div key={i} className="rounded-2xl bg-[var(--inv-bg)] p-5 text-center shadow-sm">
            <h3 className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
              {e.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--inv-ink)]">{formatEventDate(e.date)}</p>
            <p className="text-sm text-[var(--inv-ink)]">
              {formatTimeRange(e.start_time, e.end_time)}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--inv-ink)]">{e.venue_name}</p>
            {e.maps_url ? (
              <a
                href={e.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-[var(--inv-primary)] underline"
              >
                Google Maps
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
