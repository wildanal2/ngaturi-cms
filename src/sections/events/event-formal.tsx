import { CalendarPlus, Navigation } from "lucide-react";
import type { SectionRenderProps } from "../types";
import { pickDecor, decorBgStyle, DecorOrnaments, DecorDivider } from "../shared";
import { formatTimeRange } from "../shared";

type EventItem = {
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue_name: string;
  address?: string;
  maps_url?: string;
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <>
      <p className="mt-3 text-[var(--inv-secondary)]">{MONTHS[d.getMonth()]}</p>
      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[var(--inv-ink)]">
        <span className="justify-self-end border-y-2 border-[color-mix(in_srgb,var(--inv-ink)_45%,transparent)] px-1 text-sm">
          {DAYS[d.getDay()]}
        </span>
        <span className="font-[family-name:var(--inv-font)] text-6xl text-[var(--inv-primary)]">
          {String(d.getDate()).padStart(2, "0")}
        </span>
        <span className="justify-self-start border-y-2 border-[color-mix(in_srgb,var(--inv-ink)_45%,transparent)] px-1 text-sm">
          {d.getFullYear()}
        </span>
      </div>
    </>
  );
}

/** Formal event card: intro paragraph + a large day/date/year block per event.
 *  Supports background texture and layered leaf ornaments. */
export function EventFormal({ props }: SectionRenderProps) {
  const p = props as {
    intro?: string;
    events?: EventItem[];
    background_image?: string;
    ornament_tr_images?: string[];
    ornament_bl_images?: string[];
    divider_image?: string;
  };
  const d = pickDecor(p);
  return (
    <section
      className="relative overflow-hidden px-6 py-14"
      style={decorBgStyle(d)}
    >
      <DecorOrnaments d={d} />
      <div className="relative mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <DecorDivider d={d} className="mx-auto h-4 w-20 object-contain text-[var(--inv-secondary)] opacity-70" />
        <p className="mt-3 text-[var(--inv-ink)]">Our Wedding Event</p>
        {p.intro ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--inv-ink)] opacity-90">
            {p.intro}
          </p>
        ) : null}

        {(p.events ?? []).map((e, i) => (
          <div key={i} className="mt-10 flex flex-col items-center inv-stagger">
            <DecorDivider d={d} className="h-4 w-16 object-contain text-[var(--inv-secondary)] opacity-60" />
            <h3 className="mt-3 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
              {e.name}
            </h3>
            <DateBlock iso={e.date} />
            <p className="mt-3 text-[var(--inv-ink)]">
              {formatTimeRange(e.start_time, e.end_time)}
            </p>
            <p className="text-[var(--inv-ink)]">{e.venue_name}</p>
            {e.address ? (
              <p className="text-sm text-[var(--inv-ink)] opacity-80">
                {e.address}
              </p>
            ) : null}
            {e.maps_url ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
                <a
                  href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    e.name,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--inv-primary)_35%,transparent)] px-3 py-1 text-[var(--inv-ink)]"
                >
                  <CalendarPlus size={13} /> Kalender
                </a>
                <a
                  href={e.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--inv-secondary)] px-4 py-1 font-medium text-white"
                >
                  <Navigation size={13} /> Lihat Lokasi
                </a>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
