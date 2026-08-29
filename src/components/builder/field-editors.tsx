"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Upload, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Field } from "@/sections/types";
import { getDeep } from "@/stores/builder-store";

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-forest";

function toDatetimeLocal(v: unknown): string {
  if (typeof v !== "string") return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export interface FieldContext {
  invitationId: string;
  disabled: boolean;
  /** read a value by dot-path from the section props */
  read: (path: string) => unknown;
  /** write a value by dot-path */
  write: (path: string, value: unknown) => void;
}

export function FieldRenderer({
  field,
  ctx,
  prefix = "",
}: {
  field: Field;
  ctx: FieldContext;
  prefix?: string;
}) {
  if (field.kind === "group") {
    return (
      <fieldset className="rounded-xl border border-line p-3">
        <legend className="px-1 text-xs font-medium tracking-wide text-muted uppercase">
          {field.label}
        </legend>
        <div className="space-y-3">
          {field.fields.map((f, i) => (
            <FieldRenderer key={i} field={f} ctx={ctx} prefix={prefix} />
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.kind === "array") {
    return <ArrayField field={field} ctx={ctx} prefix={prefix} />;
  }

  const path = prefix ? `${prefix}.${field.key}` : field.key;
  const value = ctx.read(path);

  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center justify-between text-ink-soft">
        {field.label}
        {"help" in field && field.help ? (
          <span className="text-xs text-muted">{field.help}</span>
        ) : null}
      </span>
      <ScalarInput field={field} value={value} ctx={ctx} path={path} />
    </label>
  );
}

function ScalarInput({
  field,
  value,
  ctx,
  path,
}: {
  field: Exclude<Field, { kind: "group" } | { kind: "array" }>;
  value: unknown;
  ctx: FieldContext;
  path: string;
}) {
  const { disabled, write } = ctx;

  switch (field.kind) {
    case "textarea":
      return (
        <textarea
          rows={3}
          className={inputCls}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => write(path, e.target.value)}
        />
      );
    case "boolean":
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => write(path, !value)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            value ? "bg-forest" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              value ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      );
    case "select":
      return (
        <select
          className={inputCls}
          disabled={disabled}
          value={String(value ?? field.options[0]?.value)}
          onChange={(e) => {
            const raw = e.target.value;
            const num = Number(raw);
            write(path, Number.isFinite(num) && String(num) === raw ? num : raw);
          }}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="datetime-local"
          className={inputCls}
          disabled={disabled}
          value={toDatetimeLocal(value)}
          onChange={(e) =>
            write(
              path,
              e.target.value ? new Date(e.target.value).toISOString() : "",
            )
          }
        />
      );
    case "image":
      return (
        <ImageInput
          value={(value as string) ?? ""}
          disabled={disabled}
          invitationId={ctx.invitationId}
          onChange={(url) => write(path, url)}
        />
      );
    default:
      return (
        <input
          type={field.kind === "url" ? "url" : "text"}
          className={inputCls}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => write(path, e.target.value)}
        />
      );
  }
}

function ArrayField({
  field,
  ctx,
  prefix,
}: {
  field: Extract<Field, { kind: "array" }>;
  ctx: FieldContext;
  prefix: string;
}) {
  const path = prefix ? `${prefix}.${field.key}` : field.key;
  const items = (ctx.read(path) as Record<string, unknown>[]) ?? [];

  const setItems = (next: Record<string, unknown>[]) => ctx.write(path, next);

  return (
    <div className="space-y-2">
      <span className="text-sm text-ink-soft">{field.label}</span>
      {items.map((_, idx) => (
        <div key={idx} className="rounded-xl border border-line bg-cream/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              {field.itemLabel} {idx + 1}
            </span>
            <div className="flex gap-1 text-muted">
              <button
                type="button"
                disabled={ctx.disabled || idx === 0}
                onClick={() => {
                  const next = [...items];
                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                  setItems(next);
                }}
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                disabled={ctx.disabled || idx === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                  setItems(next);
                }}
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                disabled={ctx.disabled}
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                className="text-wine"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {field.itemFields.map((f, i) => (
              <FieldRenderer
                key={i}
                field={f}
                ctx={ctx}
                prefix={`${path}.${idx}`}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={ctx.disabled}
        onClick={() => setItems([...items, { ...field.defaultItem }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-sm text-ink-soft hover:bg-cream-200"
      >
        <Plus size={15} /> {field.addLabel}
      </button>
    </div>
  );
}

function ImageInput({
  value,
  onChange,
  disabled,
  invitationId,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
  invitationId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("invitationId", invitationId);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal upload");
      onChange(data.publicUrl);
      toast.success("Foto diunggah & dioptimasi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="h-28 w-full rounded-lg border border-line object-cover"
        />
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => ref.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-sm hover:bg-cream-200 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Upload size={15} />
          )}
          {value ? "Ganti foto" : "Unggah foto"}
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="rounded-lg border border-line px-2 text-muted hover:bg-cream-200"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export { getDeep };
