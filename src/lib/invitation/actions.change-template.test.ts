import { beforeEach, describe, expect, it, vi } from "vitest";
import { invitations, templates } from "@/lib/db/schema";
import type { SectionData } from "@/sections/types";
import type { TemplatePreset } from "@/lib/templates/catalog";
import { LEGACY_SEKAR_JAWA_ID, SEKAR_JAWA_ID } from "@/lib/templates/identity";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  requireUser: vi.fn(),
  getTemplate: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mocks.transaction,
    select: mocks.select,
    update: mocks.update,
  },
}));
vi.mock("@/lib/auth/helpers", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/templates/catalog", () => ({
  getTemplate: mocks.getTemplate,
}));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  refresh: mocks.refresh,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  changeInvitationTemplate,
  createInvitation,
  saveComposition,
} from "./actions";

const preset = (
  id: string,
  category: TemplatePreset["category"],
): TemplatePreset => ({
  id,
  name: id,
  description: id,
  category,
  tier: "free",
  thumbnail: `/templates/${id}/card`,
  global_settings: {
    font_family: "Fraunces",
    color_primary: "#111111",
    color_secondary: "#222222",
    color_background: "#ffffff",
    animation: "fade",
  },
  sections: [
    {
      type: "quote",
      variant: "bordered",
      order: 0,
      visible: true,
      props: { text: `Default ${id}` },
    },
  ],
});

const sourceTemplate = preset("source-wedding", "wedding");
const targetTemplate = preset("target-wedding", "wedding");
const incompatibleTemplate = preset("target-aqiqah", "aqiqah");

const existingSections: SectionData[] = [
  {
    id: "section-1",
    type: "quote",
    variant: "bordered",
    order: 0,
    visible: true,
    props: { text: "Kutipan pengguna" },
  },
];

const invitation = {
  id: "invitation-1",
  userId: "user-1",
  slug: "alya-bima",
  sourceTemplate: sourceTemplate.id,
  sections: existingSections,
  globalSettings: sourceTemplate.global_settings,
  templateVersion: "1.0",
  eventType: "wedding" as const,
  plan: "premium" as const,
  isPaid: true,
  editExpiresAt: null,
  isEditLocked: false,
  eventTitle: "Alya & Bima",
  eventDate: null,
};

function selectBuilder(row = invitation) {
  const limit = vi.fn(async () => [row]);
  const selection = {
    limit,
    for: vi.fn(() => ({ limit })),
  };
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => selection),
    })),
  };
}

function transactionBuilder(row = invitation) {
  const set = vi.fn((_values: Record<string, unknown>) => ({
    where: vi.fn(async () => undefined),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(async () => undefined),
    })),
  }));
  const tx = {
    select: vi.fn(() => selectBuilder(row)),
    insert,
    update: vi.fn(() => ({ set })),
  };
  mocks.transaction.mockImplementation(async (callback) => callback(tx));
  return { tx, set, insert };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getTemplate.mockImplementation((id: string) =>
    [sourceTemplate, targetTemplate, incompatibleTemplate].find(
      (template) => template.id === id,
    ),
  );
});

describe("legacy template identity", () => {
  it("does not reapply content when switching from the legacy ID to its canonical ID", async () => {
    const { set, insert } = transactionBuilder({ ...invitation, sourceTemplate: LEGACY_SEKAR_JAWA_ID });
    mocks.getTemplate.mockReturnValueOnce(preset(SEKAR_JAWA_ID, "wedding"));
    expect(await changeInvitationTemplate(invitation.id, SEKAR_JAWA_ID)).toEqual({ ok: true });
    expect(set).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("createInvitation catalog materialization", () => {
  it("materializes a code-backed template before inserting its FK", async () => {
    const profileLimit = vi.fn(async () => [{ bonus: 0 }]);
    const countWhere = vi.fn(async () => [{ count: 0 }]);
    const templateValues = vi.fn(() => ({
      onConflictDoNothing: vi.fn(async () => undefined),
    }));
    const invitationValues = vi.fn(() => ({
      returning: vi.fn(async () => [{ id: "created-invitation" }]),
    }));
    const insert = vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })
      .mockReturnValueOnce({ values: templateValues })
      .mockReturnValueOnce({ values: invitationValues });
    const tx = {
      insert,
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              for: vi.fn(() => ({ limit: profileLimit })),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({ where: countWhere })),
        }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
      })),
    };
    mocks.transaction.mockImplementationOnce(async (callback) => callback(tx));
    mocks.getTemplate.mockReturnValueOnce(targetTemplate);

    await createInvitation(targetTemplate.id);

    expect(insert.mock.calls[1][0]).toBe(templates);
    expect(templateValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: targetTemplate.id,
        category: targetTemplate.category,
        isActive: true,
      }),
    );
    expect(insert.mock.calls[2][0]).toBe(invitations);
    expect(invitationValues).toHaveBeenCalledWith(
      expect.objectContaining({ sourceTemplate: targetTemplate.id }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/builder/created-invitation",
    );
  });
});

describe("changeInvitationTemplate server invariants", () => {
  it("rejects a crafted cross-category target before hydration or writes", async () => {
    const { tx } = transactionBuilder();

    const result = await changeInvitationTemplate(
      invitation.id,
      incompatibleTemplate.id,
    );

    expect(result).toEqual({
      ok: false,
      error: "Template harus memiliki kategori yang sama dengan undangan.",
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("allows same-category changes and never migrates eventType", async () => {
    const { set, insert } = transactionBuilder();

    const result = await changeInvitationTemplate(
      invitation.id,
      targetTemplate.id,
    );

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({
      sourceTemplate: targetTemplate.id,
      sections: [
        expect.objectContaining({
          id: existingSections[0].id,
          props: expect.objectContaining({ text: "Kutipan pengguna" }),
        }),
      ],
    });
    expect(set.mock.calls[0][0]).not.toHaveProperty("eventType");
    expect(mocks.updateTag).toHaveBeenCalledWith(`invitation:${invitation.id}`);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("is a server-side no-op for the active target", async () => {
    const sameTargetInvitation = {
      ...invitation,
      sourceTemplate: targetTemplate.id,
    };
    const { tx } = transactionBuilder(sameTargetInvitation);

    const result = await changeInvitationTemplate(
      invitation.id,
      targetTemplate.id,
    );

    expect(result).toEqual({ ok: true });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("returns an error and does not invalidate caches when the transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("database failure"));

    const result = await changeInvitationTemplate(
      invitation.id,
      targetTemplate.id,
    );

    expect(result).toEqual({
      ok: false,
      error: "Template gagal diterapkan. Silakan coba lagi.",
    });
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("saveComposition stale-template guard", () => {
  it("rejects an old Builder snapshot when its conditional update matches no row", async () => {
    mocks.select.mockReturnValue(selectBuilder());
    const returning = vi.fn(async () => []);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.update.mockReturnValue({ set });

    const result = await saveComposition(invitation.id, {
      sections: existingSections,
      global_settings: sourceTemplate.global_settings,
      source_template: sourceTemplate.id,
    });

    expect(result).toEqual({
      ok: false,
      error: "Template undangan telah berubah. Muat ulang Builder.",
    });
    expect(returning).toHaveBeenCalledTimes(1);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("accepts the current template snapshot and invalidates both invitation keys", async () => {
    mocks.select.mockReturnValue(selectBuilder());
    const returning = vi.fn(async () => [{ id: invitation.id }]);
    mocks.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning })),
      })),
    });

    const result = await saveComposition(invitation.id, {
      sections: existingSections,
      global_settings: sourceTemplate.global_settings,
      source_template: sourceTemplate.id,
    });

    expect(result.ok).toBe(true);
    expect(mocks.updateTag).toHaveBeenCalledWith(`invitation:${invitation.id}`);
    expect(mocks.updateTag).toHaveBeenCalledWith(
      `invitation:slug:${invitation.slug}`,
    );
  });
});
