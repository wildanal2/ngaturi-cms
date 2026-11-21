import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  select: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/auth/helpers", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/lib/redis", () => ({
  redis: { get: mocks.get, set: mocks.set, delete: mocks.delete },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  getWhatsappTemplate,
  resetWhatsappTemplate,
  saveWhatsappTemplate,
} from "./whatsapp-message-actions";
import { DEFAULT_WHATSAPP_MESSAGE } from "./whatsapp-message";

const rows = [
  {
    id: "inv-1",
    userId: "user-a",
    plan: "premium",
    isPaid: true,
    editExpiresAt: null,
  },
  {
    id: "inv-2",
    userId: "user-a",
    plan: "premium",
    isPaid: true,
    editExpiresAt: null,
  },
  {
    id: "inv-b",
    userId: "user-b",
    plan: "premium",
    isPaid: true,
    editExpiresAt: null,
  },
];
const store = new Map<string, string>();
const custom = "Halo {nama_tamu} 🌸\n{link_undangan}";

beforeEach(() => {
  vi.resetAllMocks();
  store.clear();
  rows[0].plan = "premium";
  mocks.requireUser.mockResolvedValue({ user: { id: "user-a" } });
  mocks.select.mockReturnValue({
    from: () => ({
      where: (condition: Parameters<PgDialect["sqlToQuery"]>[0]) => ({
        limit: async () => {
          const query = new PgDialect().sqlToQuery(condition);
          expect(query.sql).toContain('"invitations"."user_id"');
          const [id, userId] = query.params;
          return rows.filter((row) => row.id === id && row.userId === userId);
        },
      }),
    }),
  });
  mocks.get.mockImplementation(async (key) => store.get(key) ?? null);
  mocks.set.mockImplementation(async (key, value) => {
    store.set(key, value);
  });
  mocks.delete.mockImplementation(async (key) => {
    store.delete(key);
  });
});

describe("authorized Redis WhatsApp templates", () => {
  it("reads defaults without writing, saves without TTL, reloads and resets by deletion", async () => {
    expect(await getWhatsappTemplate("inv-1")).toEqual({
      message: DEFAULT_WHATSAPP_MESSAGE,
      source: "default",
      isCustom: false,
    });
    expect(mocks.set).not.toHaveBeenCalled();
    expect(await saveWhatsappTemplate("inv-1", custom)).toMatchObject({
      ok: true,
    });
    expect(mocks.set).toHaveBeenCalledWith(
      "ngaturi:whatsapp:message:v1:user-a:inv-1",
      custom,
    );
    expect(await getWhatsappTemplate("inv-1")).toEqual({
      message: custom,
      source: "custom",
      isCustom: true,
    });
    expect(await resetWhatsappTemplate("inv-1")).toMatchObject({
      ok: true,
      template: { message: DEFAULT_WHATSAPP_MESSAGE },
    });
    expect(store.size).toBe(0);
    expect(await getWhatsappTemplate("inv-1")).toMatchObject({
      isCustom: false,
    });
    expect(mocks.set).toHaveBeenCalledTimes(1);
  });
  it("isolates invitations belonging to the same user", async () => {
    await saveWhatsappTemplate("inv-1", custom);
    await saveWhatsappTemplate("inv-2", "Undangan kedua {link_undangan}");
    expect((await getWhatsappTemplate("inv-1")).message).toBe(custom);
    expect((await getWhatsappTemplate("inv-2")).message).toBe(
      "Undangan kedua {link_undangan}",
    );
  });
  it("never writes the source default into Redis, including an explicit save", async () => {
    await saveWhatsappTemplate("inv-1", custom);
    mocks.set.mockClear();
    expect(
      await saveWhatsappTemplate("inv-1", DEFAULT_WHATSAPP_MESSAGE),
    ).toMatchObject({ ok: true, template: { isCustom: false } });
    expect(mocks.set).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });
  it("keeps saved custom messages after trial expires", async () => {
    await saveWhatsappTemplate("inv-1", custom);
    rows[0].plan = "free_trial";
    // A free_trial row without an edit deadline is locked by the existing policy.
    rows[0].isPaid = false;
    try {
      expect(
        await saveWhatsappTemplate("inv-1", "New {link_undangan}"),
      ).toMatchObject({ ok: false });
      expect((await getWhatsappTemplate("inv-1")).message).toBe(custom);
      expect(store.size).toBe(1);
      expect(await resetWhatsappTemplate("inv-1")).toMatchObject({ ok: true });
    } finally {
      rows[0].isPaid = true;
    }
  });
  it("rejects another owner's ID for all operations before accessing Redis", async () => {
    await expect(getWhatsappTemplate("inv-b")).rejects.toThrow(
      "Undangan tidak ditemukan",
    );
    await expect(saveWhatsappTemplate("inv-b", custom)).rejects.toThrow(
      "Undangan tidak ditemukan",
    );
    await expect(resetWhatsappTemplate("inv-b")).rejects.toThrow(
      "Undangan tidak ditemukan",
    );
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });
  it("requires a server session on every operation", async () => {
    mocks.requireUser.mockRejectedValue(new Error("redirect:/login"));
    await expect(getWhatsappTemplate("inv-1")).rejects.toThrow(
      "redirect:/login",
    );
    await expect(saveWhatsappTemplate("inv-1", custom)).rejects.toThrow(
      "redirect:/login",
    );
    await expect(resetWhatsappTemplate("inv-1")).rejects.toThrow(
      "redirect:/login",
    );
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("rejects invalid templates before writes", async () => {
    for (const message of [
      "",
      " \n",
      "x".repeat(2001),
      "No link",
      "{bad} {link_undangan}",
    ]) {
      expect(await saveWhatsappTemplate("inv-1", message)).toMatchObject({
        ok: false,
      });
    }
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("reports write/delete failures and falls back on read failures without overwriting custom", async () => {
    await saveWhatsappTemplate("inv-1", custom);
    mocks.set.mockRejectedValue(new Error("secret internal detail"));
    expect(await saveWhatsappTemplate("inv-1", "New {link_undangan}")).toEqual({
      ok: false,
      error: "Gagal menyimpan pesan. Silakan coba lagi.",
    });
    mocks.delete.mockRejectedValue(new Error("secret internal detail"));
    expect(await resetWhatsappTemplate("inv-1")).toMatchObject({ ok: false });
    mocks.get.mockRejectedValue(new Error("secret internal detail"));
    expect(await getWhatsappTemplate("inv-1")).toMatchObject({
      message: DEFAULT_WHATSAPP_MESSAGE,
      isCustom: false,
      readError: expect.any(String),
    });
    expect(store.get("ngaturi:whatsapp:message:v1:user-a:inv-1")).toBe(custom);
  });
  it("blocks new custom saves for Basic but keeps existing templates and explicit reset", async () => {
    await saveWhatsappTemplate("inv-1", custom);
    rows[0].plan = "basic";
    expect(
      await saveWhatsappTemplate("inv-1", "New {link_undangan}"),
    ).toMatchObject({ ok: false });
    expect((await getWhatsappTemplate("inv-1")).message).toBe(custom);
    expect(await resetWhatsappTemplate("inv-1")).toMatchObject({ ok: true });
  });
});
