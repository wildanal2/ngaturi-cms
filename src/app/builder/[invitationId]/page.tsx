import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { isEditLocked } from "@/lib/invitation/entitlement";
import { getCompositionPolicy } from "@/lib/templates/composition-policy";
import { getTemplate, TEMPLATES } from "@/lib/templates/catalog";
import { BuilderShell } from "@/components/builder/builder-shell";
import { TemplatePicker } from "@/components/builder/template-picker";
import type { GlobalSettings, SectionData } from "@/sections/types";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const session = await requireUser();

  const [inv] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!inv) notFound();

  const locked = isEditLocked(inv) || inv.isEditLocked;
  const sourceTemplate = inv.sourceTemplate
    ? getTemplate(inv.sourceTemplate)
    : undefined;

  if (!sourceTemplate) {
    const templateOptions = TEMPLATES.map(
      ({ id, name, description, category, tier, thumbnail }) => ({
        id,
        name,
        description,
        category,
        tier,
        thumbnail,
      }),
    );
    return (
      <TemplatePicker
        invitationId={inv.id}
        templates={templateOptions}
        locked={locked}
      />
    );
  }

  const sections = inv.sections as SectionData[];
  const compositionPolicy = getCompositionPolicy({
    templateComposition: sourceTemplate.composition,
    sections,
  });

  return (
    <BuilderShell
      invitationId={inv.id}
      slug={inv.slug}
      status={inv.status}
      locked={locked}
      editExpiresAt={inv.editExpiresAt?.toISOString() ?? null}
      hasWatermark={inv.hasWatermark}
      initialSections={sections}
      initialGlobal={inv.globalSettings as GlobalSettings}
      compositionPolicy={compositionPolicy}
    />
  );
}
