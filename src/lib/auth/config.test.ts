import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  nextCookies: vi.fn(() => ({ id: "next-cookies" })),
  incrementWithTtl: vi.fn(),
}));

vi.mock("better-auth", () => ({
  betterAuth: mocks.betterAuth,
}));
vi.mock("better-auth/next-js", () => ({
  nextCookies: mocks.nextCookies,
}));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAndDelete: vi.fn(),
    incrementWithTtl: mocks.incrementWithTtl,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.__pgClient = undefined;
  globalThis.__nodeDatabase = undefined;
  mocks.betterAuth.mockReturnValue({
    api: { getSession: vi.fn() },
    handler: vi.fn(),
    $Infer: {},
  });
});

describe("Better Auth runtime initialization", () => {
  it("builds its adapter without eagerly creating the Node database", async () => {
    vi.resetModules();

    await expect(import("./config")).resolves.toBeTruthy();

    expect(mocks.betterAuth).toHaveBeenCalledOnce();
    expect(globalThis.__pgClient).toBeUndefined();
    expect(globalThis.__nodeDatabase).toBeUndefined();
  });

  it("uses fixed-window Redis rate limiting and canonical proxy settings", async () => {
    vi.resetModules();
    mocks.incrementWithTtl.mockResolvedValue(2);

    await import("./config");

    const options = mocks.betterAuth.mock.calls[0]?.[0] as {
      baseURL: string;
      trustedOrigins: string[];
      secondaryStorage: {
        increment(key: string, ttl: number): Promise<number>;
      };
      rateLimit: { enabled: boolean; storage: string };
      advanced: {
        trustedProxyHeaders: boolean;
        ipAddress: { ipAddressHeaders: string[] };
        defaultCookieAttributes: { sameSite: string; path: string };
      };
    };

    await expect(
      options.secondaryStorage.increment("auth:rate-limit", 60),
    ).resolves.toBe(2);
    expect(mocks.incrementWithTtl).toHaveBeenCalledWith("auth:rate-limit", 60);
    expect(options.rateLimit).toEqual({
      enabled: false,
      storage: "secondary-storage",
    });
    expect(options.baseURL).toBe("http://localhost:3030");
    expect(options.trustedOrigins).toEqual(["http://localhost:3030"]);
    expect(options.advanced).toMatchObject({
      trustedProxyHeaders: false,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      defaultCookieAttributes: { sameSite: "lax", path: "/" },
    });
  });
});
