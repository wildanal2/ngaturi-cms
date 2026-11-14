import { and, eq } from "drizzle-orm";
import { db, type Database } from "@/lib/db";
import { guestInvites } from "@/lib/db/schema";

// The personal link is a bearer capability. Public IDs and names are not proof.
export async function authorizeGuest(
  invitationId: string,
  token: string | undefined,
  name: string,
  database: Pick<Database, "select"> = db,
  lock = false,
) {
  if (!token) return undefined;
  const query = database
    .select()
    .from(guestInvites)
    .where(
      and(
        eq(guestInvites.invitationId, invitationId),
        eq(guestInvites.slugToken, token),
      ),
    )
    .limit(1);
  const [guest] = await (lock ? query.for("update") : query);
  return guest && guest.guestName.trim() === name.trim() ? guest : undefined;
}
