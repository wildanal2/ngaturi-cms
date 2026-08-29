import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import { getTemplate } from "@/lib/templates/catalog";
import { createInvitation } from "@/lib/invitation/actions";

/**
 * "Pakai template" entry point. Requires login; then creates the
 * invitation (or reuses an existing free trial) and lands in the builder.
 */
export default async function UseTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getTemplate(id)) redirect("/templates");

  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/templates/${id}/use`)}`);

  // createInvitation redirects to /builder/<id> (or existing trial)
  await createInvitation(id);
  return null;
}
