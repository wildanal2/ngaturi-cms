import { create } from "zustand";
import type { GlobalSettings, SectionData } from "@/sections/types";
import { SectionRegistry } from "@/sections/registry";

interface BuilderState {
  invitationId: string | null;
  sections: SectionData[];
  global: GlobalSettings;
  selectedId: string | null;
  dirty: boolean;
  locked: boolean;

  load: (data: {
    invitationId: string;
    sections: SectionData[];
    global: GlobalSettings;
    locked: boolean;
  }) => void;
  select: (id: string | null) => void;
  addSection: (type: string, variant: string) => void;
  removeSection: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  toggleVisible: (id: string) => void;
  setVariant: (id: string, variant: string) => void;
  setProp: (id: string, key: string, value: unknown) => void;
  setGlobal: (patch: Partial<GlobalSettings>) => void;
  markClean: () => void;
}

function reindex(list: SectionData[]): SectionData[] {
  return list.map((s, i) => ({ ...s, order: i }));
}

/** Set nested key seperti "bride.photo". */
function setDeep(
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

export const useBuilder = create<BuilderState>((set) => ({
  invitationId: null,
  sections: [],
  global: {
    font_family: "Fraunces",
    color_primary: "#34503f",
    color_secondary: "#7a2e3c",
    color_background: "#fbf8f3",
  },
  selectedId: null,
  dirty: false,
  locked: false,

  load: ({ invitationId, sections, global, locked }) =>
    set({
      invitationId,
      sections: reindex([...sections].sort((a, b) => a.order - b.order)),
      global,
      locked,
      dirty: false,
      selectedId: sections[0]?.id ?? null,
    }),

  select: (id) => set({ selectedId: id }),

  addSection: (type, variant) =>
    set((s) => {
      const def = SectionRegistry[type]?.variants[variant];
      if (!def) return s;
      const section: SectionData = {
        id: crypto.randomUUID(),
        type,
        variant,
        order: s.sections.length,
        visible: true,
        props: structuredClone(def.defaultProps),
      };
      return {
        sections: reindex([...s.sections, section]),
        selectedId: section.id,
        dirty: true,
      };
    }),

  removeSection: (id) =>
    set((s) => ({
      sections: reindex(s.sections.filter((x) => x.id !== id)),
      selectedId: s.selectedId === id ? null : s.selectedId,
      dirty: true,
    })),

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
      sections: s.sections.map((x) =>
        x.id === id ? { ...x, variant } : x,
      ),
      dirty: true,
    })),

  setProp: (id, key, value) =>
    set((s) => ({
      sections: s.sections.map((x) =>
        x.id === id ? { ...x, props: setDeep(x.props, key, value) } : x,
      ),
      dirty: true,
    })),

  setGlobal: (patch) =>
    set((s) => ({ global: { ...s.global, ...patch }, dirty: true })),

  markClean: () => set({ dirty: false }),
}));
