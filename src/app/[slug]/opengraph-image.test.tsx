import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicInvitation: vi.fn(),
  imageResponse: vi.fn(),
}));

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown, options: unknown) {
      mocks.imageResponse(element, options);
    }
  },
}));
vi.mock("next/headers", () => ({
  headers: () => {
    throw new Error("OG must not read request headers");
  },
}));
vi.mock("@/lib/invitation/query", () => ({
  getPublicInvitation: mocks.getPublicInvitation,
  invitationSummary: () => ({ names: "Alya & Bima", photo: null }),
}));
vi.mock("@/lib/invitation/visibility", () => ({
  isInvitationPubliclyActive: () => true,
}));
vi.mock("@/lib/storage", () => ({
  trustedPublicMediaPrefixes: () => ["https://media.example.com"],
}));

import OgImage from "./opengraph-image";

afterEach(() => vi.unstubAllGlobals());

describe("public OG origin", () => {
  it("fetches local art from configured origin with no request-header dependency", async () => {
    mocks.getPublicInvitation.mockResolvedValue({
      global: {},
      eventDate: null,
      sections: [
        { type: "cover", props: { background_image: "/themes/test.png" } },
      ],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          { headers: { "content-type": "image/png" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await OgImage({ params: Promise.resolve({ slug: "alya-bima" }) });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3030/themes/test.png",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    expect(mocks.imageResponse).toHaveBeenCalledOnce();
  });
});
