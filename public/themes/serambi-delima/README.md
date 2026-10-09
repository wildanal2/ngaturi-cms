# Serambi Delima artwork and typography

Phase 1 assets for the `serambi-delima` loading, cover, and hero variants.

## Original Ngaturi artwork

- `portal-crown.svg`: independently drawn seven-lobed ceremonial crown. The
  accompanying CSS columns grow with content rather than stretching the crown.
- `botanical-spray.svg`: original pomegranate leaves and fruit; mirrored by CSS.
- `paper-pattern.svg`: original low-contrast repeating paper ornament.
- `divider.svg`: original gold line ornament.
- `thumbnail.svg`: original catalog illustration assembled from this artwork.
- The small pomegranate seal is inline SVG in the shared section primitives.

These are original vector drawings, not traced or extracted vendor assets. No
reference photos, audio, fonts, CSS, or scripts are included. Empty and failed
photos show the ceremonial seal; actual cover/hero photos come from Builder data.

## Official font distributions

Unmodified Latin WOFF2 files served by Google Fonts, retrieved 2026-10-09:

- Cinzel: https://fonts.gstatic.com/s/cinzel/v26/8vIJ7ww63mVu7gt79mT7.woff2
- Playfair Display: https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2

Source CSS: https://fonts.googleapis.com/css2?family=Cinzel:wght@400..600&family=Playfair+Display:wght@400..600&display=swap

Both distributions use SIL Open Font License 1.1. Preserve the included copyright
and license notices in `fonts/Cinzel-OFL.txt` and `fonts/Playfair-Display-OFL.txt`.
Upstream notices:

- https://github.com/google/fonts/blob/main/ofl/cinzel/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/playfairdisplay/OFL.txt

Fonts are loaded locally with `next/font/local`, scoped to these variants, without
global layout changes or remote runtime requests. Cinzel supplies ceremonial
headings/date labels; Playfair Display supplies names on the cover and body text.
The Latin subset covers Indonesian; other scripts use the declared system serif
fallback. Dedicated Arabic typography remains outside Phase 1.
