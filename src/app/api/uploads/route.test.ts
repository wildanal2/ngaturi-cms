import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  putObject: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/storage", () => ({
  isTrustedPublicUrl: vi.fn(() => true),
  publicUrl: vi.fn((key: string) => `https://cdn.example/${key}`),
  putObject: mocks.putObject,
}));
vi.mock("@/lib/runtime/context", () => ({
  getWorkerEnv: vi.fn(() => undefined),
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

function uploadRequest(kind: "image" | "audio") {
  const form = new FormData();
  form.set("invitationId", "00000000-0000-4000-8000-000000000001");
  form.set("kind", kind);
  form.set(
    "file",
    new File(["content"], kind === "audio" ? "song.mp3" : "photo.jpg", {
      type: kind === "audio" ? "audio/mpeg" : "image/jpeg",
    }),
  );
  return new Request("http://localhost/api/uploads", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
});

describe("upload entitlement enforcement", () => {
  it("rejects all new media after the trial edit boundary", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "free_trial",
      isPaid: false,
      isEditLocked: false,
      editExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      sections: [],
    });

    const response = await POST(uploadRequest("image"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Masa edit gratis sudah berakhir.",
    });
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("rejects new audio for Basic while preserving existing rendering", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "basic",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
      sections: [],
    });

    const response = await POST(uploadRequest("audio"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Upload musik baru memerlukan paket Premium.",
    });
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("rejects a new Basic image when the gallery is already at 30", async () => {
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

    const response = await POST(uploadRequest("image"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Paket Basic mendukung maksimal 30 foto galeri.",
    });
    expect(mocks.putObject).not.toHaveBeenCalled();
  });
});
