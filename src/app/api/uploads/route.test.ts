import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  getWorkerEnv: vi.fn(),
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
  getWorkerEnv: mocks.getWorkerEnv,
}));

import { POST } from "./route";

function ownedInvitation(row: object) {
  mocks.getDb.mockReturnValue({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [row] }),
      }),
    }),
    insert: () => ({ values: async () => undefined }),
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
  mocks.getWorkerEnv.mockReturnValue(undefined);
  mocks.putObject.mockResolvedValue(undefined);
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

  it("fails explicitly when Node receives an eligible image upload", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "premium",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
      sections: [],
    });

    const response = await POST(uploadRequest("image"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Pemrosesan gambar hanya tersedia di runtime Cloudflare Worker.",
      code: "image_processing_unavailable",
    });
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("keeps eligible Node audio uploads on the S3-compatible path", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "premium",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
      sections: [],
    });

    const response = await POST(uploadRequest("audio"));

    expect(response.status).toBe(200);
    expect(mocks.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^invitations\/00000000-0000-4000-8000-000000000001\/audio\/[a-f0-9-]+\.mp3$/,
        ),
        contentType: "audio/mpeg",
      }),
    );
  });

  it("processes an eligible image through the Worker IMAGES path", async () => {
    ownedInvitation({
      id: "invitation-1",
      userId: "user-1",
      plan: "premium",
      isPaid: true,
      isEditLocked: false,
      editExpiresAt: null,
      sections: [],
    });
    const pipeline = {
      transform: vi.fn(),
      output: vi.fn().mockResolvedValue({
        response: () => new Response(new Uint8Array([1, 2, 3])),
      }),
    };
    pipeline.transform.mockReturnValue(pipeline);
    const images = {
      info: vi
        .fn()
        .mockResolvedValueOnce({ width: 2400, height: 1600 })
        .mockResolvedValueOnce({ width: 1920, height: 1280 }),
      input: vi.fn(() => pipeline),
    };
    mocks.getWorkerEnv.mockReturnValue({ IMAGES: images });

    const response = await POST(uploadRequest("image"));

    expect(response.status).toBe(200);
    expect(images.input).toHaveBeenCalledOnce();
    expect(pipeline.transform).toHaveBeenCalledWith({
      width: 1920,
      height: 1920,
      fit: "scale-down",
    });
    expect(pipeline.output).toHaveBeenCalledWith({
      format: "image/webp",
      quality: 82,
    });
    expect(mocks.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^invitations\/00000000-0000-4000-8000-000000000001\/[a-f0-9-]+\.webp$/,
        ),
        contentType: "image/webp",
      }),
    );
  });
});
