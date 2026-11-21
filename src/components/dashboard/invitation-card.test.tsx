import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InvitationCard } from "./invitation-card";
import { TEMPLATES } from "@/lib/templates/catalog";
vi.mock("./inline-share", () => ({ InlineShare: () => null }));

function render(sourceTemplate: string | null) {
  return renderToStaticMarkup(
    <InvitationCard
      invitation={
        {
          id: "existing",
          slug: "existing",
          sourceTemplate,
          eventTitle: "Konten asli",
          eventType: "wedding",
          eventDate: null,
          status: "draft",
          plan: "free_trial",
        } as Parameters<typeof InvitationCard>[0]["invitation"]
      }
      appUrl="https://example.com"
    />,
  );
}
describe("existing invitation template previews", () => {
  it.each(["heritage-gate-motion", "missing-template"])(
    "uses the existing neutral fallback for %s",
    (id) => {
      const html = render(id);
      expect(html).not.toContain(`/templates/${id}/card`);
      expect(html).toContain("Belum ada pratinjau");
      expect(html).toContain("migrasi manual");
      expect(html).toContain("Konten asli");
      expect(html).toContain("/builder/existing");
    },
  );
  it("retains source-backed previews independently of database active status", () => {
    expect(render(TEMPLATES[0].id)).toContain(TEMPLATES[0].thumbnail);
    expect(render(TEMPLATES[0].id)).not.toContain("migrasi manual");
  });
  it("does not mark an invitation without a source as removed", () => {
    expect(render(null)).not.toContain("migrasi manual");
  });
});
