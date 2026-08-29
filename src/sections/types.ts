import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";

export interface GlobalSettings {
  font_family: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  animation?: "none" | "fade" | "slide" | "zoom";
  music_url?: string;
  is_rtl?: boolean;
}

export interface StyleOverrides {
  color_primary?: string;
  color_text?: string;
  text_align?: "left" | "center" | "right";
  background_image?: string;
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

/** Props yang diterima tiap komponen section saat dirender. */
export interface SectionRenderProps {
  props: Record<string, unknown>;
  global: GlobalSettings;
  invitationId?: string;
  guestName?: string | null;
  isPreview?: boolean;
}

export interface VariantDefinition {
  name: string;
  component: ComponentType<SectionRenderProps>;
  propsSchema: ZodTypeAny;
  defaultProps: Record<string, unknown>;
  isPremium?: boolean;
}

export interface SectionDefinition {
  type: string;
  name: string;
  description: string;
  category: "hero" | "content" | "interactive" | "footer";
  isPremium?: boolean;
  /** field props yang bisa diedit di builder */
  fields: SectionField[];
  variants: Record<string, VariantDefinition>;
}

export type SectionField =
  | { key: string; label: string; type: "text" | "textarea" | "date" | "url" | "image" }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };
