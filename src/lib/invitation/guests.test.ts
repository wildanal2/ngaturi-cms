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

import {
  createGuestInvite,
  createGuestInvitesBulk,
  deleteGuestInvite,
  renameGuestInvite,
  setGuestCategory,
  markGuestSent,
} from "./guests";

function ownedInvitation(row: object) {
  mocks.select.mockReturnValue({
    from: () => ({
      // Ownership lookup uses limit(); category lookup awaits where() directly.
      where: () =>
        Object.assign(Promise.resolve([]), { limit: async () => [row] }),
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

describe("bulk contact import (owner)", () => {
  const active = {
    id: "invitation-1",
    userId: "user-1",
    plan: "free_trial",
    isPaid: false,
    isEditLocked: false,
    editExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
  };
  /** First select = ownership lookup, second = existing guests. */
  function setup(
    inv: object | null,
    existing: { name: string; phone: string | null }[] = [],
    insert: (row: { guestName: string }) => Promise<unknown> = async () =>
      undefined,
  ) {
    let call = 0;
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: () =>
          ++call === 1
            ? { limit: async () => (inv ? [inv] : []) }
            : Promise.resolve(existing),
      }),
    }));
    const values = vi.fn(insert);
    mocks.insert.mockReturnValue({ values });
    return values;
  }

  it("adds valid contacts, skips duplicates and invalid items, and reports each", async () => {
    const values = setup(active, [{ name: "Ani", phone: "+62 812-0000-1111" }]);
    const res = await createGuestInvitesBulk("invitation-1", [
      { name: "Budi", phone: "0812 0000 2222", maxGuests: 3 },
      { name: "Ani lagi", phone: "081200001111" },
      { name: "", phone: "081200003333" },
      { name: "Cici", phone: null },
      { name: "Budi dobel", phone: "+6281200002222" },
    ]);
    expect(res).toEqual({
      ok: true,
      added: 2,
      statuses: ["added", "duplicate", "invalid", "added", "duplicate"],
    });
    expect(values).toHaveBeenCalledTimes(2);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invitation-1",
        guestName: "Budi",
        whatsappPhone: "081200002222",
        maxGuests: 3,
        slugToken: expect.stringMatching(/^[a-z2-9]{10}$/),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
  });

  it("reports partial failure per item instead of claiming success", async () => {
    setup(active, [], async (row) => {
      if (row.guestName === "Gagal") throw new Error("db down");
    });
    const res = await createGuestInvitesBulk("invitation-1", [
      { name: "Ok", phone: "081200004444" },
      { name: "Gagal", phone: "081200005555" },
    ]);
    expect(res).toEqual({ ok: true, added: 1, statuses: ["added", "failed"] });
  });

  it("makes a retry idempotent: guests already saved are skipped", async () => {
    setup(active, [{ name: "Ok", phone: "081200004444" }]);
    const res = await createGuestInvitesBulk("invitation-1", [
      { name: "Ok", phone: "081200004444" },
      { name: "Gagal", phone: "081200005555" },
    ]);
    expect(res).toEqual({
      ok: true,
      added: 1,
      statuses: ["duplicate", "added"],
    });
  });

  it("refuses without entitlement, ownership, or a sane batch, and never writes", async () => {
    const values = setup({ ...active, plan: "basic", isPaid: true });
    await expect(
      createGuestInvitesBulk("invitation-1", [{ name: "A" }]),
    ).resolves.toMatchObject({ ok: false });
    for (const bad of [undefined, [], "x", Array(101).fill({ name: "A" })]) {
      setup(active);
      await expect(
        createGuestInvitesBulk("invitation-1", bad),
      ).resolves.toMatchObject({ ok: false });
    }
    setup(null);
    await expect(
      createGuestInvitesBulk("invitation-1", [{ name: "A" }]),
    ).rejects.toThrow("Undangan tidak ditemukan");
    expect(values).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("ignores client-supplied ownership fields and stays on the owned invitation", async () => {
    const values = setup(active);
    await createGuestInvitesBulk("invitation-1", [
      {
        name: "A",
        phone: "081200006666",
        invitationId: "other",
        slugToken: "evil",
      },
    ]);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: "invitation-1",
        slugToken: expect.not.stringMatching(/^evil$/),
      }),
    );
  });

  it("does not log contact data on failure", async () => {
    const spies = [
      vi.spyOn(console, "error"),
      vi.spyOn(console, "log"),
      vi.spyOn(console, "warn"),
    ];
    setup(active, [], async () => {
      throw new Error("boom");
    });
    await createGuestInvitesBulk("invitation-1", [
      { name: "Rahasia", phone: "081200007777" },
    ]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    spies.forEach((spy) => spy.mockRestore());
  });
});

describe("rename and category (owner) guards", () => {
  const active = {
    id: "invitation-1",
    userId: "user-1",
    plan: "free_trial",
    isPaid: false,
    isEditLocked: false,
    editExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
  };
  const GUEST = "71e90b26-6b9d-4317-9e61-a57756090910";
  const update = () => {
    const returning = vi.fn(async () => [{ id: GUEST }]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.update.mockReturnValue({ set });
    return { set, where, returning };
  };

  it("never writes without entitlement, for a bad id or an empty name", async () => {
    const w = update();
    ownedInvitation({ ...active, plan: "basic", isPaid: true });
    expect((await renameGuestInvite("invitation-1", GUEST, "Baru")).ok).toBe(
      false,
    );
    expect((await setGuestCategory("invitation-1", GUEST, "Kantor")).ok).toBe(
      false,
    );
    ownedInvitation(active);
    expect(
      (await renameGuestInvite("invitation-1", "not-a-uuid", "Baru")).ok,
    ).toBe(false);
    expect((await renameGuestInvite("invitation-1", GUEST, "   ")).ok).toBe(
      false,
    );
    expect((await setGuestCategory("invitation-1", "1; drop", "X")).ok).toBe(
      false,
    );
    expect(w.set).not.toHaveBeenCalled();
  });
  it("requires ownership of the invitation", async () => {
    update();
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    });
    await expect(renameGuestInvite("invitation-1", GUEST, "X")).rejects.toThrow(
      "Undangan tidak ditemukan",
    );
  });
  it("renames with one conditional UPDATE and trims and bounds the name", async () => {
    ownedInvitation(active);
    const w = update();
    await expect(
      renameGuestInvite("invitation-1", GUEST, `  ${"n".repeat(300)} `),
    ).resolves.toEqual({ ok: true });
    expect(w.set).toHaveBeenCalledWith({ guestName: "n".repeat(200) });
    expect(w.where).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/invitations/invitation-1/guests",
    );
  });
});
