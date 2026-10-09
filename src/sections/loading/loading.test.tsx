import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getBuilderFlow } from "@/components/builder/canvas";
import { getTemplate } from "@/lib/templates/catalog";
import {
  hydrateTemplateSections,
  mergeInvitationIntoTemplate,
} from "@/lib/templates/hydrate";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { getVariant, variantDefaultProps } from "../registry";
import { cinematicDestinations } from "../cinematic/chrome";
import { cinematicContent } from "../cinematic/content";
import {
  getCompositionPolicy,
  canReorderSection,
} from "@/lib/templates/composition-policy";
import { resolveLoading } from "./resolve";

const template = getTemplate("cinematic-vintage")!;
const data = () => hydrateTemplateSections(template);
const render = (
  sections = data(),
  composition: "standard" | "cinematic-vintage" = "cinematic-vintage",
) =>
  renderToStaticMarkup(
    <InvitationRenderer
      sections={sections}
      global={template.global_settings}
      composition={composition}
      isPreview
    />,
  );
describe("Loading section integration", () => {
  it("registers editable native defaults and begins before Cover without becoming a chapter", () => {
    expect(
      getVariant("loading", "cinematic-vintage")?.propsSchema.safeParse(
        variantDefaultProps("loading", "cinematic-vintage"),
      ).success,
    ).toBe(true);
    expect(
      data()
        .slice(0, 2)
        .map((s) => s.type),
    ).toEqual(["loading", "cover"]);
    const html = render();
    expect(html).toContain("data-loading-screen");
    expect(html).toContain('data-loading-state="pending"');
    expect(html).toContain('inert=""');
    expect(html).not.toContain('data-section="loading"');
    expect(html).not.toContain('data-scene="loading"');
    expect(
      cinematicDestinations(data().map((s) => s.type)).map((s) => s.type),
    ).not.toContain("loading");
    expect(
      canReorderSection(
        getCompositionPolicy({ composition: "cinematic-vintage" }),
        "loading",
      ),
    ).toBe(false);
  });
  it("provides legacy render-time compatibility without mutating stored sections", () => {
    const legacy = data().filter((s) => s.type !== "loading");
    const before = JSON.stringify(legacy);
    expect(resolveLoading(legacy, "cinematic-vintage")?.variant).toBe(
      "cinematic-vintage",
    );
    expect(render(legacy)).toContain("data-loading-screen");
    expect(JSON.stringify(legacy)).toBe(before);
    expect(cinematicContent(legacy, true).core).toEqual(
      cinematicContent(data(), true).core,
    );
  });
  it("respects explicit hidden rows; standard invitations do not acquire loading", () => {
    const sections = data();
    sections[0].visible = false;
    expect(resolveLoading(sections, "cinematic-vintage")).toBeNull();
    expect(render(sections)).not.toContain("data-loading-screen");
    expect(
      render(
        sections.filter((s) => s.type !== "loading"),
        "standard",
      ),
    ).not.toContain("data-loading-screen");
  });
  it("does not carry the Loading presentation into a template without the capability", () => {
    const source = data();
    source[0].props.message = "Kisah kami segera hadir";
    const before = JSON.stringify(source);
    const target = getTemplate("sage-emas-klasik")!;
    const switched = mergeInvitationIntoTemplate(source, template, target);
    expect(switched.some((section) => section.type === "loading")).toBe(false);
    expect(resolveLoading(switched, "standard")).toBeNull();
    const same = mergeInvitationIntoTemplate(source, template, template);
    expect(same[0].props.message).toBe("Kisah kami segera hadir");
    expect(JSON.stringify(source)).toBe(before);
  });
  it("keeps Loading out of the Builder chapter flow and leaves standard flow unchanged", () => {
    const sections = data();
    const flow = getBuilderFlow(sections, "cinematic-vintage");
    expect(
      flow.some(
        (section) => section.type === "loading" || section.type === "cover",
      ),
    ).toBe(false);
    expect(getBuilderFlow(sections, "standard")).toBe(sections);
  });
  it("renders a static Builder sample even outside an active loading context", () => {
    const Component = getVariant("loading", "cinematic-vintage")!.component;
    const html = renderToStaticMarkup(
      <Component
        props={{ message: "Kami segera hadir" }}
        global={template.global_settings}
        isPreview
        inCanvas
      />,
    );
    expect(html).toContain("data-loading-screen");
    expect(html).toContain("Kami segera hadir");
    expect(html).not.toContain('tabindex="-1"');
    expect(html).not.toContain('inert=""');
  });
  it("keeps the first Hero eager while later portraits stay lazy", () => {
    const html = render();
    const hero = html.slice(
      html.indexOf("data-hero-photo"),
      html.indexOf("data-cinematic-opening-focus"),
    );
    expect(hero).toContain('loading="eager"');
    const couple = html.slice(
      html.indexOf('data-scene="couple"'),
      html.indexOf('data-scene="quote"'),
    );
    expect(couple).toContain('loading="lazy"');
  });
});
