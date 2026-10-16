/** Original baseline illustrations only. Rights-cleared replacements use these slots. */
const root = "/themes/gerbang-puspa";
export const GP_PHASE_TWO_ASSETS = {
  bride: `${root}/bride.svg`,
  groom: `${root}/groom.svg`,
  story: `${root}/story-couple.svg`,
  gallery: Array.from(
    { length: 6 },
    (_, index) => `${root}/gallery-${index + 1}.svg`,
  ),
} as const;
