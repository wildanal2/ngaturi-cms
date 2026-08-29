"use client";

import { useBuilder, getDeep, setDeep } from "@/stores/builder-store";
import { SectionRegistry } from "@/sections/registry";
import { FieldRenderer, type FieldContext } from "./field-editors";
import { ThemePanel } from "./theme-panel";
import type { SectionData } from "@/sections/types";

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

  const ctx: FieldContext = {
    invitationId,
    disabled: locked,
    read: (path) => getDeep(section.props, path),
    write: (path, value) => {
      // top-level key → setProp; nested/array → compute whole object
      if (!path.includes(".")) {
        setProp(section.id, path, value);
      } else {
        const next = setDeep(section.props, path, value);
        setProps(section.id, next);
      }
    },
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg">{def.name}</h3>
        <p className="text-xs text-muted">{def.description}</p>
      </div>

      {variants.length > 1 ? (
        <div>
          <span className="mb-1.5 block text-sm text-ink-soft">Gaya</span>
          <div className="grid grid-cols-2 gap-2">
            {variants.map(([key, v]) => (
              <button
                key={key}
                disabled={locked}
                onClick={() => setVariant(section.id, key)}
                className={`rounded-lg border p-2 text-left text-xs ${
                  section.variant === key
                    ? "border-forest bg-cream-200"
                    : "border-line hover:bg-cream-200"
                }`}
              >
                <span className="block font-medium">{v.name}</span>
                {v.description ? (
                  <span className="text-muted">{v.description}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {def.fields.map((field, i) => (
          <FieldRenderer key={i} field={field} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}

export type { SectionData };
