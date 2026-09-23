import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mocks.select, update: mocks.update },
}));
vi.mock("@/lib/auth/helpers", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { moderateMessage } from "./moderation";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ user: { id: "owner-1" } });
});

describe("post-expiry owner management", () => {
  it("keeps guestbook moderation available to the owner", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [{ invitationId: "inv-1" }] }),
        }),
      }),
    });
    const set = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    mocks.update.mockReturnValue({ set });

    await expect(
      moderateMessage("message-1", "approve"),
    ).resolves.toBeUndefined();

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/invitations/inv-1");
  });
});
