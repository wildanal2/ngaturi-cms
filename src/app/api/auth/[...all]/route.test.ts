import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  handler: vi.fn(),
  post: vi.fn(),
  toNextJsHandler: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: { handler: mocks.handler },
}));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: mocks.toNextJsHandler.mockReturnValue({
    GET: mocks.get,
    POST: mocks.post,
  }),
}));

import { GET, POST } from "./route";
import { runWithInvocationContext } from "@/lib/runtime/context";

describe("Better Auth route wiring", () => {
  it("defers both HTTP handlers until request time", () => {
    expect(mocks.toNextJsHandler).not.toHaveBeenCalled();
    expect(GET).toBeTypeOf("function");
    expect(POST).toBeTypeOf("function");
  });

  it("strips forged proxy identity before invoking Better Auth", async () => {
    mocks.get.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const req = new Request("https://dev.ngaturi.com/api/auth/get-session", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
        "x-ngaturi-trusted-client-ip": "192.0.2.99",
      },
    });
    await GET(req);
    const forwarded = mocks.get.mock.calls.at(-1)?.[0] as Request;
    expect(forwarded.headers.get("cf-connecting-ip")).toBeNull();
    expect(forwarded.headers.get("x-forwarded-for")).toBeNull();
    expect(forwarded.headers.get("x-ngaturi-trusted-client-ip")).toBeNull();
  });

  it("preserves OAuth POST bodies while sanitizing proxy headers", async () => {
    mocks.post.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await POST(
      new Request("https://dev.ngaturi.com/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.1",
        },
        body: JSON.stringify({ provider: "google" }),
      }),
    );
    const forwarded = mocks.post.mock.calls.at(-1)?.[0] as Request;
    expect(forwarded.headers.get("x-forwarded-for")).toBeNull();
    await expect(forwarded.json()).resolves.toEqual({ provider: "google" });
  });

  it("accepts a wrapped Next request without copying its private state", async () => {
    mocks.post.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const source = new Request(
      "https://dev.ngaturi.com/api/auth/sign-in/social",
      { method: "POST", body: JSON.stringify({ provider: "google" }) },
    );
    const wrapped = new Proxy(source, {
      get(target, key) {
        return Reflect.get(target, key, target);
      },
    });

    await POST(wrapped);
    const forwarded = mocks.post.mock.calls.at(-1)?.[0] as Request;
    await expect(forwarded.json()).resolves.toEqual({ provider: "google" });
  });

  it("passes the verified Cloudflare IP to Better Auth in a Worker invocation", async () => {
    mocks.get.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const req = new Request("https://dev.ngaturi.com/api/auth/get-session", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.1",
      },
    });
    await runWithInvocationContext({}, () => GET(req));
    const forwarded = mocks.get.mock.calls.at(-1)?.[0] as Request;
    expect(forwarded.headers.get("x-ngaturi-trusted-client-ip")).toBe(
      "203.0.113.10",
    );
    expect(forwarded.headers.get("x-forwarded-for")).toBeNull();
  });
});
