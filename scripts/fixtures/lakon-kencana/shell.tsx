/** Local native BuilderShell. All action POSTs MUST be mocked by the browser verifier. */
import { BuilderShell } from "@/components/builder/builder-shell";
import {
  getTemplate,
  TEMPLATES,
  resolveTemplateComposition,
} from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { getCompositionPolicy } from "@/lib/templates/composition-policy";
export default async function ShellFixture({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const template = getTemplate(query.template || "lakon-kencana")!;
  const sections = hydrateTemplateSections(template);
  // Both disposable builds use the same data even across midnight/server starts.
  for (const section of sections) {
    if (section.type === "hero") section.props.event_date = "2027-06-19";
    if (section.type === "countdown") section.props.target_date = "2027-06-19";
    if (section.type === "event-details" && Array.isArray(section.props.events))
      section.props.events = section.props.events.map((event) => ({
        ...event,
        date: "2027-06-19",
      }));
  }
  return (
    <div className="flex h-dvh flex-col">
      <BuilderShell
        invitationId="local-lakon-shell"
        slug="lakon-validation-public"
        status={query.status || "draft"}
        locked={query.locked === "1"}
        editExpiresAt={null}
        hasWatermark={false}
        initialSections={sections}
        initialGlobal={template.global_settings}
        compositionPolicy={getCompositionPolicy({
          composition: resolveTemplateComposition(template.id),
        })}
        activeTemplate={{ id: template.id, name: template.name }}
        templates={TEMPLATES.filter((t) => t.category === "wedding")}
        premiumFeatures
      />
    </div>
  );
}
