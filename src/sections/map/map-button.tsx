import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";

/** Button that opens Google Maps. */
export function MapButton({ props }: SectionRenderProps) {
  const p = props as { maps_url?: string; venue_name?: string; address?: string };
  return (
    <SectionShell muted>
      <div className="text-center">
        <SectionTitle>Lokasi</SectionTitle>
        <p className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
          {p.venue_name}
        </p>
        <p className="mt-1 text-sm text-[var(--inv-ink)]">{p.address}</p>
        {p.maps_url ? (
          <a
            href={p.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full bg-[var(--inv-primary)] px-6 py-2.5 text-sm font-medium text-white"
          >
            Buka di Google Maps
          </a>
        ) : null}
      </div>
    </SectionShell>
  );
}
