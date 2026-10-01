import { afterEach, describe, expect, it, vi } from "vitest";
import { siteIndexingEnabled } from "./site-indexing";
import robots from "@/app/robots";

afterEach(() => vi.unstubAllEnvs());

describe("runtime site indexing", () => {
  it("preserves existing behavior unless review mode is selected", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", undefined);
    expect(siteIndexingEnabled()).toBe(true);
    vi.stubEnv("SITE_INDEXING_ENABLED", "false");
    expect(siteIndexingEnabled()).toBe(false);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    expect(siteIndexingEnabled()).toBe(true);
    expect(robots().sitemap).toContain("/sitemap.xml");
  });

  it("does not enable indexing for malformed flags", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "yes");
    expect(siteIndexingEnabled()).toBe(false);
  });
});
