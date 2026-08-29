"use client";

import { useBuilder } from "@/stores/builder-store";
import { getVariant, SectionRegistry } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { AddSectionButton } from "./add-section-menu";
import { DeviceFrame } from "./device-frame";

export function Canvas({ invitationId }: { invitationId: string }) {
  const sections = useBuilder((s) => s.sections);
  const global = useBuilder((s) => s.global);
  const device = useBuilder((s) => s.device);
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);

  const ordered = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="px-6 py-8">
      <DeviceFrame device={device}>
        <div style={invitationRootStyle(global)}>
          {ordered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">
              Belum ada bagian. Tambahkan dari panel kiri atau tombol di bawah.
            </div>
          ) : null}

          {ordered.map((section) => {
            const variant = getVariant(section.type, section.variant);
            const def = SectionRegistry[section.type];
            const selected = selectedId === section.id;
            if (!variant) return null;
            const Component = variant.component;
            return (
              <div
                key={section.id}
                onClickCapture={(e) => {
                  e.stopPropagation();
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
