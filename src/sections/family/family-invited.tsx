import type { SectionRenderProps } from "../types";
import { DecoratedSectionShell, SectionHeader, pickDecor } from "../shared";

type Group = { title?: string; names?: string[] | string };

const toNames = (v: string[] | string | undefined): string[] =>
  Array.isArray(v)
    ? v
    : (v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

/** "Turut Mengundang" — one card per family with a list of names. */
export function FamilyInvited({ props }: SectionRenderProps) {
  const p = props as Record<string, unknown> & {
    eyebrow?: string;
    title?: string;
    intro?: string;
    groups?: Group[];
  };
  const groups = p.groups ?? [];
  const d = pickDecor(p);

  return (
    <DecoratedSectionShell d={d}>
      <SectionHeader
        eyebrow={p.eyebrow ?? "With Blessing"}
        title={p.title ?? "Turut Mengundang"}
      />
      {p.intro ? (
        <p className="mb-6 text-center text-sm text-[var(--inv-ink)]">{p.intro}</p>
      ) : null}
      <div className="space-y-5 inv-stagger">
        {groups.map((g, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)] bg-[var(--inv-bg)] p-5 text-center"
          >
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--inv-primary)]">
              {g.title ?? "Keluarga"}
            </h3>
            <ul className="mt-3 space-y-1.5">
              {toNames(g.names).map((n, j) => (
                <li
                  key={j}
                  className="font-[family-name:var(--inv-font)] text-[15px] text-[var(--inv-ink)]"
                >
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DecoratedSectionShell>
  );
}
