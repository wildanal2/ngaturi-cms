import { describe, expect, it } from "vitest";
import { publicationExpiry } from "./publication";

describe("publicationExpiry", () => {
  const now = new Date("2026-09-23T00:00:00.000Z");

  it("never shortens a later expiry granted by renewal", () => {
    const renewedUntil = new Date("2027-03-01T00:00:00.000Z");

    expect(
      publicationExpiry(
        new Date("2026-10-01T00:00:00.000Z"),
        renewedUntil,
        now,
      ),
    ).toEqual(renewedUntil);
  });

  it("uses event date plus 30 days when it is later", () => {
    expect(
      publicationExpiry(
        new Date("2026-12-01T00:00:00.000Z"),
        new Date("2026-11-01T00:00:00.000Z"),
        now,
      ),
    ).toEqual(new Date("2026-12-31T00:00:00.000Z"));
  });
});
