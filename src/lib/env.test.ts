import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function readEnv() {
  return (await import("./env")).getValidatedEnv();
}

describe("runtime provider environment", () => {
  it("defaults to a five-connection pool and REST Redis", async () => {
    vi.stubEnv("DATABASE_POOL_SIZE", undefined);
    vi.stubEnv("REDIS_TRANSPORT", undefined);
    expect(await readEnv()).toMatchObject({
      DATABASE_POOL_SIZE: 5,
      REDIS_TRANSPORT: "rest",
    });
  });

  it("requires an explicit value before Node trusts Cloudflare ingress", async () => {
    vi.stubEnv("TRUST_CLOUDFLARE_INGRESS", undefined);
    expect((await readEnv()).TRUST_CLOUDFLARE_INGRESS).toBe(false);
    vi.resetModules();
    vi.stubEnv("TRUST_CLOUDFLARE_INGRESS", "true");
    expect((await readEnv()).TRUST_CLOUDFLARE_INGRESS).toBe(true);
    vi.resetModules();
    vi.stubEnv("TRUST_CLOUDFLARE_INGRESS", "maybe");
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
  });

  it("accepts an explicit pool bound", async () => {
    vi.stubEnv("DATABASE_POOL_SIZE", "3");
    expect((await readEnv()).DATABASE_POOL_SIZE).toBe(3);
  });

  it.each(["0", "-1", "1.5", "invalid"])(
    "rejects an invalid pool bound %s",
    async (value) => {
      vi.stubEnv("DATABASE_POOL_SIZE", value);
      await expect(readEnv()).rejects.toThrow("Invalid environment variables");
    },
  );

  it("rejects partial or missing REST credentials instead of falling back", async () => {
    vi.stubEnv("REDIS_REST_TOKEN", undefined);
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
    vi.resetModules();
    vi.stubEnv("REDIS_REST_URL", undefined);
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
  });

  it("allows only an explicit unmixed TCP fallback", async () => {
    vi.stubEnv("REDIS_TRANSPORT", "tcp");
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
    vi.resetModules();
    vi.stubEnv("REDIS_REST_URL", undefined);
    vi.stubEnv("REDIS_REST_TOKEN", undefined);
    expect((await readEnv()).REDIS_TRANSPORT).toBe("tcp");
  });

  it("normalizes explicit legacy prefixes without changing their path boundary", async () => {
    vi.stubEnv(
      "LEGACY_MEDIA_PUBLIC_URLS",
      " https://legacy.example.com/media/,https://legacy.example.com/media , http://localhost:3900/bucket/ ",
    );
    expect((await readEnv()).LEGACY_MEDIA_PUBLIC_URLS).toEqual([
      "https://legacy.example.com/media",
      "http://localhost:3900/bucket",
    ]);
  });

  it.each([
    "file:///etc",
    "https://user:password@example.com",
    "https://example.com?x=1",
    "https://example.com/#x",
    "not-a-url",
  ])("rejects unsafe legacy prefix %s", async (value) => {
    vi.stubEnv("LEGACY_MEDIA_PUBLIC_URLS", value);
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
  });

  it("accepts the R2 S3 contract", async () => {
    vi.stubEnv(
      "AWS_ENDPOINT_URL_S3",
      "https://example.r2.cloudflarestorage.com",
    );
    vi.stubEnv("AWS_REGION", "auto");
    vi.stubEnv("S3_PUBLIC_URL", "https://media.example.com");
    expect((await readEnv()).S3_PUBLIC_URL).toBe("https://media.example.com");
  });

  it.each([
    ["AWS_ENDPOINT_URL_S3", "http://example.r2.cloudflarestorage.com"],
    ["AWS_ENDPOINT_URL_S3", "https://example.r2.cloudflarestorage.com/bucket"],
    ["AWS_REGION", "us-east-1"],
    ["S3_PUBLIC_URL", "https://example.r2.dev"],
    ["S3_PUBLIC_URL", "http://media.example.com"],
  ])("rejects inconsistent R2 input %s", async (key, value) => {
    vi.stubEnv(
      "AWS_ENDPOINT_URL_S3",
      "https://example.r2.cloudflarestorage.com",
    );
    vi.stubEnv("AWS_REGION", "auto");
    vi.stubEnv(key, value);
    await expect(readEnv()).rejects.toThrow("Invalid environment variables");
  });
});
