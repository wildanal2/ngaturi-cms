/** Existing public form transport; payloads and server policy remain authoritative. */
export async function postInvitationForm(
  invitationId: string,
  capability: "rsvp" | "guestbook",
  fields: FormData,
) {
  // Forward only the existing personal-link capability; never trust a guest ID.
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("to")
      : null;
  if (token) fields.set("guest_token", token);
  const response = await fetch(`/api/public/${invitationId}/${capability}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(fields)),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Gagal mengirim. Coba lagi.",
    );
  return body;
}
