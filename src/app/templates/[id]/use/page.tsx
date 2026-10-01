import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import { getTemplate } from "@/lib/templates/catalog";
import { createInvitation } from "@/lib/invitation/actions";

/**
 * "Pakai template" entry point. Requires login, then creates a new invitation.
 * The first lifetime creation starts the trial; later quota-backed creations
 * are locked and routed to upgrade.
 */
export default async function UseTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getTemplate(id)) redirect("/templates");

  const session = await getSession();
  if (!session)
    redirect(`/login?next=${encodeURIComponent(`/templates/${id}/use`)}`);

  // createInvitation redirects to the builder for a new trial or to upgrade
  // for a locked quota-backed draft.
  await createInvitation(id);
  return null;
}
