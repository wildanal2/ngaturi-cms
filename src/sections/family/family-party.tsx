import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionHeader } from "../shared";
import { CornerFloral } from "../ornaments";

type Member = { name?: string; role?: string; photo?: string };

/** Bridesmaid / Groomsman — circular avatar grid. */
export function FamilyParty({ props }: SectionRenderProps) {
  const p = props as { eyebrow?: string; title?: string; members?: Member[] };
  const members = p.members ?? [];
  const cols = members.length <= 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <SectionShell muted>
      <div className="relative">
        <CornerFloral className="inv-ornament inv-ornament--drift pointer-events-none absolute -left-3 -top-3 h-16 w-16 text-[var(--inv-secondary)] opacity-70" />
        <SectionHeader
          eyebrow={p.eyebrow ?? "The Party"}
          title={p.title ?? "Bridesmaid & Groomsman"}
        />
        <div className={`mt-2 grid gap-5 ${cols} inv-stagger`}>
          {members.map((m, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-sm">
                {m.photo ? (
                  <Image src={m.photo} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="block h-full w-full bg-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)]" />
                )}
              </div>
              <p className="mt-2 font-[family-name:var(--inv-font)] text-sm text-[var(--inv-primary)]">
                {m.name ?? "Nama"}
              </p>
              {m.role ? (
                <p className="text-[10px] uppercase tracking-widest text-[var(--inv-secondary)]">
                  {m.role}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
