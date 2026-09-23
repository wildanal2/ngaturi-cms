import { describe, expect, it } from "vitest";
import { canViewInvitation, isInvitationPubliclyActive } from "./visibility";

describe("invitation runtime visibility", () => {
  const now = new Date("2026-09-23T00:00:00.000Z");

  it("rejects a published invitation after expiresAt", () => {
    expect(
      isInvitationPubliclyActive(
        {
          status: "published",
          expiresAt: new Date("2026-09-22T23:59:59.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("allows a published invitation before expiresAt", () => {
    expect(
      isInvitationPubliclyActive(
        {
          status: "published",
          expiresAt: new Date("2026-09-24T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("keeps owner preview available for expired and draft invitations", () => {
    expect(
      canViewInvitation(
        {
          status: "published",
          expiresAt: new Date("2026-09-01T00:00:00.000Z"),
          userId: "owner-1",
        },
        "owner-1",
        now,
      ),
    ).toBe(true);
    expect(
      canViewInvitation(
        { status: "draft", expiresAt: null, userId: "owner-1" },
        "owner-1",
        now,
      ),
    ).toBe(true);
  });
});
