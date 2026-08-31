import type { SectionRenderProps } from "../types";
import { SectionShell } from "../shared";

export function QuoteCentered({ props }: SectionRenderProps) {
  const p = props as { text?: string; source?: string };
  return (
    <SectionShell>
      <blockquote className="text-center">
        <p className="font-[family-name:var(--inv-font)] text-xl leading-relaxed text-[var(--inv-primary)]">
          &ldquo;{p.text}&rdquo;
        </p>
        {p.source ? (
          <footer className="mt-4 text-sm text-[var(--inv-ink)]">— {p.source}</footer>
        ) : null}
      </blockquote>
    </SectionShell>
  );
}
