import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { PersonCard, type Person } from "./person";

export function CoupleStacked({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person; s_photo_shape?: string };
  return (
    <SectionShell>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger space-y-12">
        <PersonCard person={p.bride ?? {}} shape={p.s_photo_shape} />
        <p className="text-center font-[family-name:var(--inv-font)] text-3xl text-[var(--inv-secondary)]">
          &amp;
        </p>
        <PersonCard person={p.groom ?? {}} shape={p.s_photo_shape} />
      </div>
    </SectionShell>
  );
}
