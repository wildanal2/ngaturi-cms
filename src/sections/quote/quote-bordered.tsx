import type { SectionRenderProps } from "../types";
import { SectionShell } from "../shared";
import styles from "./quote.module.css";

export function QuoteBordered({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  return (
    <SectionShell muted>
      <div className="text-center">
        <p className={styles.hairline + " mx-auto mb-5 max-w-[120px]"} />
        <p className="font-[family-name:var(--inv-font)] text-lg leading-relaxed text-[var(--inv-primary)]">
          {p.text}
        </p>
        {p.source ? (
          <p className="mt-3 text-sm text-[var(--inv-ink)]">— {p.source}</p>
        ) : null}
        <p className={styles.hairline + " mx-auto mt-5 max-w-[120px]"} />
      </div>
    </SectionShell>
  );
}
