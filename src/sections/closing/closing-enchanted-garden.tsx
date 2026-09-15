import type { SectionRenderProps } from "../types";

/** Restrained sign-off placed before the procedural Pelaminan. */
export function ClosingEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as { message?: string; names?: string };
  return (
    <section className="px-8 py-12 text-center">
      <p className="text-xs tracking-[0.32em] text-[var(--inv-secondary)] uppercase">
        Matur Nuwun
      </p>
      <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-[var(--inv-ink)]">
        {p.message ?? "Terima kasih atas doa dan restu yang diberikan."}
      </p>
      <p className="mt-7 font-[family-name:var(--inv-font)] text-4xl text-[var(--inv-primary)]">
        {p.names ?? "Nama Mempelai"}
      </p>
    </section>
  );
}
