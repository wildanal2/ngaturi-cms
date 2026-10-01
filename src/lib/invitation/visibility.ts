type Expiry = Date | string | null;

export function isInvitationPubliclyActive(
  invitation: { status: string; expiresAt: Expiry },
  now = new Date(),
): boolean {
  if (invitation.status !== "published") return false;
  if (!invitation.expiresAt) return true;

  const expiresAt =
    invitation.expiresAt instanceof Date
      ? invitation.expiresAt
      : new Date(invitation.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}

export function canViewInvitation(
  invitation: { status: string; expiresAt: Expiry; userId: string },
  viewerUserId: string | null | undefined,
  now = new Date(),
): boolean {
  return (
    isInvitationPubliclyActive(invitation, now) ||
    viewerUserId === invitation.userId
  );
}
