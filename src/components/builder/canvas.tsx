"use client";

import { useBuilder } from "@/stores/builder-store";
import { getVariant, SectionRegistry } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { AddSectionButton } from "./add-section-menu";
import { DeviceFrame } from "./device-frame";

function CoverPreview() {
  const global = useBuilder((s) => s.global);
  const sections = useBuilder((s) => s.sections);
  const select = useBuilder((s) => s.select);
  if (global.cover_enabled === false) return null;
  const hero = sections.find((s) => s.type === "hero");
  const names = (hero?.props?.couple_names as string) ?? "Nama Mempelai";

  return (
    <div
      onClick={() => select(null)}
      className="relative flex min-h-[70%] cursor-pointer flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-white"
      style={{ backgroundColor: global.color_primary }}
    >
      {global.cover_image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={global.cover_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : null}
      <span className="absolute top-1 left-1 z-10 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
        Sampul · atur di panel Tema
      </span>
      <div className="relative">
        <p className="text-xs tracking-[0.3em] uppercase opacity-80">
          {global.cover_tagline ?? "The Wedding Of"}
        </p>
        <p className="mt-3 font-[family-name:var(--inv-font)] text-3xl">
          {names}
        </p>
        <p className="mt-6 text-xs opacity-70">
          {global.cover_note ?? "Kepada Bapak/Ibu/Saudara/i"}
        </p>
        <span className="mt-6 inline-block rounded-full border border-white/60 px-5 py-2 text-xs">
          {global.cover_button ?? "Buka Undangan"}
        </span>
      </div>
    </div>
  );
}

export function Canvas({ invitationId }: { invitationId: string }) {
  const sections = useBuilder((s) => s.sections);
  const global = useBuilder((s) => s.global);
  const device = useBuilder((s) => s.device);
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);

  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const siblingTypes = ordered.map((s) => s.type);

  return (
    <div className="px-6 py-8">
      <DeviceFrame device={device}>
        <div style={invitationRootStyle(global)}>
          <CoverPreview />
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
