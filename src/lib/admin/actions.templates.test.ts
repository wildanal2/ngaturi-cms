import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { templates } from "@/lib/db/schema";
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  rows: [
    {
      id: "navy-elegan",
      name: "Navy Elegan",
      category: "wedding",
      tier: "free",
      isActive: false,
      isFeatured: false,
    },
  ],
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ orderBy: async () => mocks.rows }) }),
    update: mocks.update,
  },
}));
vi.mock("@/lib/auth/helpers", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { toggleTemplateActive } from "./actions";
import AdminTemplates from "@/app/(admin)/admin/templates/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
});
it("keeps disabled templates visible to admin and permits reactivation with path invalidation", async () => {
  const html = renderToStaticMarkup(await AdminTemplates());
  expect(html).toContain("Navy Elegan");
  expect(html).toContain("Nonaktif");
  await toggleTemplateActive("navy-elegan", true);
  expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  expect(mocks.update).toHaveBeenCalledWith(templates);
  expect(mocks.set).toHaveBeenCalledWith({
    isActive: true,
    updatedAt: expect.any(Date),
  });
  for (const path of [
    "/admin/templates",
    "/",
    "/templates",
    "/invitations/new",
  ]) {
    expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
  }
  for (const path of [
    "/builder/[invitationId]",
    "/templates/[id]/preview",
    "/templates/[id]/use",
  ]) {
    expect(mocks.revalidatePath).toHaveBeenCalledWith(path, "page");
  }
});
