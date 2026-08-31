import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";

/** Embedded Google Maps iframe. */
export function MapEmbed({ props }: SectionRenderProps) {
  const p = props as { embed_url?: string; venue_name?: string; address?: string };
  return (
    <SectionShell>
      <SectionTitle>Lokasi</SectionTitle>
      {p.venue_name ? (
        <p className="mb-1 text-center font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
          {p.venue_name}
        </p>
      ) : null}
      {p.address ? (
        <p className="mb-4 text-center text-sm text-[var(--inv-ink)]">{p.address}</p>
      ) : null}
      {p.embed_url ? (
        <iframe
          src={p.embed_url}
          title="Peta lokasi"
          loading="lazy"
          className="aspect-video w-full rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)]"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--inv-primary)_25%,transparent)] p-6 text-center text-sm text-[var(--inv-ink)]">
          Tempel URL embed Google Maps di panel editor.
        </p>
      )}
    </SectionShell>
  );
}
