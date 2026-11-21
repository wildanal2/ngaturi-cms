import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThumbnailImage } from "./thumbnail-image";

const state = vi.hoisted(() => ({
  failed: false,
  setFailed: vi.fn(),
  onError: undefined as undefined | (() => void),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [state.failed, state.setFailed],
}));

vi.mock("next/image", () => ({
  default: ({
    onError,
    unoptimized: _unoptimized,
    fill: _fill,
    ...props
  }: import("next/image").ImageProps) => {
    void _unoptimized;
    void _fill;
    state.onError = onError as () => void;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} src={String(props.src)} />;
  },
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
  it("handles a failed request without logging a handled fallback as an error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderToStaticMarkup(<ThumbnailImage src="/missing" alt="" fill />);
    state.onError?.();
    expect(state.setFailed).toHaveBeenCalledWith(true);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
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
