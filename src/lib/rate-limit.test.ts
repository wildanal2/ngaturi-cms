import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  incrementWithTtl: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: { incrementWithTtl: mocks.incrementWithTtl },
}));

import { rateLimit } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Redis-backed rate limiting", () => {
  it("uses one atomic increment-with-TTL decision", async () => {
    mocks.incrementWithTtl.mockResolvedValueOnce(5).mockResolvedValueOnce(6);

    await expect(rateLimit("guestbook:client", 5, 60)).resolves.toBe(true);
    await expect(rateLimit("guestbook:client", 5, 60)).resolves.toBe(false);
    expect(mocks.incrementWithTtl).toHaveBeenNthCalledWith(
      1,
      "rl:guestbook:client",
      60,
    );
  });

  it("fails closed when Redis is unavailable", async () => {
    mocks.incrementWithTtl.mockRejectedValue(new Error("redis unavailable"));

    await expect(rateLimit("rsvp:client", 5, 60)).rejects.toThrow(
      "redis unavailable",
    );
  });
});
