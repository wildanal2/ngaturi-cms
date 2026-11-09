# Gerbang Puspa

A native Ngaturi wedding template with a romantic garden and printed-stationery
presentation. It uses the standard registry, persisted section contracts,
Loading boundary, public renderer and Builder Canvas. No standalone template
runtime, business simulation or duplicate renderer is imported.

## Integration and lifecycle

The catalog preset contains Loading, Cover, Hero, Quote, Couple, optional Story,
Countdown, Events, Location, Gallery, RSVP, Guestbook, Gift, Closing, Music and
an editable native Navigation section.
Story starts hidden and empty; it never invents a couple's history. This order
applies to new presets only. Saved section identities, order and visibility stay
native. Closing ends the default content flow; Music uses the existing player.

`opening.tsx` supplies the centered maximum 500px column, quiet public garden
backdrop and device-contained Builder presentation. `content.ts` remains
server-safe template detection. Builder sizing comes from its existing device
scroller, and editable content appears immediately.

Loading uses `InvitationLoadingBoundary` and its first-view asset/font provider.
It is the only readiness owner; no audio player or artificial readiness wait is
added. Cover's `useOpen()` synchronously dispatches `ngaturi:open` inside the
opening gesture. One lifecycle owns `closed → opening → opened`. The public
Cover is a scrollable viewport overlay, and underlying content is inert in SSR
as well as hydration. Closed entry owns scroll restoration until the gesture.
Opening releases content and scrolling immediately, reveals the Hero in 600ms
and opens two original vector gate leaves. Animation completion or an 1100ms
fallback enables the dock. Reduced motion completes immediately. The initial
Hero handoff yields to the guest's next gesture; completion never scrolls or
focuses. Cleanup releases listeners, timers, frames, history policy and locks.

The presentation owns one cream dock: Beranda, Mempelai, Acara, Galeri and RSVP,
when their content exists. Countdown and Location belong to Acara. RSVP triggers
its existing dialog owner directly. Saved generic navigation is not rendered a
second time. An explicitly hidden navigation section is respected. Builder
portals the dock into its device viewport and retains selectable native section
placeholders. Empty audio has no public control; Builder retains feedback.

## Content contracts

- Cover preserves names, tagline, note, button label and native personalized
  guest-name injection. Hero preserves names, authored calendar day, ceremonial
  text, background image and welcome-image slots.
- Quote uses existing `text`/`source` only. Blank-line paragraphs supply the quote,
  welcome heading and welcome body. No religious wording is hardcoded. Welcome
  media uses the existing Hero `couple_image` slot.
- Couple retains profile order, names, parentage, optional biography/residence and
  Instagram destinations. Long names and family details grow naturally.
- Events retain authored array order and day/place grouping. Only an immediately
  adjacent Location with matching data and no embed can share the event action
  slot. Other locations render independently. Missing dates/maps stay truthful.
- Gallery preserves image ordering, positional crop roles, lazy loading, broken
  media recovery and native viewer keyboard/swipe/focus/scroll-lock behavior.
  Story retains the first item's lead-image mapping and optional item photos.
- Countdown retains active, expired and missing-date states. Adjacent RSVP and
  Guestbook may share a dialog surface; their hooks, payloads, verification,
  submission states and moderation remain independent. RSVP never publishes a
  public wish. Separated sections keep their own entry points.
- Gift copies account numbers verbatim and reports success/failure beside the
  relevant control. Closing retains message paragraph roles and dynamic names.
  Music preserves the native autoplay authorization and actual player state.

## Assets and presentation

Fraunces, Marcellus and Parisienne use the existing licensed local font files.
`assets.ts` and `phase-two-assets.ts` preserve the stable illustration slots;
provenance and font licenses remain in `public/themes/gerbang-puspa/`.
Portraits, gallery, welcome and Story pictures are original temporary
**illustration placeholders**, not finished production photography. No vendor
artwork, monogram, fonts, photographs, film or audio was added.

See [VISUAL-REFINEMENT.md](./VISUAL-REFINEMENT.md) for the current thin frames,
responsive typography, short once-only reveals, reduced-motion behavior and
normal-flow layout. Historical measured geometry/timing in
[PHASE-2.md](./PHASE-2.md) and [PHASE-3.md](./PHASE-3.md) is superseded by that
refinement; their native data and interaction contracts remain authoritative.

## Validation

`lifecycle.test.ts`, `opening-handoff.test.ts` and `journey.test.tsx` cover gesture
ownership, completion fallback, reduced motion, reload policy, interruption,
SSR inert boundaries, navigation targets and preservation of authored repeats.
`pairing.test.ts` covers event grouping and Location compatibility. Existing
Loading, player, form, registry, hydration and composition tests remain applicable.

Rendered before/after screenshots and local browser evidence are in
`/tmp/gerbang-puspa-interactive-20261016/` (previous visual baseline:
`/tmp/gerbang-puspa-refinement-20261015/`). The external fixture harness imports the
actual renderer and Canvas and mocks local transport only. It does not establish
real backend writes, external CAPTCHA acceptance or physical-device behavior.

See [INTERACTIVE-REFINEMENT.md](./INTERACTIVE-REFINEMENT.md) for navigation
ownership, modal footer/tabs, saved-composition findings and production validation.
