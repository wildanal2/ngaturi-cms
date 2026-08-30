"use client";

import { useEffect, useRef } from "react";
import { useBuilder } from "@/stores/builder-store";
import { getVariant, SectionRegistry } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { AddSectionButton } from "./add-section-menu";
import { DeviceFrame } from "./device-frame";
import { getDevice } from "./devices";

export function Canvas({ invitationId }: { invitationId: string }) {
  const sections = useBuilder((s) => s.sections);
  const global = useBuilder((s) => s.global);
  const preset = getDevice(useBuilder((s) => s.deviceId));
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clickInCanvas = useRef(false);

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const siblingTypes = ordered.map((s) => s.type);
  // music renders as a floating FAB — pin it over the device viewport so it
  // stays visible while scrolling the preview, mirroring the live page.
  const flowSections = ordered.filter((s) => s.type !== "music");
  const musicSections = ordered.filter((s) => s.type === "music");

  // scroll the preview to the selected section (e.g. clicked in the left list)
  useEffect(() => {
    if (!selectedId) return;
    if (clickInCanvas.current) {
      clickInCanvas.current = false;
      return;
    }
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(
      `[data-section-id="${selectedId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  return (
    <div className="min-h-full px-6 py-8">
      <DeviceFrame preset={preset}>
        <div ref={scrollRef} style={invitationRootStyle(global)}>
          {ordered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">
              Belum ada bagian. Tambahkan dari panel kiri atau tombol di bawah.
            </div>
          ) : null}

          {flowSections.map((section) => {
            const variant = getVariant(section.type, section.variant);
            const def = SectionRegistry[section.type];
            const selected = selectedId === section.id;
            if (!variant) return null;
            const Component = variant.component;
            return (
              <div
                key={section.id}
                data-section-id={section.id}
                onClickCapture={(e) => {
                  e.stopPropagation();
                  clickInCanvas.current = true;
                  select(section.id);
                }}
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

          {musicSections.length > 0 ? (
            <div className="pointer-events-none sticky bottom-0 z-40 h-0">
              {musicSections.map((section) => {
                const variant = getVariant(section.type, section.variant);
                if (!variant) return null;
                const Component = variant.component;
                const selected = selectedId === section.id;
                return (
                  <div
                    key={section.id}
                    data-section-id={section.id}
                    onClickCapture={(e) => {
                      e.stopPropagation();
                      clickInCanvas.current = true;
                      select(section.id);
                    }}
                    className={`pointer-events-auto absolute inset-x-0 bottom-3 cursor-pointer ${
                      selected ? "outline-2 outline-forest" : ""
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
            </div>
          ) : null}
        </div>
      </DeviceFrame>

      <div className="mx-auto mt-4 max-w-[400px]">
        <AddSectionButton />
      </div>
    </div>
  );
}
