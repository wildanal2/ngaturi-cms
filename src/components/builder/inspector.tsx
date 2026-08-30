"use client";

import { useBuilder, getDeep, setDeep } from "@/stores/builder-store";
import { SectionRegistry } from "@/sections/registry";
import { FieldRenderer, type FieldContext } from "./field-editors";
import { ThemePanel } from "./theme-panel";
import { VariantThumb } from "./variant-thumb";

export function Inspector({ invitationId }: { invitationId: string }) {
  const sections = useBuilder((s) => s.sections);
  const selectedId = useBuilder((s) => s.selectedId);
  const locked = useBuilder((s) => s.locked);
  const setProp = useBuilder((s) => s.setProp);
  const setProps = useBuilder((s) => s.setProps);
  const setVariant = useBuilder((s) => s.setVariant);

  const section = sections.find((s) => s.id === selectedId) ?? null;
  if (!section) return <ThemePanel />;

  const def = SectionRegistry[section.type];
  if (!def) return null;

  const variants = Object.entries(def.variants);
  const currentVariant = def.variants[section.variant];

  const ctx: FieldContext = {
    invitationId,
    disabled: locked,
    read: (path) => getDeep(section.props, path),
    write: (path, value) => {
      if (!path.includes(".")) setProp(section.id, path, value);
      else setProps(section.id, setDeep(section.props, path, value));
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg">{def.name}</h3>
        <p className="text-xs text-muted">{def.description}</p>
      </div>

      {/* LEVEL 1 — pilih komponen/tampilan */}
      {variants.length > 1 ? (
        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-muted uppercase">
            Tampilan
          </span>
          <div className="grid gap-2.5">
            {variants.map(([key, v]) => (
              <button
                key={key}
                disabled={locked}
                onClick={() => setVariant(section.id, key)}
                className={`overflow-hidden rounded-xl border text-left transition-colors ${
                  section.variant === key
                    ? "border-forest ring-1 ring-forest"
                    : "border-line hover:border-forest/50"
                }`}
              >
                <VariantThumb type={section.type} variantKey={key} />
                <div className="p-2">
                  <span className="block text-sm font-medium">{v.name}</span>
                  {v.description ? (
                    <span className="block text-xs text-muted">
                      {v.description}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* LEVEL 2 — gaya bawaan komponen ini */}
      {currentVariant?.styleOptions?.length ? (
        <div className="space-y-3">
          <span className="block text-xs font-medium tracking-wide text-muted uppercase">
            Gaya
          </span>
          {currentVariant.styleOptions.map((so) => (
            <label key={so.key} className="block text-sm">
              <span className="mb-1 block text-ink-soft">{so.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {so.options.map((o) => {
                  const active =
                    (ctx.read(`s_${so.key}`) ?? so.default) === o.value;
                  return (
                    <button
                      key={o.value}
                      disabled={locked}
                      onClick={() => ctx.write(`s_${so.key}`, o.value)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        active
                          ? "border-forest bg-forest text-cream"
                          : "border-line hover:bg-cream-200"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </label>
          ))}
        </div>
      ) : null}

      {/* LEVEL 3 — field isi (berbeda per komponen) */}
      <div className="space-y-4 border-t border-line pt-4">
        {(currentVariant?.fields ?? []).map((field, i) => (
          <FieldRenderer key={i} field={field} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}
