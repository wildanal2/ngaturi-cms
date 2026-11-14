import { describe, expect, it } from "vitest";
import { loginDestination } from "./redirect";
describe("safe login callbacks", () => {
  it.each([
    "/invitations",
    "/builder/123?tab=music#preview",
    "/templates/lakon-kencana/use",
    "/admin",
  ])("keeps internal destination %s", (value) =>
    expect(loginDestination(value)).toBe(value),
  );
  it.each([
    undefined,
    ["/admin"],
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2f%2fevil.example",
    "/%252fevil.example",
    "/login",
    "/login?next=/login",
    "/%6cogin/",
    "/foo/../login",
    "/api/auth/sign-out",
    "/%",
    "/foo\nLocation:evil",
  ])("rejects unsafe/looping callback %s", (value) =>
    expect(loginDestination(value)).toBe("/invitations"),
  );
});
