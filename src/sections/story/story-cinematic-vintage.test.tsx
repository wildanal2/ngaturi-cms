import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { getVariant, variantDefaultProps } from "../registry";
import { cinematicContent, cinematicVariant } from "../cinematic/content";
import { cinematicDestinations } from "../cinematic/chrome";
import { CinematicComposition } from "../cinematic/composition";
import { useBuilder } from "@/stores/builder-store";
import { cinematicStoryItems } from "./cinematic-items";
import {
  canEditSectionVariant,
  canReorderSection,
  getCompositionPolicy,
} from "@/lib/templates/composition-policy";

const template = getTemplate("cinematic-vintage")!;
const sections = () => hydrateTemplateSections(template);
const render = (
  data = sections(),
  composition: "standard" | "cinematic-vintage" = "cinematic-vintage",
) =>
  renderToStaticMarkup(
    <InvitationRenderer
      sections={data}
      global={template.global_settings}
      composition={composition}
      isPreview
    />,
  );

describe("Cinematic Story", () => {
  it.each(["cinematic-vintage", "standard"] as const)(
    "keeps the Add Story defaults scoped to %s",
    (composition) => {
      const existing = sections().filter((s) => s.type !== "story");
      useBuilder
        .getState()
        .load({
          invitationId: "story-test",
          sections: existing,
          global: template.global_settings,
          locked: false,
          compositionPolicy: getCompositionPolicy({ composition }),
        });
      const before = JSON.stringify(useBuilder.getState().sections);
      useBuilder.getState().addSection("story", "timeline");
      const current = useBuilder.getState().sections;
      const added = current.find((s) => s.type === "story")!;
      expect(added.variant).toBe(
        composition === "standard" ? "timeline" : "cinematic-vintage",
      );
      expect(added.props.items).toHaveLength(
        composition === "standard" ? 3 : 0,
      );
      expect(JSON.stringify(current.filter((s) => s.type !== "story"))).toBe(
        before,
      );
      if (composition === "cinematic-vintage")
        expect(render(current)).not.toContain('data-section="story"');
    },
  );
  it("rebuilds topology for added/removed memories, while text edits keep the stage key", () => {
    const data = sections();
    const story = data.find((s) => s.type === "story")!;
    story.visible = true;
    story.props.items = [{ title: "Pertemuan" }];
    const key = () =>
      CinematicComposition({ sections: data, global: template.global_settings })
        .props.children[0].props.layoutKey;
    const first = key();
    story.props.items = [
      {
        title: "Pertemuan pertama kami",
        description: "Cerita yang diperbarui",
      },
    ];
    expect(key()).toBe(first);
    story.props.items = [
      { title: "Pertemuan" },
      { description: "Langkah berikutnya" },
    ];
    expect(key()).not.toBe(first);
    story.props.items = [{ title: "Pertemuan" }, { title: " " }];
    expect(key()).toBe(first);
  });
  it("reuses the schema and editable fields but starts hidden with no invented memories/photos", () => {
    const native = getVariant("story", "cinematic-vintage")!;
    const existing = getVariant("story", "timeline")!;
    expect(native.propsSchema).toBe(existing.propsSchema);
    expect(native.fields).toBe(existing.fields);
    expect(variantDefaultProps("story", "cinematic-vintage").items).toEqual([]);
    expect(variantDefaultProps("story", "timeline").items).toHaveLength(3);
    expect(sections().find((s) => s.type === "story")).toMatchObject({
      visible: false,
      props: { items: [] },
    });
    expect(render()).not.toContain('data-scene="story"');
  });
  it("omits enabled blank and date/photo-only entries without mutating stored content", () => {
    const data = sections();
    const story = data.find((s) => s.type === "story")!;
    story.visible = true;
    story.props.items = [
      null,
      {},
      { title: " ", description: "\n" },
      { year: "2026", image: "/memory.jpg" },
    ];
    const before = JSON.stringify(data);
    expect(cinematicContent(data).core.story).toBeUndefined();
    expect(cinematicContent(data).remaining).not.toContain(story);
    expect(cinematicContent(data).siblingTypes).not.toContain("story");
    expect(render(data)).not.toContain('data-section="story"');
    expect(JSON.stringify(data)).toBe(before);
  });
  it.each([1, 3, 7])(
    "renders all %i meaningful memories once in one chapter before Countdown",
    (count) => {
      const data = sections();
      const story = data.find((s) => s.type === "story")!;
      story.visible = true;
      story.props.items = Array.from({ length: count }, (_, i) => ({
        year: `${2020 + i}`,
        title: `Momen ${i}`,
        description: "Cerita singkat kami",
        ...(i % 2 ? { image: "/memory.jpg" } : {}),
      }));
      const markup = render(data);
      expect(markup.match(/data-section="story"/g)).toHaveLength(1);
      expect(markup.match(/data-story-memory/g)).toHaveLength(count);
      expect(markup.indexOf('data-section="quote"')).toBeLessThan(
        markup.indexOf('data-section="story"'),
      );
      expect(markup.indexOf('data-section="story"')).toBeLessThan(
        markup.indexOf('data-section="countdown"'),
      );
      expect(markup.match(/data-cinematic-stage=/g)).toHaveLength(2);
      const journey = cinematicDestinations(
        cinematicContent(data).siblingTypes,
      ).map((c) => c.type);
      expect(
        journey.slice(
          journey.indexOf("story") - 1,
          journey.indexOf("story") + 2,
        ),
      ).toEqual(["quote", "story", "countdown"]);
    },
  );
  it("supports description-only, title-only and long content without fallback narratives", () => {
    const items = [
      { description: "Cerita panjang ".repeat(100) },
      { title: "Sebuah nama momen yang panjang ".repeat(10) },
      { title: " " },
    ];
    expect(cinematicStoryItems(items)).toEqual(items.slice(0, 2));
    const data = sections();
    Object.assign(
      data.find((s) => s.type === "story")!,
      { visible: true, props: { items } },
    );
    expect(render(data)).toContain(items[0].description);
    expect(render(data)).toContain(items[1].title);
    const markup = render(data);
    expect(
      markup.slice(
        markup.indexOf('data-section="story"'),
        markup.indexOf('data-section="countdown"'),
      ),
    ).not.toContain("<img");
  });
  it("uses native legacy Story presentation only in the Cinematic renderer, keeping identity/content intact", () => {
    const data = sections();
    const story = data.find((s) => s.type === "story")!;
    Object.assign(story, {
      visible: true,
      variant: "timeline",
      props: { title: "Cerita kami", items: [{ title: "Pertemuan" }] },
    });
    const before = JSON.stringify(data);
    expect(cinematicVariant(story)).toBe("cinematic-vintage");
    expect(render(data)).toContain("data-story-memory");
    expect(render(data, "standard")).not.toContain("data-story-memory");
    expect(JSON.stringify(data)).toBe(before);
    const policy = getCompositionPolicy({ composition: "cinematic-vintage" });
    expect(canEditSectionVariant(policy, "story")).toBe(false);
    expect(canReorderSection(policy, "story")).toBe(false);
  });
  it("flows directly from Couple to Story when Quote is omitted", () => {
    const data = sections();
    data.find((s) => s.type === "quote")!.visible = false;
    Object.assign(
      data.find((s) => s.type === "story")!,
      { visible: true, props: { items: [{ title: "Pertemuan" }] } },
    );
    const journey = cinematicDestinations(
      cinematicContent(data).siblingTypes,
    ).map((c) => c.type);
    expect(journey.slice(1, 4)).toEqual(["couple-intro", "story", "countdown"]);
  });
});
