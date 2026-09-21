"use client";

import { Lock } from "lucide-react";
import type { TemplateComposition } from "@/lib/templates/catalog";
import { useBuilder } from "@/stores/builder-store";

const PRESETS = [
  { name: "Forest", primary: "#34503f", secondary: "#7a2e3c", bg: "#fbf8f3" },
  { name: "Maroon", primary: "#7a2e3c", secondary: "#b08a4f", bg: "#faf6f0" },
  {
    name: "Dusty Blue",
    primary: "#3b5b7a",
    secondary: "#c99a5b",
    bg: "#f6f8fa",
  },
  {
    name: "Terracotta",
    primary: "#a4522d",
    secondary: "#5c6f52",
    bg: "#fbf6f1",
  },
  { name: "Charcoal", primary: "#2f2f33", secondary: "#9a7b4f", bg: "#f5f4f2" },
  { name: "Sage", primary: "#5c6f52", secondary: "#8a5a44", bg: "#f7f8f4" },
];

export function presentationModeLabel(
  composition: TemplateComposition,
  mode: "cinematic" | "simple",
) {
  if (mode === "simple") return "Sederhana";
  return composition === "sekar-jawa-3d" ? "Imersif" : "Sinematik";
}

export function ThemePanel({
  activeTemplateName,
  onChangeTemplate,
  changeTemplatePending,
}: {
  activeTemplateName: string;
  onChangeTemplate: () => void;
  changeTemplatePending: boolean;
}) {
  const global = useBuilder((s) => s.global);
  const setGlobal = useBuilder((s) => s.setGlobal);
  const locked = useBuilder((s) => s.locked);
  const canEditMotion = useBuilder((s) => s.compositionPolicy.canEditMotion);
  const composition = useBuilder((s) => s.compositionPolicy.composition);
  const cinematicVintage = composition === "cinematic-vintage";
  const sekarJawa3D = composition === "sekar-jawa-3d";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg">Tema undangan</h3>
        <p className="text-xs text-muted">
          Berlaku untuk semua bagian. Pilih salah satu bagian di kiri untuk
          mengedit isinya.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-cream-200/50 p-3">
        <span className="block text-xs font-medium tracking-wide text-muted uppercase">
          Template
        </span>
        <span className="mt-1 block text-sm font-medium text-ink">
          {activeTemplateName}
        </span>
        <button
          type="button"
          onClick={onChangeTemplate}
          disabled={locked || changeTemplatePending}
          className="mt-3 w-full rounded-full border border-forest px-3 py-2 text-sm font-medium text-forest hover:bg-forest hover:text-cream disabled:pointer-events-none disabled:opacity-60"
        >
          {changeTemplatePending ? "Menyimpan…" : "Ubah Template"}
        </button>
      </div>

      <div>
        <span className="mb-1.5 block text-sm text-ink-soft">Preset warna</span>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              disabled={locked}
              onClick={() =>
                setGlobal({
                  color_primary: p.primary,
                  color_secondary: p.secondary,
                  color_background: p.bg,
                })
              }
              className={`rounded-lg border p-2 text-left text-xs ${
                global.color_primary === p.primary
                  ? "border-forest"
                  : "border-line"
              }`}
            >
              <span className="flex gap-1">
                <i
                  className="h-4 w-4 rounded-full"
                  style={{ background: p.primary }}
                />
                <i
                  className="h-4 w-4 rounded-full"
                  style={{ background: p.secondary }}
                />
              </span>
              <span className="mt-1 block">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <ColorRow
        label="Warna utama"
        value={global.color_primary}
        onChange={(v) => setGlobal({ color_primary: v })}
        disabled={locked}
      />
      <ColorRow
        label="Warna aksen"
        value={global.color_secondary}
        onChange={(v) => setGlobal({ color_secondary: v })}
        disabled={locked}
      />
      <ColorRow
        label="Latar"
        value={global.color_background}
        onChange={(v) => setGlobal({ color_background: v })}
        disabled={locked}
      />

      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Font</span>
        <select
          value={global.font_family}
          disabled={locked}
          onChange={(e) => setGlobal({ font_family: e.target.value })}
          className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
        >
          <option value="Fraunces">Fraunces — serif elegan</option>
          <option value="Cormorant">Cormorant — serif klasik</option>
          <option value="Parisienne">Parisienne — tulisan tangan</option>
          <option value="Inter">Inter — sans modern</option>
        </select>
      </label>

      {cinematicVintage || sekarJawa3D ? (
        <div className="text-sm">
          <span className="mb-1.5 block text-ink-soft">Mode Tampilan</span>
          <div className="grid grid-cols-2 gap-2">
            {(["cinematic", "simple"] as const).map((mode) => {
              const active = (global.presentationMode ?? "cinematic") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => setGlobal({ presentationMode: mode })}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    active
                      ? "border-forest bg-forest text-cream"
                      : "border-line hover:bg-cream-200"
                  } disabled:opacity-60`}
                >
                  {presentationModeLabel(composition, mode)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {canEditMotion ? (
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Animasi saat scroll</span>
          <select
            value={global.animation ?? "fade-up"}
            disabled={locked}
            onChange={(e) =>
              setGlobal({
                animation: e.target.value as NonNullable<
                  typeof global.animation
                >,
              })
            }
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
          >
            <option value="fade-up">Muncul dari bawah</option>
            <option value="fade-down">Muncul dari atas</option>
            <option value="fade-left">Geser dari kanan</option>
            <option value="fade-right">Geser dari kiri</option>
            <option value="zoom">Zoom in</option>
            <option value="flip">Flip</option>
            <option value="fade">Fade halus</option>
            <option value="none">Tanpa animasi</option>
          </select>
        </label>
      ) : (
        <div className="text-sm">
          <span className="mb-1 block text-ink-soft">Animasi saat scroll</span>
          <div className="rounded-lg border border-line bg-cream-200/60 px-3 py-2.5">
            <span className="flex items-center gap-2 font-medium text-ink">
              <Lock size={14} aria-hidden />
              Cinematic Timeline
            </span>
            <p className="mt-1 text-xs text-muted">
              Animasi dikendalikan oleh template.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        Sampul (Buka Undangan), musik latar &amp; navigasi kini jadi bagian
        tersendiri — tambahkan lewat tombol &ldquo;Tambah bagian&rdquo;.
      </p>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-line px-1.5 py-1 font-mono text-xs"
        />
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded border border-line"
        />
      </span>
    </label>
  );
}
