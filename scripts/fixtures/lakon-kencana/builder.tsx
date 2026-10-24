"use client";
/** Actual Canvas, Inspector, SectionList and store, without auth/autosave/network writes. */
import { useEffect } from "react";
import { Canvas } from "@/components/builder/canvas";
import { Inspector } from "@/components/builder/inspector";
import { SectionList } from "@/components/builder/section-list";
import { useBuilder } from "@/stores/builder-store";
import { getTemplate } from "@/lib/templates/catalog";
import { hydrateTemplateSections } from "@/lib/templates/hydrate";
import { getCompositionPolicy } from "@/lib/templates/composition-policy";
export default function BuilderFixture() {
  const ready = useBuilder((s) => s.invitationId === "local-builder-fixture");
  const selected = useBuilder((s) => s.selectedId);
  const sections = useBuilder((s) => s.sections);
  const dirty = useBuilder((s) => s.dirty);
  useEffect(() => {
    const template = getTemplate("lakon-kencana")!;
    useBuilder.getState().load({
      invitationId: "local-builder-fixture",
      sections: hydrateTemplateSections(template),
      global: template.global_settings,
      locked: false,
      premiumFeatures: true,
      compositionPolicy: getCompositionPolicy({ composition: "standard" }),
    });
  }, []);
  if (!ready) return <p>Menyiapkan Builder lokal…</p>;
  return (
    <div>
      <header
        style={{ padding: 12, display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <span>Fixture Builder lokal</span>
        <button
          data-fixture-device="phone"
          onClick={() => useBuilder.getState().setDevice("iphone-se")}
        >
          Ponsel
        </button>
        <button
          data-fixture-device="desktop"
          onClick={() => useBuilder.getState().setDevice("desktop")}
        >
          Desktop
        </button>
        <output data-fixture-dirty>{dirty ? "dirty" : "clean"}</output>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(130px,200px) minmax(0,1fr) minmax(220px,300px)",
          height: "92vh",
        }}
      >
        <aside style={{ padding: 12, overflow: "auto" }} data-fixture-sections>
          <SectionList />
          {sections.map((s) => (
            <button
              key={s.id}
              data-fixture-select={s.type}
              onClick={() => useBuilder.getState().select(s.id)}
              style={{ display: "block", fontSize: 11, padding: 4 }}
            >
              {s.type}
            </button>
          ))}
        </aside>
        <main style={{ overflow: "auto" }}>
          <Canvas invitationId="local-builder-fixture" />
        </main>
        <aside style={{ padding: 16, overflow: "auto" }} data-fixture-inspector>
          <Inspector
            invitationId="local-builder-fixture"
            activeTemplateName="Lakon Kencana"
            onChangeTemplate={() => {}}
            changeTemplatePending={false}
          />
          <output data-fixture-selected>{selected}</output>
        </aside>
      </div>
    </div>
  );
}
