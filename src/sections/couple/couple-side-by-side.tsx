import type { SectionRenderProps } from "../types";
import { SectionShell, SectionTitle } from "../shared";
import { PersonCard, type Person } from "./person";

export function CoupleSideBySide({ props }: SectionRenderProps) {
  const p = props as { bride?: Person; groom?: Person; s_photo_shape?: string };
  return (
    <SectionShell muted>
      <SectionTitle>Mempelai</SectionTitle>
      <div className="inv-stagger grid gap-10 sm:grid-cols-2">
        <PersonCard person={p.bride ?? {}} shape={p.s_photo_shape} />
        <PersonCard person={p.groom ?? {}} shape={p.s_photo_shape} />
      </div>
    </SectionShell>
  );
}
