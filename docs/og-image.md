# Social preview (Open Graph) image

`/{slug}/opengraph-image` renders a static 1200×630 card of the **opened**
invitation — the hero shown after "Buka Undangan" — never the cover, loading
screen or opening gate. No browser screenshot or animation is involved.

- Selection: `src/lib/invitation/og-hero.ts` (`getOgHero`). The first visible
  `hero` section decides the layout; `cover.background_image` is never used.
  `getCardVisual()` (template catalog thumbnails) is unchanged.
- Rendering: `src/lib/invitation/og-card.tsx` (Satori-safe flex layout).

| Hero variant                                                            | Layout                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| `centered`, `sekar-jawa-3d`, `gerbang-puspa`                            | full-bleed photo, scrim, names on top               |
| `split`, `serambi-delima`, `lakon-kencana`                              | photo and text side by side                         |
| `arch`, `cinematic-vintage`                                             | portrait in an arch / heritage frame beside text    |
| `garland`                                                               | watercolor backdrop + couple illustration + florals |
| `minimal`, `botanical` (incl. noir), `floating17`, unknown, or no photo | typographic card on the template palette            |

Safety and limits: 64px side padding, names shrink with length (max 64 chars,
Latin only), text colour is swapped when the template colour is unreadable.
Images go through `fetchOgImageData` (same-origin paths or trusted media
prefixes only, no private hosts, size cap). Nothing guest-specific (`?to=`,
delegate tokens, guest names) is read. Inactive invitations render the generic
card. WebP/AVIF photos are converted to JPEG on Node (Satori cannot decode
them); on Workers they are skipped and the card falls back to typography.
Cards over 250 KB are re-encoded as JPEG (quality ladder 80/66/52) with a
matching `Content-Type`; Workers keep PNG. If a photo breaks the renderer the
card is rebuilt from palette + names only.

Not verified here: real WhatsApp (iPhone/Android) previews — WhatsApp caches
previews per URL, so check with a link that was never shared before.
