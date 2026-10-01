# Cinematic Vintage

Premium wedding preset implemented with existing section schemas and registered
`cinematic-vintage` variants. Follow `template-extraction.md` for future content changes.

## Data and presentation

`invitation.sections` → `src/sections/cinematic/content.ts` → `composition.tsx`
→ `stage.tsx` → dynamically imported `timeline.ts`.

The visible `hero/cinematic-vintage` variant opts into this composition. There is
no new persisted setting, section type, business schema, store, or migration.
The adapter returns references to visible sections, without hydrating edited
values. Clearing a field therefore does not resurrect dummy content.

| Scene | Existing section / editable data |
| --- | --- |
| Opening cover | `cover`: names, tagline, guest greeting, open button |
| Entrance portal | `hero`: names, date, tagline, couple photo |
| Couple focus | `couple-intro`: both people, photos, parents, residence, Instagram |
| Quote pull-back | `quote`: text, source |
| Gallery world | `gallery.images[]`: every photo and caption |
| Akad portal | `event-details.events[0]`: event name, date, time, venue, address, Maps |
| Reception portal | `event-details.events[1]`: same contract, independent editable record |
| Extra event portals | Further `event-details.events[]` records use the same component |
| Venue | `map-location`: venue name, address, Maps link |
| Closing pull-back | `closing`: names, message, photo |

Core scenes have the curated narrative order above. Hidden sections are omitted.
Changing a core section to a standard variant returns it to the ordinary flow
after the stage, where its style controls retain their normal effect. Additional
or duplicate sections are also retained. Disabling/changing the cinematic hero
restores the standard renderer. Functional sections retain the original registry
components, invitation ID, preview flags, APIs and business logic.

## Scroll and lifecycle

One paused GSAP timeline controls camera scale, rail translation, individual
portraits and decoration layers. A passive native scroll listener schedules a
single animation frame, then updates that timeline directly. Scroll progress is
never stored in React or Zustand.

- Public: window scroll, with a centered `max-w-lg` composition on desktop.
- Builder: nearest `[data-device-scroller]` only. If it is absent, enhancement is
  skipped. CSS sticky stays inside the preview; neither body nor Builder scroll
  is locked. Inspector and SectionList remain the editors.
- SectionList and public navigation seek named scene positions. One event section
  supplies all event portals. Text/photo edits keep the current timeline; scene
  and panel count changes rebuild it with cleanup.
- No ScrollTrigger, smooth-scroll library, WebGL or pin spacers are needed.
- A scoped GSAP context, animation frame, scroll listener, preference listener
  and ResizeObserver are disposed on unmount. Photos have reserved dimensions,
  so no image-load listeners are installed.

The unenhanced DOM is a normal readable sequence. Reduced motion bypasses the
dynamic import, and live preference changes revert transforms and `inert`.
The "Tampilan sederhana" button provides the same readable flow, including for
unusually long content. Off-camera links are inert only during enhancement.

## Assets and card

Original vector masks in `public/themes/cinematic-vintage/{frames,florals,architecture,effects}`
inherit the invitation palette. The backdrop and glow are CSS gradients.
See that directory's README for replaceable asset dimensions. These are lightweight
placeholder illustrations; user photos come from section props and existing dummy
providers. The official `/templates/cinematic-vintage/card` route hydrates the preset
to obtain its default names, and continues to generate the card with Satori.

## Verification

Run the repository's typecheck, lint, tests and build. Focused semantic regressions
are in `src/sections/cinematic/content.test.tsx`.

With Playwright installed and Chromium available:

```bash
BASE_URL=http://localhost:3030 node scripts/verify-cinematic.mjs
```

Optional environment variables:

- `PLAYWRIGHT_MODULE`: module path when Playwright lives in a separate tooling install.
- `CINEMATIC_PUBLIC_URL`: a public invitation URL instead of the catalog preview.
- `CINEMATIC_BUILDER_URL` and `CINEMATIC_STORAGE_STATE`: an owned development fixture
  and a private Playwright session file for read-only Builder checks.

The script checks actual transforms, window/Builder scroll isolation, reduced
motion, fallback, lifecycle and standard template isolation. It saves screenshots
under `/tmp/ngaturi-vintage-verification`. On development servers it also blocks
the timeline chunk to verify a real import failure. Production chunk names are
opaque, so that fault-injection check is explicitly skipped there.

Implementation verification covered 360px, 430px, 1440px, a 360px DeviceFrame,
Inspector edits, autosave/reload, an anonymous published local fixture and the
production build. The original upload API returned 500 because the development
S3 hostname could not resolve; successful storage upload remains an environment
verification gap. No upload/API business logic was changed for this template.
