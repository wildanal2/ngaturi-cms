import Image from "next/image";
import type { SectionRenderProps } from "../types";
import {
  DecoratedSectionShell,
  SectionTitle,
  pickDecor,
} from "../shared";

export type BankAccount = {
  bank_name: string;
  account_number: string;
  account_name: string;
  logo_url?: string;
};

/** One card per bank/e-wallet account. */
export function GiftCards({ props }: SectionRenderProps) {
  const p = props as Record<string, unknown> & {
    intro?: string;
    bank_accounts?: BankAccount[];
  };
  const d = pickDecor(p);
  return (
    <DecoratedSectionShell d={d} muted>
      {d.section_icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.section_icon} alt="" className="mx-auto mb-3 h-10 w-10" />
      ) : null}
      <SectionTitle>Amplop Digital</SectionTitle>
      {p.intro ? (
        <p className="mb-6 text-center text-[var(--inv-ink)]">{p.intro}</p>
      ) : null}
      <div className="inv-stagger space-y-4">
        {(p.bank_accounts ?? []).map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_20%,transparent)] bg-[var(--inv-bg)] p-5 text-center"
          >
            {b.logo_url ? (
              <Image
                src={b.logo_url}
                alt={b.bank_name}
                width={48}
                height={48}
                className="mx-auto mb-2 h-11 w-11 rounded-lg object-contain"
                unoptimized
              />
            ) : null}
            <p className="font-[family-name:var(--inv-font)] text-lg text-[var(--inv-primary)]">
              {b.bank_name}
            </p>
            <p className="mt-1 font-mono text-[var(--inv-ink)]">{b.account_number}</p>
            <p className="text-sm text-[var(--inv-ink)] opacity-80">
              a.n. {b.account_name}
            </p>
          </div>
        ))}
      </div>
    </DecoratedSectionShell>
  );
}
