import type { ComponentType } from "react";
import type { ZodType } from "zod";

export type AnimationKind =
  | "none"
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom"
  | "flip";

export interface GlobalSettings {
  font_family: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  animation?: AnimationKind;
  music_url?: string;
  is_rtl?: boolean;
}

export interface StyleOverrides {
  [key: string]: unknown;
}

export interface SectionData {
  id: string;
  type: string;
  variant: string;
  order: number;
  visible: boolean;
  props: Record<string, unknown>;
  style_overrides?: StyleOverrides;
}

export interface SectionRenderProps {
  props: Record<string, unknown>;
  global: GlobalSettings;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
  /** ordered list of every section type in this invitation */
  siblingTypes?: string[];
}

/** A "Gaya" sub-choice within a component (e.g. accent treatment). */
export interface StyleOption {
  key: string; // stored in props as `s_<key>`
  label: string;
  options: { value: string; label: string }[];
  default: string;
}

export interface VariantDefinition {
  name: string;
  description?: string;
  component: ComponentType<SectionRenderProps>;
  propsSchema: ZodType;
  defaultProps: Record<string, unknown>;
  /** Editable content fields — differ per component. */
  fields: Field[];
  /** Optional visual sub-styles for this component. */
  styleOptions?: StyleOption[];
  isPremium?: boolean;
}

export interface SectionDefinition {
  type: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  category: "hero" | "content" | "interactive" | "footer";
  isPremium?: boolean;
  variants: Record<string, VariantDefinition>;
}

/** Field editor descriptors for the builder inspector. */
export type Field =
  | { kind: "text" | "textarea" | "url" | "date"; key: string; label: string; help?: string }
  | { kind: "boolean"; key: string; label: string; help?: string }
  | { kind: "image"; key: string; label: string; help?: string }
  | { kind: "color"; key: string; label: string; help?: string }
  | {
      kind: "select";
      key: string;
      label: string;
      help?: string;
      options: { value: string; label: string }[];
    }
  | { kind: "group"; label: string; fields: Field[] }
  | {
      kind: "array";
      key: string;
      label: string;
      addLabel: string;
      itemLabel: string;
      itemFields: Field[];
      defaultItem: Record<string, unknown>;
    };
