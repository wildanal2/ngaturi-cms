import Image from "next/image";
import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import type { BankAccount } from "./gift-cards";

/** Single compact list of accounts. */
export function GiftMinimal({ props }: SectionRenderProps) {
  const p = props as { intro?: string; bank_accounts?: BankAccount[] };
  return (
    <SectionShell>
      <SectionTitle>Amplop Digital</SectionTitle>
      {p.intro ? (
        <p className="mb-4 text-center text-sm text-[var(--inv-ink)]">{p.intro}</p>
      ) : null}
      <div className="divide-y divide-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)] rounded-xl border border-[color-mix(in_srgb,var(--inv-primary)_15%,transparent)]">
        {(p.bank_accounts ?? []).map((b, i) => (
          <div key={i} className="flex items-center gap-3 p-4 text-sm">
            {b.logo_url ? (
              <Image
                src={b.logo_url}
                alt={b.bank_name}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-md object-contain"
                unoptimized
              />
            ) : null}
            <span className="flex-1 text-[var(--inv-ink)]">
              <b className="text-[var(--inv-primary)]">{b.bank_name}</b>
              <br />
              <span className="opacity-80">a.n. {b.account_name}</span>
            </span>
            <span className="font-mono text-[var(--inv-ink)]">{b.account_number}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
