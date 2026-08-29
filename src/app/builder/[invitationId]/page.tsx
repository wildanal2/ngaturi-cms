import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";
import { isEditLocked } from "@/lib/invitation/entitlement";
import { BuilderShell } from "@/components/builder/builder-shell";
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

  return (
    <BuilderShell
      invitationId={inv.id}
      slug={inv.slug}
      status={inv.status}
      locked={isEditLocked(inv) || inv.isEditLocked}
      editExpiresAt={inv.editExpiresAt?.toISOString() ?? null}
      hasWatermark={inv.hasWatermark}
      initialSections={inv.sections as SectionData[]}
      initialGlobal={inv.globalSettings as GlobalSettings}
    />
  );
}
