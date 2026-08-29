"use client";

import { useBuilder } from "@/stores/builder-store";
import { SectionRegistry } from "@/sections/registry";
import type { SectionData, SectionField } from "@/sections/types";

function getDeep(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, k) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[k]
          : undefined,
      obj,
    );
}

function toDateInput(v: unknown): string {
  if (typeof v !== "string") return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

export function PropertyPanel({
  section,
  disabled,
}: {
  section: SectionData | null;
  disabled: boolean;
}) {
  const { setProp, setVariant, setGlobal, global } = useBuilder();

  if (!section) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
          Tampilan global
        </h3>
        <ColorRow
          label="Warna utama"
          value={global.color_primary}
          onChange={(v) => setGlobal({ color_primary: v })}
          disabled={disabled}
        />
        <ColorRow
          label="Warna aksen"
          value={global.color_secondary}
          onChange={(v) => setGlobal({ color_secondary: v })}
          disabled={disabled}
        />
        <ColorRow
          label="Latar"
          value={global.color_background}
          onChange={(v) => setGlobal({ color_background: v })}
          disabled={disabled}
        />
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-ink-soft">Font</span>
          <select
            value={global.font_family}
            onChange={(e) => setGlobal({ font_family: e.target.value })}
            disabled={disabled}
            className="w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          >
            <option value="Fraunces">Fraunces (serif)</option>
            <option value="Inter">Inter (sans)</option>
          </select>
        </label>
        <p className="mt-6 text-xs text-muted">
          Pilih salah satu bagian di kiri untuk mengeditnya.
        </p>
      </div>
    );
  }

  const def = SectionRegistry[section.type];
  const variants = def ? Object.entries(def.variants) : [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium tracking-wide text-muted uppercase">
        {def?.name ?? section.type}
      </h3>

      {variants.length > 1 ? (
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Gaya</span>
          <select
            value={section.variant}
            onChange={(e) => setVariant(section.id, e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          >
            {variants.map(([key, v]) => (
              <option key={key} value={key}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {(def?.fields ?? []).map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={getDeep(section.props, field.key)}
          disabled={disabled}
          onChange={(v) => setProp(section.id, field.key, v)}
        />
      ))}

      {(def?.fields ?? []).length === 0 ? (
        <p className="text-xs text-muted">
          Bagian ini memakai isi contoh. Edit lanjutan menyusul.
        </p>
      ) : null}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: SectionField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm";
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-soft">{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          rows={3}
          className={cls}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "boolean" ? (
        <input
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : field.type === "select" ? (
        <select
          className={cls}
          disabled={disabled}
          value={String(value ?? field.options[0]?.value)}
          onChange={(e) => onChange(Number(e.target.value) || e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "date" ? (
        <input
          type="datetime-local"
          className={cls}
          disabled={disabled}
          value={toDateInput(value)}
          onChange={(e) =>
            onChange(new Date(e.target.value).toISOString())
          }
        />
      ) : (
        <input
          type="text"
          className={cls}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
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
    <label className="mb-2 flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <input
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-12 rounded border border-line"
      />
    </label>
  );
}
