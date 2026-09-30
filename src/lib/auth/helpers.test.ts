import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./config", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { getSession, requireAdmin, requireUser } from "./helpers";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(new Headers({ cookie: "session=test" }));
  mocks.getDb.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockResolvedValue([{ status: "active" }]);
  mocks.redirect.mockImplementation((destination: string) => {
    throw new Error(`redirect:${destination}`);
  });
});

describe("auth server helpers", () => {
  it("reads the session with request headers", async () => {
    const session = { user: { id: "user-1", role: "user" } };
    mocks.getSession.mockResolvedValue(session);

    await expect(getSession()).resolves.toBe(session);
    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it("removes spoofed proxy IPs from internal session checks", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        cookie: "session=test",
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
        "x-ngaturi-trusted-client-ip": "192.0.2.99",
      }),
    );
    mocks.getSession.mockResolvedValue(null);
    await getSession();
    const passed = mocks.getSession.mock.calls[0][0].headers as Headers;
    expect(passed.get("cf-connecting-ip")).toBeNull();
    expect(passed.get("x-forwarded-for")).toBeNull();
    expect(passed.get("x-ngaturi-trusted-client-ip")).toBeNull();
    expect(passed.get("cookie")).toBe("session=test");
  });

  it("redirects a missing session instead of granting protected access", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("redirect:/login");
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it.each(["suspended", "deleted"])(
    "rejects a valid cached session when the account is %s",
    async (status) => {
      mocks.getSession.mockResolvedValue({
        user: { id: "user-1", role: "user" },
      });
      mocks.limit.mockResolvedValue([{ status }]);

      await expect(requireUser()).rejects.toThrow("redirect:/login");
    },
  );

  it("rejects a valid cached session when the account row no longer exists", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "deleted-user", role: "user" },
    });
    mocks.limit.mockResolvedValue([]);

    await expect(getSession()).resolves.toBeNull();
  });

  it("allows admins and rejects non-admin sessions", async () => {
    const admin = { user: { id: "admin-1", role: "admin" } };
    mocks.getSession.mockResolvedValueOnce(admin);
    await expect(requireAdmin()).resolves.toBe(admin);

    mocks.getSession.mockResolvedValueOnce({
      user: { id: "user-1", role: "user" },
    });
    await expect(requireAdmin()).rejects.toThrow("redirect:/invitations");
  });
});
