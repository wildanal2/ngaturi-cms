"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ReactNode } from "react";
import type {
  LakonPresentation as Presentation,
  LakonPart as Part,
} from "./presentation";

const TemplatePresentation = dynamic(
  () => import("./presentation").then((module) => module.LakonPresentation),
  { loading: () => null },
);
const TemplatePart = dynamic(
  () => import("./presentation").then((module) => module.LakonPart),
  { loading: () => null },
);

/** Disabled templates retain their original DOM and stylesheet import graph. */
export function LakonPresentation(props: ComponentProps<typeof Presentation>) {
  if (!props.enabled) return props.children;
  return <TemplatePresentation {...props} />;
}

export function LakonPart(props: ComponentProps<typeof Part>): ReactNode {
  return <TemplatePart {...props} />;
}
