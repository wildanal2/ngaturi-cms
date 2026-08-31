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

/** Vertical ordered list of events. */
export function EventTimeline({ props }: SectionRenderProps) {
  const p = props as { events?: EventItem[] };
  return (
    <SectionShell>
      <SectionTitle>Rangkaian Acara</SectionTitle>
      <div className="space-y-6 inv-stagger">
        {(p.events ?? []).map((e, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] p-6 text-center"
          >
            <h3 className="font-[family-name:var(--inv-font)] text-xl text-[var(--inv-primary)]">
              {e.name}
            </h3>
            <p className="mt-2 text-[var(--inv-ink)]">{formatEventDate(e.date)}</p>
            <p className="text-[var(--inv-ink)]">
              {formatTimeRange(e.start_time, e.end_time)}
            </p>
            <p className="mt-3 font-medium text-[var(--inv-ink)]">{e.venue_name}</p>
            {e.address ? (
              <p className="text-sm text-[var(--inv-ink)] opacity-80">{e.address}</p>
            ) : null}
            {e.maps_url ? (
              <a
                href={e.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-full border border-[var(--inv-primary)] px-4 py-1.5 text-sm text-[var(--inv-primary)]"
              >
                Lihat lokasi
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
