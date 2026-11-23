import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("contact import never uploads raw contact files", () => {
  const sources = {
    importer: read("./contact-importer.tsx"),
    parser: read("../../lib/invitation/contact-import.ts"),
    prefill: read("./use-contact-prefill.ts"),
  };
  it.each(Object.entries(sources))(
    "%s has no network or storage primitives",
    (_n, src) => {
      for (const banned of [
        /\bfetch\(/,
        /XMLHttpRequest/,
        /sendBeacon/,
        /new FormData/,
        /localStorage/,
        /sessionStorage/,
        /console\./,
      ])
        expect(src).not.toMatch(banned);
    },
  );
  it("only the confirmed name/phone items go to the server callback", () => {
    expect(sources.importer).toContain("onConfirm(buildBulkItems(");
    expect(sources.importer).not.toMatch(/onConfirm\([^)]*(file|text)/);
  });
});
