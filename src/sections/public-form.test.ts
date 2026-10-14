import { afterEach, describe, expect, it, vi } from "vitest";
import { postInvitationForm } from "./public-form";

afterEach(() => vi.unstubAllGlobals());
describe("Shared public form transport", () => {
  it.each(["rsvp", "guestbook"] as const)(
    "preserves existing %s payload fields, including spam controls",
    async (capability) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ pending: true }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const fields = new FormData();
      for (const [key, value] of Object.entries({
        name: "Alya",
        status: "attending",
        guest_count: "2",
        message: "Selamat",
        _hp: "",
        "cf-turnstile-response": "test-response",
      }))
        fields.set(key, value);
      expect(
        await postInvitationForm("invitation", capability, fields),
      ).toEqual({ pending: true });
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/public/invitation/${capability}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(fields)),
        },
      );
    },
  );
  it("surfaces the existing API error and leaves the original form data intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Konfirmasi belum dapat diterima" }),
            { status: 400 },
          ),
        ),
    );
    const fields = new FormData();
    fields.set("name", "Nama tetap tersimpan");
    await expect(
      postInvitationForm("invitation", "rsvp", fields),
    ).rejects.toThrow("Konfirmasi belum dapat diterima");
    expect(fields.get("name")).toBe("Nama tetap tersimpan");
  });
  it("propagates network failure for a recoverable form error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network unavailable")),
    );
    await expect(
      postInvitationForm("invitation", "guestbook", new FormData()),
    ).rejects.toThrow("Network unavailable");
  });
});
