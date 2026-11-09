import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { GET } from "./route";
import { TEMPLATES } from "@/lib/templates/catalog";

const assets = {
  "lakon-kencana": "/themes/lakon-kencana/thumbnail.webp",
  "gerbang-puspa": "/themes/gerbang-puspa/stationery-background.svg",
  "serambi-delima": "/themes/serambi-delima/thumbnail.svg",
};

describe("template thumbnail redirects", () => {
  for (const [id, asset] of Object.entries(assets)) {
    it(`${id} stays on the browser origin behind a reverse proxy`, async () => {
      const response = await GET(
        new Request(`http://container:8080/templates/${id}/card`),
        {
          params: Promise.resolve({ id }),
        },
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(asset);
      expect(
        new URL(response.headers.get("location")!, "https://public.example")
          .origin,
      ).toBe("https://public.example");
      expect(existsSync(path.join(process.cwd(), "public", asset))).toBe(true);
      expect(TEMPLATES.find((t) => t.id === id)?.thumbnail).toBe(
        `/templates/${id}/card`,
      );
    });
  }

  it("keeps unknown templates observable as 404", async () => {
    const response = await GET(
      new Request("http://container:8080/templates/missing/card"),
      {
        params: Promise.resolve({ id: "missing" }),
      },
    );
    expect(response.status).toBe(404);
  });
});
