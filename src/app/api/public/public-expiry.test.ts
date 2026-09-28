import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  headers: vi.fn(),
  rateLimit: vi.fn(),
  verifyTurnstile: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mocks.select, insert: mocks.insert },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
}));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));

import {
  GET as getGuestbook,
  POST as postGuestbook,
} from "./[id]/guestbook/route";
import { POST as postRsvp } from "./[id]/rsvp/route";

function selectedInvitation(row: object) {
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: async () => [row] }),
    }),
  });
}

function selectedGuestbookRead(invitation: object, messages: object[]) {
  mocks.select
    .mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: async () => [invitation] }),
      }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => messages }),
        }),
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
  mocks.getSession.mockResolvedValue(null);
});

describe("public submission expiry enforcement", () => {
  it("returns approved guestbook reads while the invitation is active", async () => {
    const messages = [{ id: "message-1", name: "Tamu", message: "Selamat" }];
    selectedGuestbookRead(
      {
        status: "published",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        userId: "owner-1",
      },
      messages,
    );

    const response = await getGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook"),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ messages });
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("rejects guestbook reads for an expired published invitation", async () => {
    selectedInvitation({
      status: "published",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      userId: "owner-1",
    });

    const response = await getGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook"),
      context(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Undangan tidak aktif.",
    });
  });

  it("keeps guestbook reads available to the owner preview", async () => {
    const messages = [{ id: "message-1", name: "Tamu", message: "Selamat" }];
    selectedGuestbookRead(
      {
        status: "published",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        userId: "owner-1",
      },
      messages,
    );
    mocks.getSession.mockResolvedValue({ user: { id: "owner-1" } });

    const response = await getGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook"),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ messages });
  });

  it("accepts guestbook submissions before public expires_at", async () => {
    selectedInvitation({
      status: "published",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      globalSettings: {},
      sections: [{ type: "guestbook", props: { require_approval: false } }],
    });
    const row = {
      id: "message-1",
      name: "Tamu",
      message: "Selamat",
      createdAt: new Date("2026-09-23T00:00:00.000Z"),
    };
    mocks.insert.mockReturnValue({
      values: () => ({ returning: async () => [row] }),
    });

    const response = await postGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Tamu", message: "Selamat" }),
      }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      pending: false,
    });
  });

  it("accepts RSVP submissions before public expires_at", async () => {
    selectedInvitation({
      id: "invitation-1",
      status: "published",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    mocks.insert.mockReturnValue({
      values: vi.fn(async () => undefined),
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

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("uses Cloudflare's client IP for guestbook rate limiting", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
      }),
    );
    mocks.rateLimit.mockResolvedValue(false);

    const response = await postGuestbook(
      new Request("http://localhost/api/public/invitation-1/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      context(),
    );

    expect(response.status).toBe(429);
    expect(mocks.rateLimit).toHaveBeenCalledWith("gb:203.0.113.10", 5, 60);
  });

  it("does not bypass RSVP rate limiting when Redis fails", async () => {
    mocks.rateLimit.mockRejectedValue(new Error("redis unavailable"));

    await expect(
      postRsvp(
        new Request("http://localhost/api/public/invitation-1/rsvp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
        context(),
      ),
    ).rejects.toThrow("redis unavailable");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

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
