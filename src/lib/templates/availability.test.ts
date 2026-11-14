import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TEMPLATES, getTemplate } from "./catalog";
import {
  assertTemplateActive,
  filterActiveTemplates,
  getActiveTemplates,
  getActiveTemplate,
} from "./availability";
import { LEGACY_SEKAR_JAWA_ID, SEKAR_JAWA_ID } from "./identity";

const mocks = vi.hoisted(() => ({
  rows: [] as { id: string; isActive: boolean }[],
}));
vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: async () => mocks.rows }) },
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/components/ui/thumbnail-image", () => ({
  ThumbnailImage: () => null,
}));
vi.mock("@/components/marketing/page-shell", () => ({
  MarketingPage: ({ children }: { children: React.ReactNode }) => children,
  PageHeading: () => null,
}));
import TemplatesPage from "@/app/templates/page";

beforeEach(() => {
  mocks.rows = [];
});
describe("public template status", () => {
  it("hides an inactive database template from the rendered catalog", async () => {
    mocks.rows = [{ id: TEMPLATES[0].id, isActive: false }];
    const html = renderToStaticMarkup(await TemplatesPage());
    expect(html).not.toContain(`/templates/${TEMPLATES[0].id}/use`);
    expect(html).toContain(`/templates/${TEMPLATES[1].id}/use`);
    expect(getTemplate(TEMPLATES[0].id)).toBe(TEMPLATES[0]);
  });
});

describe("availability policy", () => {
  it("excludes removed source even when its orphaned database row is active", async () => {
    mocks.rows = [{ id: "heritage-gate-motion", isActive: true }];
    expect(await getActiveTemplate("heritage-gate-motion")).toBeUndefined();
    expect(
      (await getActiveTemplates()).some((t) => t.id === "heritage-gate-motion"),
    ).toBe(false);
  });
  it("keeps unseeded and active presets available and ignores database-only entries", async () => {
    mocks.rows = [
      { id: TEMPLATES[0].id, isActive: true },
      { id: "database-only", isActive: true },
    ];
    expect(await getActiveTemplates()).toEqual(TEMPLATES);
  });
  it("reads status afresh after deactivation and reactivation", async () => {
    const id = TEMPLATES[0].id;
    expect(await getActiveTemplate(id)).toBe(TEMPLATES[0]);
    mocks.rows = [{ id, isActive: false }];
    expect(await getActiveTemplate(id)).toBeUndefined();
    mocks.rows[0].isActive = true;
    expect(await getActiveTemplate(id)).toBe(TEMPLATES[0]);
  });
  it("honors disabled legacy aliases without disabling existing renderer lookup", () => {
    expect(
      filterActiveTemplates([
        { id: LEGACY_SEKAR_JAWA_ID, isActive: false },
      ]).some((t) => t.id === SEKAR_JAWA_ID),
    ).toBe(false);
    expect(getTemplate(LEGACY_SEKAR_JAWA_ID)?.id).toBe(SEKAR_JAWA_ID);
  });
  it("allows an active persisted template while locking its status", async () => {
    const lock = vi.fn(async () => [{ id: SEKAR_JAWA_ID, isActive: true }]);
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn(() => ({ for: lock })) })),
      })),
    };
    await expect(
      assertTemplateActive(
        tx as unknown as Parameters<typeof assertTemplateActive>[0],
        SEKAR_JAWA_ID,
      ),
    ).resolves.toBeUndefined();
    expect(lock).toHaveBeenCalledWith("share");
  });
  it.each([
    { rows: [] },
    { rows: [{ id: "test", isActive: false }] },
    {
      rows: [
        { id: SEKAR_JAWA_ID, isActive: true },
        { id: LEGACY_SEKAR_JAWA_ID, isActive: false },
      ],
    },
  ])(
    "rejects unavailable persisted status in a selection transaction: %j",
    async ({ rows }) => {
      const lock = vi.fn(async () => rows);
      const tx = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({ where: vi.fn(() => ({ for: lock })) })),
        })),
      };
      await expect(
        assertTemplateActive(
          tx as unknown as Parameters<typeof assertTemplateActive>[0],
          SEKAR_JAWA_ID,
        ),
      ).rejects.toThrow("Template nonaktif");
      expect(lock).toHaveBeenCalledWith("share");
    },
  );
});
