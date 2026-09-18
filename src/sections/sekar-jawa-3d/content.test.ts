import { describe, expect, it } from "vitest";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import type { SectionData } from "../types";
import {
  SEKAR_JAWA_3D_JOURNEY_SECTION_TYPES,
  sekarJawa3DContent,
} from "./content";

const preset = getTemplate("sekar-jawa-3d")!;
const sections = () => hydrateTemplateSections(preset);

describe("sekarJawa3DContent", () => {
  it("references every expected core section and derives the event date", () => {
    const input = sections();
    const content = sekarJawa3DContent(input);

    expect(Object.keys(content.journey)).toEqual([
      ...SEKAR_JAWA_3D_JOURNEY_SECTION_TYPES,
    ]);
    for (const section of Object.values(content.journey)) {
      expect(input).toContain(section);
    }
    const events = content.journey["event-details"]?.props.events as {
      date: string;
    }[];
    expect(content.eventDate).toBe(events[0].date);
  });

  it("fails safely when optional sections are missing or hidden", () => {
    const input = sections().filter((section) => section.type !== "story");
    const gallery = input.find((section) => section.type === "gallery")!;
    gallery.visible = false;

    const content = sekarJawa3DContent(input);

    expect(content.journey.story).toBeUndefined();
    expect(content.journey.gallery).toBeUndefined();
    expect(content.remaining).not.toContain(gallery);
  });

  it("consumes only the first occurrence and preserves duplicates", () => {
    const input = sections();
    const quote = input.find((section) => section.type === "quote")!;
    const duplicate: SectionData = {
      ...structuredClone(quote),
      id: "duplicate-quote",
      order: input.length,
      props: { ...quote.props, text: "Kutipan tambahan" },
    };
    input.push(duplicate);

    const content = sekarJawa3DContent(input);

    expect(content.journey.quote).toBe(quote);
    expect(content.remaining).toContain(duplicate);
    expect(content.remaining.filter((section) => section.id === duplicate.id)).toHaveLength(1);
  });
});
