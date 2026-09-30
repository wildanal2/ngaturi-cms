import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  afterTasks: [] as Array<() => Promise<void>>,
  getGuestByToken: vi.fn(),
  getPublicInvitation: vi.fn(),
  invitationSummary: vi.fn(),
  getSession: vi.fn(),
  headers: vi.fn(),
  insertValues: vi.fn(),
  markGuestOpened: vi.fn(),
  notFound: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    mocks.after(task);
    mocks.afterTasks.push(task);
  },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/invitation/query", () => ({
  getPublicInvitation: mocks.getPublicInvitation,
  getGuestByToken: mocks.getGuestByToken,
  markGuestOpened: mocks.markGuestOpened,
  invitationSummary: mocks.invitationSummary,
}));
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({ values: mocks.insertValues }),
    update: () => ({
      set: () => ({ where: mocks.updateWhere }),
    }),
  },
}));
vi.mock("@/lib/templates/catalog", () => ({
  resolveTemplateComposition: vi.fn(() => undefined),
}));
vi.mock("@/lib/invitation/renderer", () => ({
  InvitationRenderer: () => null,
}));
vi.mock("@/components/invitation/cover", () => ({
  InvitationCover: () => null,
}));

import InvitationPage from "./page";
import { runWithInvocationContext } from "@/lib/runtime/context";

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invitation-1",
    slug: "alya-bima",
    sourceTemplate: "classic",
    userId: "owner-1",
    status: "published",
    eventTitle: "Alya & Bima",
    eventType: "wedding",
    eventDate: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
    hasWatermark: false,
    sections: [],
    global: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.afterTasks.length = 0;
  mocks.getPublicInvitation.mockResolvedValue(invitation());
  mocks.invitationSummary.mockReturnValue({
    eventLabel: "Pernikahan",
    names: "Alya & Bima",
    photo: null,
    venueName: null,
    venueAddress: null,
  });
  mocks.getGuestByToken.mockResolvedValue(null);
  mocks.getSession.mockResolvedValue(null);
  mocks.headers.mockResolvedValue(
    new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.1",
      "user-agent": "runtime-test",
      referer: "https://example.test/source",
    }),
  );
  mocks.insertValues.mockResolvedValue(undefined);
  mocks.updateWhere.mockResolvedValue(undefined);
  mocks.markGuestOpened.mockResolvedValue(undefined);
  mocks.notFound.mockImplementation(() => {
    throw new Error("not-found");
  });
});

describe("public invitation runtime flow", () => {
  it("renders an active personalized invitation and schedules bounded analytics once", async () => {
    mocks.getGuestByToken.mockResolvedValue({
      id: "guest-1",
      name: "Tamu Satu",
    });

    await expect(
      InvitationPage({
        params: Promise.resolve({ slug: "alya-bima" }),
        searchParams: Promise.resolve({ to: "guest-token" }),
      }),
    ).resolves.toBeTruthy();

    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.getGuestByToken).toHaveBeenCalledWith(
      "invitation-1",
      "guest-token",
    );
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.afterTasks).toHaveLength(1);

    await mocks.afterTasks[0]();
    expect(mocks.insertValues).toHaveBeenCalledOnce();
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invitation-1",
        visitorId: "anon",
        ipAddress: null,
        userAgent: "runtime-test",
        referrer: "https://example.test/source",
      }),
    );
    expect(mocks.updateWhere).toHaveBeenCalledOnce();
    expect(mocks.markGuestOpened).toHaveBeenCalledOnce();
    expect(mocks.markGuestOpened).toHaveBeenCalledWith("guest-1");
  });

  it("uses Cloudflare identity only inside a trusted Worker invocation", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
      }),
    );
    await runWithInvocationContext({}, () =>
      InvitationPage({
        params: Promise.resolve({ slug: "alya-bima" }),
        searchParams: Promise.resolve({}),
      }),
    );
    await mocks.afterTasks[0]();
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        visitorId: "203.0.113.10",
        ipAddress: "203.0.113.10",
      }),
    );
  });

  it("serializes hostile invitation names as valid JSON-LD inside one script", async () => {
    const payload = "</script><script>alert(1)</script><!--";
    mocks.invitationSummary.mockReturnValue({
      eventLabel: "Pernikahan",
      names: payload,
      photo: null,
      venueName: "<script>venue</script>",
      venueAddress: "</script>",
    });
    const rendered = await InvitationPage({
      params: Promise.resolve({ slug: "alya-bima" }),
      searchParams: Promise.resolve({}),
    });
    const script = rendered.props.children[0];
    const json = script.props.dangerouslySetInnerHTML.__html as string;
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toMatchObject({ name: `Pernikahan ${payload}` });
    expect(script.props.type).toBe("application/ld+json");
  });

  it("keeps inactive invitations available only to their owner preview", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation({ status: "draft", expiresAt: null }),
    );
    mocks.getSession.mockResolvedValue({ user: { id: "owner-1" } });

    await expect(
      InvitationPage({
        params: Promise.resolve({ slug: "alya-bima" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toBeTruthy();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.after).toHaveBeenCalledOnce();
  });

  it("rejects an expired invitation for a public visitor before scheduling analytics", async () => {
    mocks.getPublicInvitation.mockResolvedValue(
      invitation({ expiresAt: "2020-01-01T00:00:00.000Z" }),
    );

    await expect(
      InvitationPage({
        params: Promise.resolve({ slug: "alya-bima" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("not-found");
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("logs a background write failure without rejecting the rendered response", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.insertValues.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      InvitationPage({
        params: Promise.resolve({ slug: "alya-bima" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toBeTruthy();
    await expect(mocks.afterTasks[0]()).resolves.toBeUndefined();

    expect(mocks.updateWhere).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      "Public invitation analytics failed",
      JSON.stringify({
        invitationId: "invitation-1",
        category: "background_write_failed",
      }),
    );
    warning.mockRestore();
  });
});
