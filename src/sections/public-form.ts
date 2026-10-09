/** Existing public form transport; payloads and server policy remain authoritative. */
export async function postInvitationForm(
  invitationId: string,
  capability: "rsvp" | "guestbook",
  fields: FormData,
) {
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
