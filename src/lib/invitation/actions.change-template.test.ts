import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  invitations,
  payments,
  templates,
  userProfiles,
} from "@/lib/db/schema";
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
  deleteInvitation,
  publishInvitation,
  saveComposition,
  unpublishInvitation,
  updateInvitationSlug,
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
const premiumTargetTemplate: TemplatePreset = {
  ...preset("premium-wedding", "wedding"),
  tier: "premium",
};
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
  eventDate: null as Date | null,
  expiresAt: null as Date | null,
  publishedAt: null as Date | null,
};

function selectBuilder(row: Record<string, unknown> = invitation) {
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

function transactionBuilder(row: Record<string, unknown> = invitation) {
  const set = vi.fn((values: Record<string, unknown>) => {
    void values;
    return {
      where: vi.fn(async () => undefined),
    };
  });
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
    [
      sourceTemplate,
      targetTemplate,
      premiumTargetTemplate,
      incompatibleTemplate,
    ].find((template) => template.id === id),
  );
});

describe("legacy template identity", () => {
  it("does not reapply content when switching from the legacy ID to its canonical ID", async () => {
    const { set, insert } = transactionBuilder({
      ...invitation,
      sourceTemplate: LEGACY_SEKAR_JAWA_ID,
    });
    mocks.getTemplate.mockReturnValueOnce(preset(SEKAR_JAWA_ID, "wedding"));
    expect(
      await changeInvitationTemplate(invitation.id, SEKAR_JAWA_ID),
    ).toEqual({ ok: true });
    expect(set).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("publishInvitation renewal safety", () => {
  it("does not shorten an existing later renewal expiry", async () => {
    const renewedUntil = new Date("2099-03-01T00:00:00.000Z");
    const { set } = transactionBuilder({
      ...invitation,
      eventDate: new Date("2026-10-01T00:00:00.000Z"),
      expiresAt: renewedUntil,
    });

    await expect(publishInvitation(invitation.id)).resolves.toEqual({
      ok: true,
      slug: invitation.slug,
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        expiresAt: renewedUntil,
      }),
    );
  });

  it("rejects an expired trial on the server", async () => {
    const { set } = transactionBuilder({
      ...invitation,
      plan: "free_trial" as const,
      isPaid: false,
      editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    await expect(publishInvitation(invitation.id)).resolves.toEqual({
      ok: false,
      error: "Masa edit gratis sudah berakhir. Upgrade untuk menerbitkan.",
    });
    expect(set).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});

describe("createInvitation catalog materialization", () => {
  it("materializes a code-backed template before inserting its FK", async () => {
    const profileLimit = vi.fn(async () => [{ bonus: 0 }]);
    const countWhere = vi.fn(async () => [{ count: 0 }]);
    const templateValues = vi.fn(() => ({
      onConflictDoNothing: vi.fn(async () => undefined),
    }));
    const invitationValues = vi.fn((values: Record<string, unknown>) => {
      void values;
      return {
        returning: vi.fn(async () => [{ id: "created-invitation" }]),
      };
    });
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
    const created = invitationValues.mock.calls[0][0] as {
      createdAt: Date;
      editExpiresAt: Date;
    };
    expect(created.editExpiresAt.getTime() - created.createdAt.getTime()).toBe(
      72 * 60 * 60 * 1000,
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/builder/created-invitation");
  });

  it("creates a locked draft and routes to upgrade after the lifetime trial is consumed", async () => {
    const profileLimit = vi.fn(async () => [
      { bonus: 1, freeInvitationUsed: true },
    ]);
    const countWhere = vi.fn(async () => [{ count: 0 }]);
    const invitationValues = vi.fn(() => ({
      returning: vi.fn(async () => [{ id: "locked-invitation" }]),
    }));
    const insert = vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })
      .mockReturnValueOnce({ values: invitationValues });
    const update = vi.fn();
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
      update,
    };
    mocks.transaction.mockImplementationOnce(async (callback) => callback(tx));
    mocks.getTemplate.mockReturnValueOnce(targetTemplate);

    await createInvitation(targetTemplate.id);

    expect(invitationValues).toHaveBeenCalledWith(
      expect.objectContaining({
        editExpiresAt: null,
        isEditLocked: true,
        hasWatermark: true,
      }),
    );
    expect(update).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/invitations/locked-invitation/unlock",
    );
  });

  it("serializes concurrent creates so only one receives the lifetime trial", async () => {
    let freeInvitationUsed = false;
    let invitationCount = 0;
    let nextId = 0;
    let transactionTail = Promise.resolve();
    const created: Array<Record<string, unknown>> = [];
    const rowLocks: number[] = [];

    mocks.transaction.mockImplementation((callback) => {
      const run = transactionTail.then(async () => {
        let selectIndex = 0;
        const tx = {
          insert: (table: unknown) => ({
            values: (values: Record<string, unknown>) => {
              if (table === userProfiles || table === templates) {
                return {
                  onConflictDoNothing: async () => undefined,
                };
              }
              if (table === invitations) {
                return {
                  returning: async () => {
                    created.push(values);
                    invitationCount += 1;
                    nextId += 1;
                    return [{ id: `invitation-${nextId}` }];
                  },
                };
              }
              throw new Error("unexpected insert target");
            },
          }),
          select: () => {
            selectIndex += 1;
            if (selectIndex === 1) {
              return {
                from: () => ({
                  where: () => ({
                    for: () => {
                      rowLocks.push(1);
                      return {
                        limit: async () => [{ bonus: 1, freeInvitationUsed }],
                      };
                    },
                  }),
                }),
              };
            }
            return {
              from: () => ({
                where: async () => [{ count: invitationCount }],
              }),
            };
          },
          update: (table: unknown) => ({
            set: (values: Record<string, unknown>) => ({
              where: async () => {
                if (table === userProfiles && values.freeInvitationUsed) {
                  freeInvitationUsed = true;
                }
              },
            }),
          }),
        };
        return callback(tx);
      });
      transactionTail = run.then(() => undefined);
      return run;
    });
    mocks.getTemplate.mockReturnValue(targetTemplate);

    await Promise.all([
      createInvitation(targetTemplate.id),
      createInvitation(targetTemplate.id),
    ]);

    expect(rowLocks).toHaveLength(2);
    expect(created).toHaveLength(2);
    expect(
      created.filter(
        (row) =>
          row.editExpiresAt instanceof Date && row.isEditLocked === false,
      ),
    ).toHaveLength(1);
    expect(
      created.filter(
        (row) => row.editExpiresAt === null && row.isEditLocked === true,
      ),
    ).toHaveLength(1);
    expect(freeInvitationUsed).toBe(true);
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

  it("keeps an existing Premium template but blocks switching Basic to another one", async () => {
    const currentPremium = {
      ...invitation,
      plan: "basic" as const,
      sourceTemplate: premiumTargetTemplate.id,
    };
    const { tx } = transactionBuilder(currentPremium);

    await expect(
      changeInvitationTemplate(invitation.id, premiumTargetTemplate.id),
    ).resolves.toEqual({ ok: true });
    expect(tx.update).not.toHaveBeenCalled();

    mocks.getTemplate.mockImplementation((id: string) =>
      [
        premiumTargetTemplate,
        { ...premiumTargetTemplate, id: "premium-two" },
      ].find((template) => template.id === id),
    );
    const second = transactionBuilder(currentPremium);
    await expect(
      changeInvitationTemplate(invitation.id, "premium-two"),
    ).resolves.toEqual({
      ok: false,
      error: "Paket Basic hanya dapat beralih ke template Basic atau Gratis.",
    });
    expect(second.tx.update).not.toHaveBeenCalled();
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

  it("blocks a new Premium variant mutation for Basic before writing", async () => {
    mocks.select.mockReturnValue(
      selectBuilder({
        ...invitation,
        plan: "basic",
        sections: existingSections,
      }),
    );
    const next = [{ ...existingSections[0], variant: "cinematic-vintage" }];

    await expect(
      saveComposition(invitation.id, {
        sections: next,
        global_settings: sourceTemplate.global_settings,
        source_template: sourceTemplate.id,
      }),
    ).resolves.toEqual({
      ok: false,
      error:
        "Fitur Premium yang sudah ada tetap aktif, tetapi menambah atau menggantinya memerlukan paket Premium.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("edit-expiry mutation enforcement", () => {
  const expiredTrial = {
    ...invitation,
    plan: "free_trial",
    isPaid: false,
    isEditLocked: false,
    editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
  };

  it("rejects content saves after the trial expires", async () => {
    mocks.select.mockReturnValue(selectBuilder(expiredTrial));

    await expect(
      saveComposition(invitation.id, {
        sections: existingSections,
        global_settings: sourceTemplate.global_settings,
        source_template: sourceTemplate.id,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Masa edit gratis sudah berakhir.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects template changes after the trial expires", async () => {
    const { tx } = transactionBuilder(expiredTrial);

    await expect(
      changeInvitationTemplate(invitation.id, targetTemplate.id),
    ).resolves.toEqual({
      ok: false,
      error: "Masa edit gratis sudah berakhir.",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rejects slug changes after the trial expires", async () => {
    mocks.select.mockReturnValue(selectBuilder(expiredTrial));

    await expect(
      updateInvitationSlug(invitation.id, "slug-baru"),
    ).resolves.toEqual({
      ok: false,
      error: "Masa edit gratis sudah berakhir.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps unpublish available after trial edit expiry", async () => {
    const expired = { ...expiredTrial, status: "published" };
    mocks.select.mockReturnValue(selectBuilder(expired));
    const set = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    mocks.update.mockReturnValue({ set });

    await expect(unpublishInvitation(invitation.id)).resolves.toBeUndefined();

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft" }),
    );
  });

  it("deletes an expired invitation without resetting lifetime trial usage", async () => {
    mocks.select.mockReturnValue(selectBuilder(expiredTrial));
    const updateTargets: unknown[] = [];
    const deleteTargets: unknown[] = [];
    const tx = {
      update: (table: unknown) => {
        updateTargets.push(table);
        return {
          set: () => ({ where: async () => undefined }),
        };
      },
      delete: (table: unknown) => {
        deleteTargets.push(table);
        return { where: async () => undefined };
      },
    };
    mocks.transaction.mockImplementationOnce(async (callback) => callback(tx));

    await deleteInvitation(invitation.id);

    expect(updateTargets).toEqual([payments]);
    expect(updateTargets).not.toContain(userProfiles);
    expect(deleteTargets).toEqual([invitations]);
    expect(mocks.redirect).toHaveBeenCalledWith("/invitations");
  });
});
