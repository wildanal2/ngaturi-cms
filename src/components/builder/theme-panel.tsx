"use client";

import { useBuilder } from "@/stores/builder-store";

const PRESETS = [
  { name: "Forest", primary: "#34503f", secondary: "#7a2e3c", bg: "#fbf8f3" },
  { name: "Maroon", primary: "#7a2e3c", secondary: "#b08a4f", bg: "#faf6f0" },
  { name: "Dusty Blue", primary: "#3b5b7a", secondary: "#c99a5b", bg: "#f6f8fa" },
  { name: "Terracotta", primary: "#a4522d", secondary: "#5c6f52", bg: "#fbf6f1" },
  { name: "Charcoal", primary: "#2f2f33", secondary: "#9a7b4f", bg: "#f5f4f2" },
  { name: "Sage", primary: "#5c6f52", secondary: "#8a5a44", bg: "#f7f8f4" },
];

export function ThemePanel() {
  const global = useBuilder((s) => s.global);
  const setGlobal = useBuilder((s) => s.setGlobal);
  const locked = useBuilder((s) => s.locked);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg">Tema undangan</h3>
        <p className="text-xs text-muted">
          Berlaku untuk semua bagian. Pilih salah satu bagian di kiri untuk
          mengedit isinya.
        </p>
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
          <option value="Inter">Inter — sans modern</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">URL musik latar (opsional)</span>
        <input
          type="url"
          value={global.music_url ?? ""}
          disabled={locked}
          onChange={(e) => setGlobal({ music_url: e.target.value })}
          placeholder="https://…/lagu.mp3"
          className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
        />
      </label>
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
