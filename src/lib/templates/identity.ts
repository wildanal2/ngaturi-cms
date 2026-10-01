/** Temporary compatibility for persisted template IDs and section variants. */
export const LEGACY_SEKAR_JAWA_ID = "enchanted-garden";
export const SEKAR_JAWA_ID = "sekar-jawa-3d";

export function canonicalTemplateId<T extends string | null | undefined>(id: T): T | string {
  return id === LEGACY_SEKAR_JAWA_ID ? SEKAR_JAWA_ID : id;
}

export function templateIdentityAliases(id: string): string[] {
  return canonicalTemplateId(id) === SEKAR_JAWA_ID
    ? [SEKAR_JAWA_ID, LEGACY_SEKAR_JAWA_ID]
    : [id];
}
