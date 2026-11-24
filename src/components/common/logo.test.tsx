import { readFileSync, statSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("serves the small 96px icon, not the 700px original (a 737 KB download on every page)", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toMatch(/logo-icon-sm\.png/);
    expect(html).not.toMatch(/logo-icon\.png/);
    expect(html).toContain('width="28"');
    expect(html).toContain('height="30"');
  });
  it("keeps the small asset genuinely small and sharp for 3x screens", () => {
    const path = new URL(
      "../../../public/logo/logo-icon-sm.png",
      import.meta.url,
    );
    expect(statSync(path).size).toBeLessThan(20 * 1024);
    const png = readFileSync(path);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    const width = png.readUInt32BE(16);
    expect(width).toBeGreaterThanOrEqual(84); // 28 CSS px at 3x
    expect(width).toBeLessThanOrEqual(128);
  });
  it("leaves the original file in place for structured data (JSON-LD logo)", () => {
    expect(
      statSync(new URL("../../../public/logo/logo-icon.png", import.meta.url))
        .size,
    ).toBeGreaterThan(100 * 1024);
  });
});
