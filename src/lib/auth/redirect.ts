/** Login callbacks accept internal paths only, excluding authentication loops. */
export function loginDestination(value: unknown): string {
  const fallback = "/invitations";
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20\x7f]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://internal.invalid");
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (
      url.origin !== "https://internal.invalid" ||
      /[\\\x00-\x20\x7f]/.test(path) ||
      /%|\/\//.test(path) ||
      /^\/(login|api\/auth)(\/|$)/.test(path)
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
