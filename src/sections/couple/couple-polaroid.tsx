import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { PolaroidCard, type Person } from "./person";

export function CouplePolaroid({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person };
  return (
    <SectionShell muted>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger flex flex-wrap justify-center gap-6">
        <PolaroidCard person={p.bride ?? {}} tilt="L" />
        <PolaroidCard person={p.groom ?? {}} tilt="R" />
      </div>
    </SectionShell>
  );
}
