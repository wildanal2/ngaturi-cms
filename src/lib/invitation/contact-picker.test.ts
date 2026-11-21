import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contactPhoneKey,
  getContactPicker,
  isDuplicateContactPhone,
  pickGuestContact,
} from "./contact-picker";

afterEach(() => vi.unstubAllGlobals());

function browser(contacts: unknown, secure = true, topLevel = true) {
  const window = { isSecureContext: secure, top: null as unknown };
  window.top = topLevel ? window : {};
  vi.stubGlobal("window", window);
  vi.stubGlobal("navigator", { contacts });
}

describe("single guest contact picker", () => {
  it("is safe on the server and when the browser has no API", () => {
    vi.stubGlobal("window", undefined);
    expect(getContactPicker()).toBeNull();
    browser(undefined);
    expect(getContactPicker()).toBeNull();
    browser({ select: false });
    expect(getContactPicker()).toBeNull();
  });
  it("detects the native API only in a secure top-level page", () => {
    const picker = { select: vi.fn() };
    browser(picker);
    expect(getContactPicker()).toBe(picker);
    expect(picker.select).not.toHaveBeenCalled();
    browser(picker, false);
    expect(getContactPicker()).toBeNull();
    browser(picker, true, false);
    expect(getContactPicker()).toBeNull();
  });
  it("requests only name and tel synchronously, keeping the API receiver and single selection", async () => {
    const picker = {
      select: vi.fn(function (this: unknown) {
        expect(this).toBe(picker);
        return Promise.resolve([
          { name: [" Budi Santoso "], tel: ["+62 812-345"] },
        ]);
      }),
    };
    const pending = pickGuestContact(picker);
    expect(picker.select).toHaveBeenCalledWith(["name", "tel"], {
      multiple: false,
    });
    await expect(pending).resolves.toEqual({
      name: "Budi Santoso",
      phones: ["+62 812-345"],
    });
  });
  it("returns multiple distinct numbers for explicit choice", async () => {
    const picker = {
      select: vi
        .fn()
        .mockResolvedValue([
          { name: ["Budi"], tel: ["0812-345", "+62 812345", "0813-456", " "] },
        ]),
    };
    await expect(pickGuestContact(picker)).resolves.toEqual({
      name: "Budi",
      phones: ["0812-345", "0813-456"],
    });
  });
  it.each([{}, { name: [], tel: [] }, { name: [" "], tel: [" ", "---"] }])(
    "handles missing name and phone without blocking manual entry: %j",
    async (contact) => {
      await expect(
        pickGuestContact({ select: vi.fn().mockResolvedValue([contact]) }),
      ).resolves.toEqual({ name: "", phones: [] });
    },
  );
  it("handles name-only and phone-only contacts", async () => {
    await expect(
      pickGuestContact({
        select: vi.fn().mockResolvedValue([{ name: ["Budi"] }]),
      }),
    ).resolves.toEqual({ name: "Budi", phones: [] });
    await expect(
      pickGuestContact({
        select: vi.fn().mockResolvedValue([{ tel: ["0812"] }]),
      }),
    ).resolves.toEqual({ name: "", phones: ["0812"] });
  });
  it("returns null on empty selection or cancellation", async () => {
    await expect(
      pickGuestContact({ select: vi.fn().mockResolvedValue([]) }),
    ).resolves.toBeNull();
    await expect(
      pickGuestContact({
        select: vi.fn().mockRejectedValue({ name: "AbortError" }),
      }),
    ).resolves.toBeNull();
  });
  it("propagates permission and API errors for a clear UI notification", async () => {
    for (const name of [
      "NotAllowedError",
      "SecurityError",
      "InvalidStateError",
      "TypeError",
    ]) {
      const error = { name };
      await expect(
        pickGuestContact({ select: vi.fn().mockRejectedValue(error) }),
      ).rejects.toBe(error);
    }
  });
  it("compares duplicates using the existing WhatsApp normalization without mutating numbers", () => {
    const existing = [null, "+62 812-345", "0856 789"];
    expect(contactPhoneKey("0812-345")).toBe("62812345");
    expect(isDuplicateContactPhone("0812345", existing)).toBe(true);
    expect(isDuplicateContactPhone("62812345", existing)).toBe(true);
    expect(isDuplicateContactPhone("+62 856789", existing)).toBe(true);
    expect(isDuplicateContactPhone("0813999", existing)).toBe(false);
    expect(isDuplicateContactPhone("---", existing)).toBe(false);
    expect(existing).toEqual([null, "+62 812-345", "0856 789"]);
  });
});
