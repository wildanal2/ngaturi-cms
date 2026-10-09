import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRsvp } from "./rsvp/use-rsvp";
import { useGuestbook } from "./guestbook/use-guestbook";

// Exercise the extracted handlers without adding a browser/DOM dependency.
// State and refs survive the explicit rerenders, as they do in both visual variants.
const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values))
      hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [
      hooks.values[index],
      (value: unknown) => {
        hooks.values[index] =
          typeof value === "function" ? value(hooks.values[index]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    hooks.values[index] ??= { current: initial };
    return hooks.values[index];
  },
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));

const NativeFormData = globalThis.FormData;
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function form() {
  const fields = new NativeFormData();
  for (const [key, value] of Object.entries({
    name: "Alya",
    status: "attending",
    guest_count: "2",
    message: "Selamat",
    _hp: "",
    "cf-turnstile-response": "test-response",
  }))
    fields.set(key, value);
  const reset = vi.fn();
  vi.stubGlobal(
    "FormData",
    vi.fn(function () {
      return fields;
    }),
  );
  return {
    fields,
    reset,
    event: {
      preventDefault: vi.fn(),
      currentTarget: { reset },
    } as unknown as FormEvent<HTMLFormElement>,
  };
}
function render<T>(run: () => T) {
  hooks.cursor = 0;
  return run();
}
beforeEach(() => {
  hooks.values = [];
  hooks.effects = [];
  hooks.cursor = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe("Generic and Cinematic public-form compatibility", () => {
  it.each(["rsvp", "guestbook"] as const)(
    "suppresses %s submissions in preview and without invitation identity",
    async (type) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const f = form();
      function useSubmission(id: string | undefined, preview: boolean) {
        const rsvp = useRsvp(id, preview);
        const guestbook = useGuestbook(id, "Alya", preview);
        return type === "rsvp" ? rsvp : guestbook;
      }
      await render(() => useSubmission("invitation", true)).onSubmit(f.event);
      await render(() => useSubmission(undefined, false)).onSubmit(f.event);
      expect(fetch).not.toHaveBeenCalled();
      expect(f.reset).not.toHaveBeenCalled();
    },
  );

  it("preserves RSVP payload, success reset, and attendance summary", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    const f = form();
    await render(() => useRsvp("invitation")).onSubmit(f.event);
    const current = render(() => useRsvp("invitation"));
    expect(current.state).toBe("done");
    expect(current.summary).toEqual({ status: "attending", count: "2" });
    expect(f.reset).toHaveBeenCalledOnce();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(
      Object.fromEntries(f.fields),
    );
    expect(fetch.mock.calls[0][0]).toBe("/api/public/invitation/rsvp");
  });

  it.each(["API", "network"])(
    "preserves RSVP values on %s failure and permits retry",
    async (kind) => {
      const fetch = vi.fn();
      if (kind === "API")
        fetch.mockResolvedValueOnce(response({ error: "Coba lagi" }, 400));
      else fetch.mockRejectedValueOnce(new Error("Coba lagi"));
      fetch.mockResolvedValueOnce(response({ ok: true }));
      vi.stubGlobal("fetch", fetch);
      const f = form();
      await render(() => useRsvp("invitation")).onSubmit(f.event);
      const failed = render(() => useRsvp("invitation"));
      expect(failed.state).toBe("error");
      expect(failed.error).toBe("Coba lagi");
      expect(f.fields.get("name")).toBe("Alya");
      expect(f.reset).not.toHaveBeenCalled();
      await failed.onSubmit(f.event);
      expect(render(() => useRsvp("invitation")).state).toBe("done");
      expect(f.reset).toHaveBeenCalledOnce();
    },
  );

  it.each(["rsvp", "guestbook"] as const)(
    "prevents duplicate %s requests while a submission is pending",
    async (type) => {
      let resolve!: (value: Response) => void;
      const fetch = vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      );
      vi.stubGlobal("fetch", fetch);
      const f = form();
      const hook = render(() =>
        type === "rsvp" ? useRsvp("invitation") : useGuestbook("invitation"),
      );
      const first = hook.onSubmit(f.event);
      const second = hook.onSubmit(f.event);
      expect(fetch).toHaveBeenCalledOnce();
      resolve(response({ ok: true }));
      await Promise.all([first, second]);
    },
  );

  it("preserves generic Guestbook pending notice and prepends approved messages", async () => {
    const message = {
      id: "approved",
      name: "Alya",
      message: "Selamat",
      createdAt: "2026-10-05",
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ pending: true }))
      .mockResolvedValueOnce(response({ message }));
    vi.stubGlobal("fetch", fetch);
    const f = form();
    await render(() => useGuestbook("invitation", "Alya")).onSubmit(f.event);
    const pending = render(() => useGuestbook("invitation", "Alya"));
    expect(pending.state).toBe("done");
    expect(pending.pendingNote).toBe(true);
    expect(pending.msgs).toEqual([]);
    expect(pending.name).toBe("");
    expect(pending.message).toBe("");
    await pending.onSubmit(f.event);
    const approved = render(() => useGuestbook("invitation", "Alya"));
    expect(approved.msgs).toEqual([message]);
    expect(approved.pendingNote).toBe(true); // Original generic notice remains latched.
    expect(fetch.mock.calls[0][0]).toBe("/api/public/invitation/guestbook");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(
      Object.fromEntries(f.fields),
    );
  });

  it("retains Guestbook input and returns to idle on API rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ error: "Belum terkirim" }, 400)),
    );
    const f = form();
    const hook = render(() => useGuestbook("invitation", "Alya"));
    hook.setMessage("Ucapan tetap tersimpan");
    await hook.onSubmit(f.event);
    const failed = render(() => useGuestbook("invitation", "Alya"));
    expect(failed.state).toBe("idle");
    expect(failed.name).toBe("Alya");
    expect(failed.message).toBe("Ucapan tetap tersimpan");
    expect(failed.msgs).toEqual([]);
  });

  it("keeps the full loaded Guestbook collection available for existing pagination and aborts on cleanup", async () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      name: "Tamu",
      message: "Selamat",
    }));
    const fetch = vi.fn().mockResolvedValue(response({ messages }));
    vi.stubGlobal("fetch", fetch);
    render(() => useGuestbook("invitation"));
    const cleanup = hooks.effects[0]();
    await vi.waitFor(() =>
      expect(render(() => useGuestbook("invitation")).msgs).toEqual(messages),
    );
    expect(fetch.mock.calls[0][0]).toBe("/api/public/invitation/guestbook");
    cleanup?.();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
