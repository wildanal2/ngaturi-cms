import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  headers: vi.fn(),
  rateLimit: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mocks.select, insert: mocks.insert },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
}));

import { POST as postGuestbook } from "./[id]/guestbook/route";
import { POST as postRsvp } from "./[id]/rsvp/route";

function selectedInvitation(row: object) {
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: async () => [row] }),
    }),
  });
}

function context() {
  return { params: Promise.resolve({ id: "invitation-1" }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-forwarded-for": "127.0.0.1" }),
  );
  mocks.rateLimit.mockResolvedValue(true);
  mocks.verifyTurnstile.mockResolvedValue(true);
});

describe("public submission expiry enforcement", () => {
  it("rejects guestbook submission for an expired published invitation", async () => {
    selectedInvitation({
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      globalSettings: {},
      sections: [],
    });

    const response = await postGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Tamu", message: "Selamat" }),
      }),
      context(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Undangan tidak aktif.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects RSVP submission for an expired published invitation", async () => {
    selectedInvitation({
      id: "invitation-1",
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const response = await postRsvp(
      new Request("http://localhost/api/public/invitation-1/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Tamu",
          status: "attending",
          guest_count: 1,
        }),
      }),
      context(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Undangan tidak aktif.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
