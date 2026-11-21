import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMusicCatalog: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/music/queries", () => ({
  getMusicCatalog: mocks.getMusicCatalog,
}));
const env = vi.hoisted(() => ({
  JAMENDO_CLIENT_ID: undefined as string | undefined,
}));
vi.mock("@/lib/env", () => ({ env }));

import { GET } from "./route";

type Provider = "deezer" | "itunes" | "audius" | "jamendo";
function stubProviders(bodies: Partial<Record<Provider, unknown | Error>>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const host = new URL(String(input)).hostname;
    const key: Provider = host.includes("deezer")
      ? "deezer"
      : host.includes("itunes")
        ? "itunes"
        : host.includes("jamendo")
          ? "jamendo"
          : "audius";
    const body = bodies[key] ?? {};
    if (body instanceof Error) throw body;
    return Response.json(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const search = async (q = "akad") =>
  (await GET(new Request(`http://localhost/api/music/search?q=${q}`))).json();

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getMusicCatalog.mockResolvedValue([]);
});
afterEach(() => {
  env.JAMENDO_CLIENT_ID = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/music/search", () => {
  // Regression (#18 QA): Audius search lists deleted tracks (stream 404
  // "track not found") and gated tracks (403 "track not streamable").
  it("never offers Audius tracks that cannot be streamed", async () => {
    stubProviders({
      audius: {
        data: [
          {
            id: "ok1",
            title: "Playable",
            is_streamable: true,
            access: { stream: true },
          },
          {
            id: "del",
            title: "Deleted",
            is_delete: true,
            is_streamable: false,
            access: { stream: true },
          },
          {
            id: "gate",
            title: "Gated",
            is_streamable: true,
            access: { stream: false },
          },
          { id: "off", title: "Not streamable", is_streamable: false },
        ],
      },
    });
    const body = await search();
    expect(body.results.map((t: { id: string }) => t.id)).toEqual([
      "audius:ok1",
    ]);
    expect(body.results[0]).toMatchObject({
      audioUrl: "https://api.audius.co/v1/tracks/ok1/stream?app_name=ngaturi",
      format: "audio/mpeg",
    });
  });

  // Regression (#18): signed Deezer previews expire ~15 minutes after search.
  it("returns the stable Deezer endpoint, never the expiring signed preview", async () => {
    stubProviders({
      deezer: {
        data: [
          {
            id: 434950412,
            title: "Akad",
            preview:
              "https://cdnt-preview.dzcdn.net/api/1/1/x.mp3?hdnea=exp=1795177127~hmac=abc",
            artist: { name: "Payung Teduh" },
          },
          {
            id: "../../evil",
            title: "Bad id",
            preview: "https://cdnt-preview.dzcdn.net/y.mp3",
          },
          { id: 5, title: "No preview" },
        ],
      },
    });
    const body = await search();
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      id: "deezer:434950412",
      audioUrl: "/api/music/deezer/434950412",
      format: "audio/mpeg",
    });
    expect(JSON.stringify(body)).not.toContain("hdnea");
  });

  it("labels iTunes previews as AAC so unsupported browsers can hide them", async () => {
    stubProviders({
      itunes: {
        results: [
          {
            trackId: 1,
            trackName: "Akad",
            artistName: "Payung Teduh",
            previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
          },
        ],
      },
    });
    const body = await search();
    expect(body.results[0]).toMatchObject({
      source: "itunes",
      format: 'audio/mp4; codecs="mp4a.40.2"',
    });
  });

  it("reports failing providers while keeping results from the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubProviders({
      deezer: new Error("deezer down"),
      audius: { data: [{ id: "ok1", title: "Playable" }] },
    });
    const body = await search();
    expect(body.unavailable).toEqual(["Deezer"]);
    expect(body.sources).toEqual(["Audius"]);
    expect(body.results).toHaveLength(1);
  });

  it("reports Jamendo as unavailable when its API fails inside HTTP 200", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    env.JAMENDO_CLIENT_ID = "test-client";
    stubProviders({
      jamendo: {
        headers: { status: "failed", code: 5, error_message: "invalid client" },
        results: [],
      },
    });
    const body = await search();
    expect(body.unavailable).toEqual(["Jamendo"]);
  });
});
