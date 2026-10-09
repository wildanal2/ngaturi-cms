import type { CriticalAssetPlan } from "./readiness";

export type LoadingAssetProvider = (root: HTMLElement) => CriticalAssetPlan;

const theme = "/themes/cinematic-vintage";
const openingArt = [
  "frames/heritage.svg",
  "backgrounds/damask.svg",
  "architecture/colonnade.svg",
  "architecture/chandelier.svg",
  "effects/glow.svg",
  "effects/dust.svg",
  "florals/branch.svg",
  "florals/foreground.svg",
].map((path) => `${theme}/${path}`);

/** Add another template's first-view provider here; never collect all media. */
export const loadingAssetProviders: Record<string, LoadingAssetProvider> = {
  "cinematic-vintage": (root) => {
    const hero = root.querySelector<HTMLImageElement>("[data-hero-photo] img");
    const coverImages = [
      ...root.querySelectorAll<HTMLImageElement>("[data-invitation-cover] img"),
    ];
    const computed = getComputedStyle(root);
    const fonts = ["--font-cormorant", "--font-inter"].flatMap((variable) => {
      const family = computed.getPropertyValue(variable).trim();
      return family ? [{ family }] : [];
    });
    return {
      images: [...coverImages, ...(hero ? [hero] : [])],
      imageUrls: root.querySelector("[data-invitation-cover]")
        ? openingArt
        : openingArt.slice(0, 2),
      fonts,
      audio: root.querySelector<HTMLAudioElement>("audio[data-loading-audio]"),
    };
  },
};
