import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  presignPut: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/storage", () => ({
  presignPut: mocks.presignPut,
  publicUrl: vi.fn((key: string) => `https://cdn.example/${key}`),
}));

import { POST } from "./route";

function ownedInvitation(row: object) {
  mocks.getDb.mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [row] }),
      }),
    }),
  });
}

function request() {
  return new Request("http://localhost/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      invitationId: "00000000-0000-4000-8000-000000000001",
      filename: "photo.jpg",
      contentType: "image/jpeg",
      size: 1024,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.presignPut.mockResolvedValue("https://upload.example/signed");
});

describe("presign entitlement enforcement", () => {
  it("rejects presign after the trial edit boundary", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: false,
      editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      sections: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Masa edit gratis sudah berakhir.",
    });
    expect(mocks.presignPut).not.toHaveBeenCalled();
  });

  it("rejects Basic presign when the gallery is at its limit", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "basic",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
      sections: [
        {
          id: "gallery",
          type: "gallery",
          variant: "grid",
          order: 0,
          visible: true,
          props: {
            images: Array.from({ length: 30 }, (_, index) => ({
              url: `/photo-${index}.jpg`,
            })),
          },
        },
      ],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.presignPut).not.toHaveBeenCalled();
  });

  it("allows an active Premium-equivalent trial to presign", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: false,
      editExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
      sections: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.presignPut).toHaveBeenCalledOnce();
  });
});
