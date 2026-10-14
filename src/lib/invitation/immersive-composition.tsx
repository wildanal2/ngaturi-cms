"use client";

import dynamic from "next/dynamic";

// Keep the optional WebGL runtime out of Cinematic and standard invitation bundles.
// SSR remains enabled so this boundary preserves the existing invitation content.
export const SekarJawa3DComposition = dynamic(() =>
  import("@/sections/sekar-jawa-3d/composition").then(
    (module) => module.SekarJawa3DComposition,
  ),
);
