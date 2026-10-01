"use client";

import { useEffect, useRef } from "react";
import { useBuilder } from "@/stores/builder-store";
import { getVariant, SectionRegistry } from "@/sections/registry";
import type { SectionData } from "@/sections/types";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import type { TemplateComposition } from "@/lib/templates/catalog";
import { AddSectionButton } from "./add-section-menu";
import { DeviceFrame } from "./device-frame";
import { getDevice } from "./devices";
import { CinematicComposition } from "@/sections/cinematic/composition";
import { cinematicContent } from "@/sections/cinematic/content";
import { SekarJawa3DComposition } from "@/sections/sekar-jawa-3d/composition";
import { sekarJawa3DContent } from "@/sections/sekar-jawa-3d/content";

const OVERLAY_TYPES = new Set(["music", "navigation"]);

export function getBuilderFlow(
  ordered: SectionData[],
  composition: TemplateComposition,
) {
  switch (composition) {
    case "standard":
      return ordered;
    case "cinematic-vintage":
      return cinematicContent(ordered, true).remaining.filter(
        (section) => section.type !== "cover",
      );
    case "sekar-jawa-3d":
      return sekarJawa3DContent(ordered).remaining;
  }
}

export function Canvas({ invitationId }: { invitationId: string }) {
  const sections = useBuilder((s) => s.sections);
  const global = useBuilder((s) => s.global);
  const preset = getDevice(useBuilder((s) => s.deviceId));
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);
  const composition = useBuilder((s) => s.compositionPolicy.composition);
  const cinematicVintage = composition === "cinematic-vintage";
  const sekarJawa3D = composition === "sekar-jawa-3d";
  const scrollRef = useRef<HTMLDivElement>(null);
  const clickInCanvas = useRef(false);

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const siblingTypes = ordered.map((s) => s.type);
  const flow = getBuilderFlow(ordered, composition);
  // music + navigation float over the device viewport (pinned, non-scrolling)
  // exactly like the live page. In the section flow they get a slim
  // placeholder block so they stay visible & selectable.
  const overlaySections = ordered.filter((s) => OVERLAY_TYPES.has(s.type));

  const selectHandler = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    clickInCanvas.current = true;
    select(id);
  };

  // scroll the preview to the selected section (e.g. clicked in the left list)
  useEffect(() => {
    if (!selectedId) return;
    if (clickInCanvas.current) {
      clickInCanvas.current = false;
      return;
    }
    const root = scrollRef.current;
    const stage = root?.querySelector("[data-cinematic-stage]");
    if (stage) {
      const seek = new CustomEvent("cinematic:seek", {
        detail: selectedId,
        cancelable: true,
      });
      if (!stage.dispatchEvent(seek)) return;
    }
    const sekarStage = root?.querySelector("[data-sekar-jawa-3d-stage]");
    if (sekarStage) {
      const seek = new CustomEvent("sekar-jawa-3d:seek", {
        detail: selectedId,
        cancelable: true,
      });
      if (!sekarStage.dispatchEvent(seek)) return;
    }
    const el = root?.querySelector<HTMLElement>(
      `[data-section-id="${selectedId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  const floatingOverlay =
    overlaySections.length > 0 ? (
      <>
        {overlaySections.map((section) => {
          const variant = getVariant(section.type, section.variant);
          if (!variant || section.visible === false) return null;
          const Component = variant.component;
          const isMusic = section.type === "music";
          // music places itself via its own Fab; navigation variants pin
          // themselves (bottom bar / centre dock / side rail). Music still
          // needs the wrapper to choose a corner.
          const musicLeft = (section.props?.s_position as string) === "left";
          const wide = isMusic && section.variant === "bar";
          const wrapCls = isMusic
            ? `pointer-events-auto absolute bottom-3 ${
                wide ? "inset-x-0" : musicLeft ? "left-0" : "right-0"
              }`
            : "pointer-events-none absolute inset-0 [&_nav]:pointer-events-auto";
          // Sekar Jawa 3D's overlay buttons own their clicks (seek/audio).
          // Its flow placeholder remains the selection target for the inspector.
          const overlaySelectHandler = sekarJawa3D
            ? undefined
            : selectHandler(section.id);
          return (
            <div
              key={section.id}
              data-section-id={section.id}
              onClickCapture={overlaySelectHandler}
              className={`${wrapCls} ${
                selectedId === section.id && isMusic
                  ? "rounded-2xl outline outline-2 outline-forest"
                  : ""
              }`}
            >
              <Component
                props={section.props}
                global={global}
                invitationId={invitationId}
                isPreview
                inCanvas
                siblingTypes={siblingTypes}
              />
            </div>
          );
        })}
      </>
    ) : null;

  return (
    <div className="min-h-full px-6 py-8">
      <DeviceFrame preset={preset} overlay={floatingOverlay}>
        <div
          ref={scrollRef}
          className={cinematicVintage ? "mx-auto max-w-lg" : undefined}
          style={invitationRootStyle(global)}
        >
          {ordered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">
              Belum ada bagian. Tambahkan dari panel kiri atau tombol di bawah.
            </div>
          ) : null}

          {cinematicVintage
            ? ordered
                .filter((s) => s.type === "cover" && s.visible !== false)
                .map((section) => {
                  const Component = getVariant(
                    section.type,
                    section.variant,
                  )?.component;
                  return Component ? (
                    <div
                      key={section.id}
                      data-section-id={section.id}
                      onClickCapture={selectHandler(section.id)}
                    >
                      <Component
                        props={section.props}
                        global={global}
                        invitationId={invitationId}
                        isPreview
                        inCanvas
                        siblingTypes={siblingTypes}
                      />
                    </div>
                  ) : null;
                })
            : null}
          {cinematicVintage ? (
            <CinematicComposition
              sections={ordered}
              global={global}
              invitationId={invitationId}
              isPreview
              inCanvas
              siblingTypes={siblingTypes}
              selectedId={selectedId}
              onSelect={(id) => {
                clickInCanvas.current = true;
                select(id);
              }}
              compositionActive
            />
          ) : null}
          {sekarJawa3D ? (
            <SekarJawa3DComposition
              sections={ordered}
              global={global}
              invitationId={invitationId}
              isPreview
              inCanvas
              siblingTypes={siblingTypes}
              selectedId={selectedId}
              onSelect={(id) => {
                clickInCanvas.current = true;
                select(id);
              }}
            />
          ) : null}
          {flow.map((section) => {
            const variant = getVariant(section.type, section.variant);
            const def = SectionRegistry[section.type];
            const selected = selectedId === section.id;
            if (!variant) return null;
            const Component = variant.component;

            if (OVERLAY_TYPES.has(section.type)) {
              const isMusic = section.type === "music";
              return (
                <div
                  key={section.id}
                  data-section-id={section.id}
                  onClickCapture={selectHandler(section.id)}
                  className={`relative cursor-pointer border-y border-dashed px-4 py-3 text-center transition-colors ${
                    selected
                      ? "border-forest bg-forest/5"
                      : "border-black/15 bg-black/[0.02] hover:border-forest/40"
                  } ${section.visible === false ? "opacity-40" : ""}`}
                >
                  <p className="text-[11px] font-medium text-black/55">
                    {isMusic ? "🎵" : "🧭"} {def?.name ?? section.type} ·{" "}
                    {variant.name}
                  </p>
                  <p className="text-[10px] text-black/40">
                    {isMusic
                      ? (section.props?.track_title as string) ||
                        "Belum ada lagu dipilih"
                      : "Menu mengambang"}{" "}
                    — tampil mengambang di atas undangan
                  </p>
                </div>
              );
            }

            return (
              <div
                key={section.id}
                data-section-id={section.id}
                onClickCapture={selectHandler(section.id)}
                className={`group relative cursor-pointer ${
                  section.visible ? "" : "opacity-40"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 z-10 border-2 transition-colors ${
                    selected
                      ? "border-forest"
                      : "border-transparent group-hover:border-forest/40"
                  }`}
                />
                {selected ? (
                  <span className="absolute top-1 left-1 z-20 rounded bg-forest px-1.5 py-0.5 text-[10px] text-cream">
                    {def?.name ?? section.type}
                  </span>
                ) : null}
                <Component
                  props={section.props}
                  global={global}
                  invitationId={invitationId}
                  isPreview
                  inCanvas
                  siblingTypes={siblingTypes}
                />
              </div>
            );
          })}

          <p className="py-3 text-center text-[11px] text-black/40">
            Dibuat dengan Ngaturi
          </p>
        </div>
      </DeviceFrame>

      <div className="mx-auto mt-4 max-w-[400px]">
        <AddSectionButton />
      </div>
    </div>
  );
}
