export function isRenewalEligible(invitation: { isPaid: boolean }): boolean {
  return invitation.isPaid;
}
