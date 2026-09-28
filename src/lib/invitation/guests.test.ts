import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    delete: mocks.delete,
    update: mocks.update,
  },
}));
vi.mock("@/lib/auth/helpers", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createGuestInvite, deleteGuestInvite, markGuestSent } from "./guests";

function ownedInvitation(row: object) {
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: async () => [row] }),
    }),
  });
}

const form = () => {
  const data = new FormData();
  data.set("guest_name", "Tamu");
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ user: { id: "user-1" } });
});

describe("personalized guest entitlement", () => {
  it("blocks new guests after trial edit expiry", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: false,
      editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    await expect(createGuestInvite("invitation-1", form())).resolves.toEqual({
      ok: false,
      error:
        "Undangan per-tamu tersedia gratis selama masa coba, atau dengan paket Premium.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("blocks new guests for Basic", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "basic",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
    });

    await expect(createGuestInvite("invitation-1", form())).resolves.toEqual({
      ok: false,
      error:
        "Undangan per-tamu tersedia gratis selama masa coba, atau dengan paket Premium.",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows Premium-equivalent active trials to create guests", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: false,
      editExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    const values = vi.fn(async () => undefined);
    mocks.insert.mockReturnValue({ values });

    await expect(createGuestInvite("invitation-1", form())).resolves.toEqual({
      ok: true,
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invitation-1",
        guestName: "Tamu",
      }),
    );
  });

  it("keeps guest-link revocation available after trial expiry", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: true,
      editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    const where = vi.fn(async () => undefined);
    mocks.delete.mockReturnValue({ where });

    await expect(
      deleteGuestInvite("invitation-1", "guest-1"),
    ).resolves.toBeUndefined();
    expect(where).toHaveBeenCalledOnce();
  });

  it("scopes existing-link sent management to its invitation", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "basic",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
    });
    const where = vi.fn(async () => undefined);
    mocks.update.mockReturnValue({ set: () => ({ where }) });

    await expect(
      markGuestSent("invitation-1", "guest-1"),
    ).resolves.toBeUndefined();
    expect(where).toHaveBeenCalledOnce();
  });
});
