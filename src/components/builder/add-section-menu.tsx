"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Plus, X } from "lucide-react";
import { useBuilder } from "@/stores/builder-store";
import { getSectionsByCategory } from "@/sections/registry";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
    name
  ];
  return Cmp ? <Cmp size={size} /> : <Plus size={size} />;
}

export function AddSectionButton({ atIndex }: { atIndex?: number }) {
  const [open, setOpen] = useState(false);
  const addSection = useBuilder((s) => s.addSection);
  const locked = useBuilder((s) => s.locked);

  if (locked) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-1.5 text-xs text-ink-soft hover:border-forest hover:text-forest"
      >
        <Plus size={14} /> Tambah bagian
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">Tambah bagian</h3>
              <button onClick={() => setOpen(false)} className="text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              {getSectionsByCategory().map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {group.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.sections.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => {
                          addSection(
                            def.type,
                            Object.keys(def.variants)[0],
                            atIndex,
                          );
                          setOpen(false);
                        }}
                        className="flex items-start gap-3 rounded-xl border border-line p-3 text-left hover:border-forest hover:bg-cream-200"
                      >
                        <span className="mt-0.5 text-forest">
                          <Icon name={def.icon} />
                        </span>
                        <span>
                          <span className="block text-sm font-medium">
                            {def.name}
                          </span>
                          <span className="block text-xs text-muted">
                            {def.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
