import { create } from "zustand";
import { temporal } from "zundo";
import { useStore } from "zustand";
import type { GlobalSettings, SectionData } from "@/sections/types";
import { SectionRegistry } from "@/sections/registry";

export type PreviewDevice = "mobile" | "tablet" | "desktop";

interface BuilderState {
  invitationId: string | null;
  sections: SectionData[];
  global: GlobalSettings;
  selectedId: string | null;
  device: PreviewDevice;
  dirty: boolean;
  locked: boolean;

  load: (data: {
    invitationId: string;
    sections: SectionData[];
    global: GlobalSettings;
    locked: boolean;
  }) => void;
  select: (id: string | null) => void;
  setDevice: (d: PreviewDevice) => void;
  addSection: (type: string, variant: string, atIndex?: number) => void;
  duplicateSection: (id: string) => void;
  removeSection: (id: string) => void;
  reorder: (activeId: string, overId: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  toggleVisible: (id: string) => void;
  setVariant: (id: string, variant: string) => void;
  setProp: (id: string, key: string, value: unknown) => void;
  setProps: (id: string, patch: Record<string, unknown>) => void;
  setGlobal: (patch: Partial<GlobalSettings>) => void;
  markClean: () => void;
}

const reindex = (list: SectionData[]): SectionData[] =>
  list.map((s, i) => ({ ...s, order: i }));

export function setDeep(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split(".");
  const copy = structuredClone(obj);
  let cur: Record<string, unknown> = copy;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
  return copy;
}

export function getDeep(obj: Record<string, unknown>, path: string): unknown {
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

export const useBuilder = create<BuilderState>()(
  temporal(
    (set) => ({
      invitationId: null,
      sections: [],
      global: {
        font_family: "Fraunces",
        color_primary: "#34503f",
        color_secondary: "#7a2e3c",
        color_background: "#fbf8f3",
      },
      selectedId: null,
      device: "mobile",
      dirty: false,
      locked: false,

      load: ({ invitationId, sections, global, locked }) =>
        set({
          invitationId,
          sections: reindex([...sections].sort((a, b) => a.order - b.order)),
          global,
          locked,
          dirty: false,
          selectedId: null,
        }),

      select: (id) => set({ selectedId: id }),
      setDevice: (device) => set({ device }),

      addSection: (type, variant, atIndex) =>
        set((s) => {
          const def = SectionRegistry[type]?.variants[variant];
          if (!def) return s;
          const section: SectionData = {
            id: crypto.randomUUID(),
            type,
            variant,
            order: 0,
            visible: true,
            props: structuredClone(def.defaultProps),
          };
          const list = [...s.sections];
          list.splice(atIndex ?? list.length, 0, section);
          return { sections: reindex(list), selectedId: section.id, dirty: true };
        }),

      duplicateSection: (id) =>
        set((s) => {
          const idx = s.sections.findIndex((x) => x.id === id);
          if (idx < 0) return s;
          const copy: SectionData = {
            ...structuredClone(s.sections[idx]),
            id: crypto.randomUUID(),
          };
          const list = [...s.sections];
          list.splice(idx + 1, 0, copy);
          return { sections: reindex(list), selectedId: copy.id, dirty: true };
        }),

      removeSection: (id) =>
        set((s) => ({
          sections: reindex(s.sections.filter((x) => x.id !== id)),
          selectedId: s.selectedId === id ? null : s.selectedId,
          dirty: true,
        })),

      reorder: (activeId, overId) =>
        set((s) => {
          const from = s.sections.findIndex((x) => x.id === activeId);
          const to = s.sections.findIndex((x) => x.id === overId);
          if (from < 0 || to < 0 || from === to) return s;
          const list = [...s.sections];
          const [moved] = list.splice(from, 1);
          list.splice(to, 0, moved);
          return { sections: reindex(list), dirty: true };
        }),

      move: (id, dir) =>
        set((s) => {
          const idx = s.sections.findIndex((x) => x.id === id);
          const next = idx + dir;
          if (idx < 0 || next < 0 || next >= s.sections.length) return s;
          const list = [...s.sections];
          [list[idx], list[next]] = [list[next], list[idx]];
          return { sections: reindex(list), dirty: true };
        }),

      toggleVisible: (id) =>
        set((s) => ({
          sections: s.sections.map((x) =>
            x.id === id ? { ...x, visible: !x.visible } : x,
          ),
          dirty: true,
        })),

      setVariant: (id, variant) =>
        set((s) => ({
          sections: s.sections.map((x) => (x.id === id ? { ...x, variant } : x)),
          dirty: true,
        })),

      setProp: (id, key, value) =>
        set((s) => ({
          sections: s.sections.map((x) =>
            x.id === id ? { ...x, props: setDeep(x.props, key, value) } : x,
          ),
          dirty: true,
        })),

      setProps: (id, patch) =>
        set((s) => ({
          sections: s.sections.map((x) =>
            x.id === id ? { ...x, props: { ...x.props, ...patch } } : x,
          ),
          dirty: true,
        })),

      setGlobal: (patch) =>
        set((s) => ({ global: { ...s.global, ...patch }, dirty: true })),

      markClean: () => set({ dirty: false }),
    }),
    {
      limit: 100,
      // hanya sections + global yang masuk history
      partialize: (s) => ({ sections: s.sections, global: s.global }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  ),
);

/** Hook untuk state undo/redo dari zundo. */
export function useTemporal() {
  return useStore(useBuilder.temporal, (s) => s);
}
