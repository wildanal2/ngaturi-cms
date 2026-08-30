"use client";

import { getVariant, variantDefaultProps } from "@/sections/registry";
import { invitationRootStyle } from "@/lib/invitation/renderer";
import { useBuilder } from "@/stores/builder-store";

/**
 * Live miniature render of a section variant — shown in the "Tampilan"
 * picker so each option is a real preview, not just text.
 */
export function VariantThumb({
  type,
  variantKey,
}: {
  type: string;
  variantKey: string;
}) {
  const global = useBuilder((s) => s.global);
  const v = getVariant(type, variantKey);
  if (!v) return null;
  const Component = v.component;

  return (
    <div className="relative h-28 w-full overflow-hidden rounded-lg border border-line bg-white">
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{
          ...invitationRootStyle(global),
          width: 390,
          transform: "scale(0.62)",
        }}
      >
        <Component
          props={variantDefaultProps(type, variantKey)}
          global={global}
          isPreview
          inCanvas
          siblingTypes={[]}
        />
      </div>
      <div className="absolute inset-0" />
    </div>
  );
}
