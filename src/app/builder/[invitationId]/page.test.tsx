import { beforeEach, expect, it, vi } from "vitest";
import { templates } from "@/lib/db/schema";
import { TEMPLATES } from "@/lib/templates/catalog";

const mocks = vi.hoisted(() => ({
  invitation: {} as Record<string, unknown>,
  statuses: [] as { id: string; isActive: boolean }[],
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: (table: unknown) =>
        table === templates
          ? Promise.resolve(mocks.statuses)
          : { where: () => ({ limit: async () => [mocks.invitation] }) },
    }),
  },
}));
vi.mock("@/lib/auth/helpers", () => ({
  requireUser: async () => ({ user: { id: "owner" } }),
}));
vi.mock("@/components/builder/builder-shell", () => ({
  BuilderShell: () => null,
}));
vi.mock("@/components/builder/template-picker", () => ({
  TemplatePicker: () => null,
}));
import BuilderPage from "./page";
import { BuilderShell } from "@/components/builder/builder-shell";
import { TemplatePicker } from "@/components/builder/template-picker";

beforeEach(() => {
  mocks.statuses = [{ id: TEMPLATES[0].id, isActive: false }];
  mocks.invitation = {
    id: "existing",
    userId: "owner",
    sourceTemplate: null,
    plan: "premium",
    isPaid: true,
    isEditLocked: false,
    editExpiresAt: null,
    sections: TEMPLATES[0].sections,
    globalSettings: TEMPLATES[0].global_settings,
    status: "draft",
    slug: "existing",
    hasWatermark: false,
  };
});
it("omits inactive templates from initial selection", async () => {
  const page = await BuilderPage({
    params: Promise.resolve({ invitationId: "existing" }),
  });
  expect(page.type).toBe(TemplatePicker);
  expect(page.props.templates.map((t: { id: string }) => t.id)).toEqual(
    TEMPLATES.slice(1).map((t) => t.id),
  );
});
it("edits an existing inactive template with original data while filtering replacement choices", async () => {
  mocks.invitation.sourceTemplate = TEMPLATES[0].id;
  const page = await BuilderPage({
    params: Promise.resolve({ invitationId: "existing" }),
  });
  expect(page.type).toBe(BuilderShell);
  expect(page.props.activeTemplate.id).toBe(TEMPLATES[0].id);
  expect(page.props.initialSections).toBe(mocks.invitation.sections);
  expect(page.props.initialGlobal).toBe(mocks.invitation.globalSettings);
  expect(page.props.locked).toBe(false);
  expect(
    page.props.templates.some((t: { id: string }) => t.id === TEMPLATES[0].id),
  ).toBe(false);
});
