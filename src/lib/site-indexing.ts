/** Server runtime flag. Unset preserves existing commercial indexing behavior. */
export function siteIndexingEnabled(): boolean {
  const value = process.env.SITE_INDEXING_ENABLED;
  return value === undefined || value === "true";
}
