import Image from "next/image";
import type { SectionRenderProps } from "../types";
import type { Person } from "./person";

function RoyalPortrait({ person }: { person?: Person }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto aspect-[4/5] w-28 overflow-hidden rounded-t-full border-2 border-[var(--inv-secondary)] sm:w-36">
        {person?.photo ? (
          <Image src={person.photo} alt={person.name ?? ""} fill className="object-cover" />
        ) : null}
      </div>
      <h3 className="mt-3 font-[family-name:var(--inv-font)] text-2xl text-[var(--inv-primary)]">
        {person?.full_name || person?.name || "Nama Mempelai"}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--inv-ink)]">
        {[person?.child_order, person?.parents].filter(Boolean).join(" ")}
      </p>
    </div>
  );
}

/** Paired royal portraits for the Pendopo journey stop. */
export function CoupleEnchantedGarden({ props }: SectionRenderProps) {
  const p = props as { title?: string; bride?: Person; groom?: Person };
  return (
    <section className="px-6 py-10">
      <p className="text-center text-xs tracking-[0.3em] text-[var(--inv-secondary)] uppercase">
        {p.title ?? "Mempelai"}
      </p>
      <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <RoyalPortrait person={p.bride} />
        <span className="font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]">
          &amp;
        </span>
        <RoyalPortrait person={p.groom} />
      </div>
    </section>
  );
}
