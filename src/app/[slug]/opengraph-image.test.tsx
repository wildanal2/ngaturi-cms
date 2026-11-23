import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicInvitation: vi.fn(),
  imageResponse: vi.fn(),
  failBodyOnce: { value: false },
}));

vi.mock("next/og", () => ({
  ImageResponse: class {
    headers = new Headers({ "content-type": "image/png" });
    status = 200;
    constructor(element: unknown, options: unknown) {
      mocks.imageResponse(element, options);
    }
    async arrayBuffer() {
      if (mocks.failBodyOnce.value) {
        mocks.failBodyOnce.value = false;
        throw new Error("lazy decode failure");
      }
      return new ArrayBuffer(8);
    }
  },
}));
vi.mock("@/lib/invitation/og-compress", () => ({
  fitOgImage: async (r: unknown) => r,
  satoriImage: async (v: unknown) => v,
}));
vi.mock("next/headers", () => ({
  headers: () => {
    throw new Error("OG must not read request headers");
  },
}));
vi.mock("@/lib/invitation/query", () => ({
  getPublicInvitation: mocks.getPublicInvitation,
  invitationSummary: (inv: { names?: string }) => ({
    names: inv.names ?? "Alya & Bima",
    photo: null,
  }),
}));
vi.mock("@/lib/invitation/visibility", () => ({
  isInvitationPubliclyActive: (inv: { active?: boolean }) =>
    inv.active !== false,
}));
vi.mock("@/lib/storage", () => ({
  trustedPublicMediaPrefixes: () => ["https://media.example.com"],
}));

import OgImage from "./opengraph-image";

afterEach(() => vi.unstubAllGlobals());

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TTF = new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0]);

function stubFetch() {
  const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
    void init;
    const url = String(input);
    if (url.endsWith(".ttf"))
      return new Response(TTF, { headers: { "content-type": "font/ttf" } });
    return new Response(PNG, { headers: { "content-type": "image/png" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const imageUrls = (m: ReturnType<typeof stubFetch>) =>
  m.mock.calls.map((c) => String(c[0])).filter((u) => !u.endsWith(".ttf"));
const render = (slug = "alya-bima") =>
  OgImage({ params: Promise.resolve({ slug }) });
const tree = () => JSON.stringify(mocks.imageResponse.mock.calls.at(-1)![0]);
const invitation = (sections: unknown[], extra: object = {}) => ({
  global: {},
  eventDate: "2026-12-12T03:00:00.000Z",
  sections,
  ...extra,
});

describe("OG card represents the opened invitation", () => {
  afterEach(() => mocks.imageResponse.mockClear());

  it("fetches hero art from the configured origin, never the cover photo", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "cover",
          variant: "x",
          props: { background_image: "/themes/cover.png" },
        },
        {
          type: "hero",
          variant: "centered",
          props: { background_image: "/themes/hero.png" },
        },
      ]),
    );
    const f = stubFetch();
    await render();
    expect(imageUrls(f)).toEqual(["http://localhost:3030/themes/hero.png"]);
    expect(f.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    expect(mocks.imageResponse).toHaveBeenCalledOnce();
    expect(mocks.imageResponse.mock.calls[0][1]).toMatchObject({
      width: 1200,
      height: 630,
    });
  });

  it("does not read request headers or use the guest query", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([{ type: "hero", variant: "centered", props: {} }]),
    );
    stubFetch();
    await render();
    expect(tree()).not.toMatch(/to=|kepada|token|delegate/i);
  });

  it("renders an elegant typographic card when only a cover photo exists", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "cover",
          variant: "x",
          props: { background_image: "/themes/cover.png" },
        },
      ]),
    );
    const f = stubFetch();
    await render();
    expect(imageUrls(f)).toEqual([]);
    expect(tree()).toContain("Alya & Bima");
    expect(tree()).toContain("12 Desember 2026");
  });

  it("uses the hero tagline and falls back to the cover tagline", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        { type: "cover", props: { tagline: "Cover Line" } },
        { type: "hero", variant: "minimal", props: { tagline: "Hero Line" } },
      ]),
    );
    stubFetch();
    await render();
    expect(tree()).toContain("Hero Line");
    expect(tree()).not.toContain("Cover Line");
  });

  it("truncates very long names and strips unsupported scripts", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([{ type: "hero", variant: "minimal", props: {} }], {
        names: `${"Kusumawardhani ".repeat(10)} 王`,
      }),
    );
    stubFetch();
    await render();
    const names = /Kusumawardhani[^"]*/.exec(tree())![0];
    expect(names.length).toBeLessThanOrEqual(64);
    expect(tree()).not.toContain("王");
  });

  it("never fetches untrusted or private hosts (SSRF)", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "hero",
          variant: "centered",
          props: {
            background_image: "http://169.254.169.254/latest/meta-data",
          },
        },
        {
          type: "couple-intro",
          props: { flower_left_image: "https://evil.example/x.png" },
        },
      ]),
    );
    const f = stubFetch();
    await render();
    expect(imageUrls(f)).toEqual([]);
    expect(mocks.imageResponse).toHaveBeenCalledOnce();
  });

  it("trusts configured media hosts only", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "hero",
          variant: "split",
          props: { background_image: "https://media.example.com/a/p.png" },
        },
      ]),
    );
    const f = stubFetch();
    await render();
    expect(imageUrls(f)).toEqual(["https://media.example.com/a/p.png"]);
  });

  it("shows only a generic card for inactive invitations", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation(
        [
          {
            type: "hero",
            variant: "centered",
            props: { background_image: "/themes/hero.png" },
          },
        ],
        { active: false, names: "Rahasia & Privat" },
      ),
    );
    const f = stubFetch();
    await render();
    expect(imageUrls(f)).toEqual([]);
    expect(tree()).toContain("Undangan Digital");
    expect(tree()).not.toContain("Rahasia");
  });

  it("renders a generic card for unknown slugs", async () => {
    mocks.getPublicInvitation.mockResolvedValue(null);
    stubFetch();
    await render("missing");
    expect(tree()).toContain("Undangan Digital");
  });

  it("keeps rendering when the optional font cannot be loaded", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([{ type: "hero", variant: "minimal", props: {} }]),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await render();
    expect(mocks.imageResponse).toHaveBeenCalledOnce();
    expect(mocks.imageResponse.mock.calls[0][1]).toMatchObject({
      fonts: undefined,
    });
  });

  it("falls back to palette-only when the photo breaks the renderer", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "hero",
          variant: "centered",
          props: { background_image: "/themes/hero.png" },
        },
      ]),
    );
    stubFetch();
    mocks.imageResponse.mockImplementationOnce(() => {
      throw new Error("bad image");
    });
    const res = await render();
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(mocks.imageResponse).toHaveBeenCalledTimes(2);
    expect(tree()).not.toContain("data:image");
  });

  it("recovers when the photo only fails while the body streams", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation([
        {
          type: "hero",
          variant: "centered",
          props: { background_image: "/themes/hero.png" },
        },
      ]),
    );
    stubFetch();
    mocks.failBodyOnce.value = true;
    const res = await render();
    expect(mocks.imageResponse).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    expect(tree()).not.toContain("data:image");
  });
});
