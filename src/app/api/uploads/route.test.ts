import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  getWorkerEnv: vi.fn(),
  putObject: vi.fn(),
  isTrustedPublicUrl: vi.fn(() => true),
}));

vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/storage", () => ({
  isTrustedPublicUrl: mocks.isTrustedPublicUrl,
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
    new File(
      [
        kind === "audio"
          ? "ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000"
          : "content",
      ],
      kind === "audio" ? "song.mp3" : "photo.jpg",
      {
        type: kind === "audio" ? "audio/mpeg" : "image/jpeg",
      },
    ),
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
  mocks.isTrustedPublicUrl.mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

function premiumInvitation() {
  ownedInvitation({
    id: "invitation-1",
    userId: "user-1",
    plan: "premium",
    isPaid: true,
    isEditLocked: false,
    editExpiresAt: null,
    sections: [],
  });
}

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

  it("rejects corrupt Node image bytes", async () => {
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

    expect(response.status).toBe(422);
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("processes a valid Node image to WebP and returns actual dimensions", async () => {
    premiumInvitation();
    const bytes = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: "red" },
    })
      .jpeg()
      .toBuffer();
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set(
      "file",
      new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }),
    );
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      width: 1920,
      height: 1280,
    });
    expect(mocks.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "image/webp" }),
    );
  });

  it("recrops a trusted image source through Node", async () => {
    premiumInvitation();
    const bytes = await sharp({
      create: { width: 400, height: 300, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(bytes)),
    );
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set("sourceUrl", "https://cdn.example.com/invitations/source.webp");
    form.set(
      "crop",
      JSON.stringify({ x: 100, y: 50, width: 200, height: 100 }),
    );
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      width: 200,
      height: 100,
    });
  });

  it("rejects mixed inputs, invalid crop, and untrusted source before a write", async () => {
    premiumInvitation();
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set("file", new File(["bad"], "photo.jpg", { type: "image/jpeg" }));
    form.set("sourceUrl", "https://cdn.example.com/other.webp");
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads", {
            method: "POST",
            body: form,
          }),
        )
      ).status,
    ).toBe(400);
    form.delete("file");
    form.set("crop", JSON.stringify({ x: 0, y: 0, width: -1, height: 2 }));
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads", {
            method: "POST",
            body: form,
          }),
        )
      ).status,
    ).toBe(400);
    form.delete("crop");
    mocks.isTrustedPublicUrl.mockReturnValue(false);
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads", {
            method: "POST",
            body: form,
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("rejects compressed image and audio beyond their separate limits", async () => {
    premiumInvitation();
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set(
      "file",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "photo.jpg", {
        type: "image/jpeg",
      }),
    );
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads", {
            method: "POST",
            body: form,
          }),
        )
      ).status,
    ).toBe(413);
    form.set("kind", "audio");
    form.set(
      "file",
      new File([new Uint8Array(15 * 1024 * 1024 + 1)], "song.mp3", {
        type: "audio/mpeg",
      }),
    );
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads", {
            method: "POST",
            body: form,
          }),
        )
      ).status,
    ).toBe(413);
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

  it("keeps Worker crop processing on IMAGES and MEDIA_BUCKET storage", async () => {
    premiumInvitation();
    const pipeline = {
      transform: vi.fn(),
      output: vi
        .fn()
        .mockResolvedValue({
          response: () => new Response(new Uint8Array([1, 2, 3])),
        }),
    };
    pipeline.transform.mockReturnValue(pipeline);
    const images = {
      info: vi
        .fn()
        .mockResolvedValueOnce({ width: 300, height: 200 })
        .mockResolvedValueOnce({ width: 20, height: 30 }),
      input: vi.fn(() => pipeline),
    };
    mocks.getWorkerEnv.mockReturnValue({ IMAGES: images });
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set(
      "file",
      new File(["content"], "photo.jpg", { type: "image/jpeg" }),
    );
    form.set(
      "crop",
      JSON.stringify({ x: 280, y: 170, width: 100, height: 100 }),
    );
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    expect(pipeline.transform).toHaveBeenCalledWith({
      trim: { left: 280, top: 170, width: 20, height: 30 },
    });
    await expect(response.json()).resolves.toMatchObject({
      width: 20,
      height: 30,
    });
    expect(mocks.putObject).toHaveBeenCalledOnce();
  });

  it("rejects GIF on the Worker path before invoking IMAGES", async () => {
    premiumInvitation();
    const images = { info: vi.fn(), input: vi.fn() };
    mocks.getWorkerEnv.mockReturnValue({ IMAGES: images });
    const form = new FormData();
    form.set("invitationId", "00000000-0000-4000-8000-000000000001");
    form.set(
      "file",
      new File(["GIF89a"], "animation.gif", { type: "image/gif" }),
    );
    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Gambar animasi tidak didukung.",
    });
    expect(images.info).not.toHaveBeenCalled();
  });
});
