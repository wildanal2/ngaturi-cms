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

describe("Better Auth route wiring", () => {
  it("initializes both HTTP handlers without provider access", () => {
    expect(mocks.toNextJsHandler).toHaveBeenCalledWith(mocks.handler);
    expect(GET).toBe(mocks.get);
    expect(POST).toBe(mocks.post);
  });
});
