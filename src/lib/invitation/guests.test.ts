import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  writer: vi.fn(),
}));
const writer = mocks.writer;

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    delete: mocks.delete,
    update: mocks.update,
  },
}));
vi.mock("@/lib/auth/helpers", () => ({ requireUser: mocks.requireUser }));
vi.mock("./guest-writer", () => ({ insertGuestsLocked: mocks.writer }));
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
  // The writer itself (locking, savepoints, duplicates) is covered against a real
  // PostgreSQL in delegation.integration.test.ts; here only the owner contract.
  it("hands sanitised items to the shared locked writer and reports its statuses", async () => {
    ownedInvitation(active);
    writer.mockResolvedValue({
      aborted: false,
      statuses: ["added", "duplicate", "invalid", "failed"],
    });
    const res = await createGuestInvitesBulk("invitation-1", [
      {
        name: " Budi ",
        phone: "0812 0000 2222",
        maxGuests: 99,
        group: "Kantor",
      },
      { name: "Ani", phone: "081200001111" },
      { name: "", phone: "081200003333" },
      { name: "Cici", phone: "abc" },
    ]);
    expect(res).toEqual({
      ok: true,
      added: 1,
      statuses: ["added", "duplicate", "invalid", "failed"],
    });
    const call = writer.mock.calls[0][0];
    expect(call).toMatchObject({
      invitationId: "invitation-1",
      dedupe: true,
      cap: null,
      scope: undefined,
    });
    expect(call.items).toEqual([
      { name: "Budi", phone: "081200002222", group: "Kantor", maxGuests: 10 },
      { name: "Ani", phone: "081200001111", group: null, maxGuests: 2 },
      { name: "", phone: "081200003333", group: null, maxGuests: 2 },
      { name: "", phone: null, group: null, maxGuests: 2 },
    ]);
    expect(call.makeToken()).toMatch(/^[a-z2-9]{10}$/);
    expect(mocks.revalidatePath).toHaveBeenCalledOnce();
  });
  it("does not revalidate when nothing was added and reports a failing transaction honestly", async () => {
    ownedInvitation(active);
    writer.mockResolvedValue({ aborted: false, statuses: ["duplicate"] });
    await expect(
      createGuestInvitesBulk("invitation-1", [
        { name: "A", phone: "081200001111" },
      ]),
    ).resolves.toEqual({ ok: true, added: 0, statuses: ["duplicate"] });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    ownedInvitation(active);
    writer.mockRejectedValue(new Error("db down"));
    await expect(
      createGuestInvitesBulk("invitation-1", [{ name: "A" }]),
    ).resolves.toMatchObject({ ok: false });
  });
  it("refuses without entitlement, ownership, or a sane batch, and never calls the writer", async () => {
    ownedInvitation({ ...active, plan: "basic", isPaid: true });
    await expect(
      createGuestInvitesBulk("invitation-1", [{ name: "A" }]),
    ).resolves.toMatchObject({ ok: false });
    for (const bad of [undefined, [], "x", Array(101).fill({ name: "A" })]) {
      ownedInvitation(active);
      await expect(
        createGuestInvitesBulk("invitation-1", bad),
      ).resolves.toMatchObject({ ok: false });
    }
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    });
    await expect(
      createGuestInvitesBulk("invitation-1", [{ name: "A" }]),
    ).rejects.toThrow("Undangan tidak ditemukan");
    expect(writer).not.toHaveBeenCalled();
  });
  it("does not log contact data on failure", async () => {
    const spies = [
      vi.spyOn(console, "error"),
      vi.spyOn(console, "log"),
      vi.spyOn(console, "warn"),
    ];
    ownedInvitation(active);
    writer.mockRejectedValue(new Error("boom"));
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
