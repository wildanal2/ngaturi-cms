import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThumbnailImage } from "./thumbnail-image";

const state = vi.hoisted(() => ({ failed: false }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [state.failed, vi.fn()],
}));

describe("thumbnail fallback", () => {
  beforeEach(() => {
    state.failed = false;
  });
  it("keeps the requested image and its geometry", () => {
    const html = renderToStaticMarkup(
      <ThumbnailImage
        src="/templates/lakon-kencana/card"
        alt="Lakon Kencana"
        width={400}
        height={300}
        unoptimized
      />,
    );
    expect(html).toContain('src="/templates/lakon-kencana/card"');
    expect(html).toContain('width="400"');
    expect(html).toContain('height="300"');
  });
  it("shows an explicit unavailable state without substituting artwork", () => {
    state.failed = true;
    const html = renderToStaticMarkup(
      <ThumbnailImage src="/missing" alt="" fill className="object-cover" />,
    );
    expect(html).toContain("Pratinjau tidak tersedia");
    expect(html).toContain("position:absolute");
    expect(html).not.toContain("<img");
  });
});
