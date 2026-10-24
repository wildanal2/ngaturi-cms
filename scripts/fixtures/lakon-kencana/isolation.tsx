/** Native public-renderer fixture; copied only into disposable validation builds. */
import Link from "next/link";
import { InvitationRenderer } from "@/lib/invitation/renderer";
import { InvitationCover } from "@/components/invitation/cover";
import {
  getTemplate,
  resolveTemplateComposition,
} from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";

export default async function IsolationFixture({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const template = getTemplate(query.template || "sage-emas-klasik")!;
  const sections = hydrateTemplateSections(template);
  for (const section of sections) {
    if (section.type === "hero") section.props.event_date = "2027-06-19";
    if (section.type === "countdown") section.props.target_date = "2027-06-19";
    if (section.type === "event-details" && Array.isArray(section.props.events))
      section.props.events = section.props.events.map((event) => ({
        ...event,
        date: "2027-06-19",
      }));
    if (query.open === "1" && section.type === "cover") section.visible = false;
    if (section.type === "music")
      section.props = {
        ...section.props,
        audio_url: "/__fixture-tone.wav",
        autoplay: true,
      };
  }
  const global = { ...template.global_settings, animation: "none" as const };
  const composition = resolveTemplateComposition(template.id);
  const legacyCover =
    !sections.some((s) => s.type === "cover") && query.open !== "1";
  const opening = legacyCover ? (
    <InvitationCover
      names={template.name}
      global={global}
      guestName="Tamu Fixture"
    />
  ) : undefined;
  return (
    <>
      <Link
        data-fixture-switch
        href="/isolation-validation?template=sage-emas-klasik&open=1"
      >
        Ganti fixture lokal
      </Link>
      {composition !== "cinematic-vintage" ? opening : null}
      <InvitationRenderer
        sections={sections}
        global={global}
        composition={composition}
        invitationId="local-isolation-fixture"
        guestName="Tamu Fixture"
        opening={composition === "cinematic-vintage" ? opening : undefined}
      />
    </>
  );
}
