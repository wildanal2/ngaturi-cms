const PUBLICATION_DAYS = 30;

export function publicationExpiry(
  eventDate: Date | null,
  existingExpiresAt: Date | null,
  now: Date,
): Date {
  const base = eventDate ?? now;
  const eventExpiry = new Date(base.getTime() + PUBLICATION_DAYS * 86_400_000);

  if (
    existingExpiresAt &&
    existingExpiresAt > now &&
    existingExpiresAt > eventExpiry
  ) {
    return existingExpiresAt;
  }
  return eventExpiry;
}
