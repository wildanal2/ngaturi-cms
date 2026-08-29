"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestbookMessages, invitations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/helpers";

async function assertOwnsMessage(messageId: string) {
  const session = await requireUser();
  const [row] = await db
    .select({ invitationId: guestbookMessages.invitationId })
    .from(guestbookMessages)
    .innerJoin(invitations, eq(invitations.id, guestbookMessages.invitationId))
    .where(
      and(
        eq(guestbookMessages.id, messageId),
        eq(invitations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Tidak diizinkan");
  return row.invitationId;
}

export async function moderateMessage(
  messageId: string,
  action: "approve" | "reject",
): Promise<void> {
  const invitationId = await assertOwnsMessage(messageId);
  await db
    .update(guestbookMessages)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: new Date(),
    })
    .where(eq(guestbookMessages.id, messageId));
  revalidatePath(`/invitations/${invitationId}`);
}
