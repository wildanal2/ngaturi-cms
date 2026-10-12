# Gerbang Puspa Phase 2

Five dedicated native variants extend the locked opening: `couple-intro`,
`event-details`, `map-location`, `gallery`, and `story`. The standard registry,
persisted contracts, renderer and Builder remain authoritative. Phase 1 and the
standalone are unchanged. No backend/schema or later-section work is included.

## Presentation and data

- Couple presents bride then groom, with proportional oval portraits, original
  botanical layers, names, parentage, optional profile/residence, and real
  Instagram fields. The measured 1109px scene is a minimum, allowing longer copy.
- Events preserve saved order. Adjacent events sharing a date, venue, address and
  directions URL use one card; different groups use additional cards. Dates retain
  the authored calendar day, with the existing Google Calendar action per event.
- A matching immediately adjacent Location puts its own directions CTA into the
  Events card's reserved slot. Its animation follows that card's actual reveal
  timeline. It remains independently registered, persisted and selectable. Different
  location data, an embed, or multiple event groups render a separate framed location.
  This does not assume an iframe in the baseline or add a map provider. Missing maps
  show available address data and a fallback; existing embed URLs load lazily.
- Gallery keeps the first two 300px rows full-width and subsequent photos paired.
  Grid and viewer state are local to each instance; any image count is accepted.
  Native lazy media has missing/broken-image fallbacks, including errors that finish
  before hydration. Source changes can recover without remounting the section.
- Story uses the first item's optional image as the panel's lead photograph.
  Subsequent optional photographs accompany their own items. Titles, dates and body
  remain in authored array order; no year sorting or four-item constraint is added.
  The measured 1043.4375px scene is a minimum and grows naturally.

Phase 2 reuses the locked reveal primitive, including its 3s fades/zooms, profile
800ms delay, heading 500ms delay and event-title 1500ms delay. Builder removes
decorative waits in these variants; reduced motion remains immediate. Scrolling
stays native with the existing public/Builder owners.

## Difference classification

- **IMPLEMENTATION MISMATCH:** fix measured layout/spacing/crops/motion differences;
  do not use speculative redesign to compensate for missing assets.
- **NGATURI INTENTIONAL IMPROVEMENT:** retain native gallery Escape, arrow keys,
  focus trapping/restoration, swipe, dialog semantics and shared scroll-lock cleanup;
  add per-event existing calendar actions and dynamic Instagram destinations. The
  viewer preserves its pre-lock content width so native scroll locking does not
  enlarge the image. Native focus indicators and scrollbar locking can differ.
- **RIGHTS/ASSET LIMITATION:** use the standalone's independently authored bride,
  groom, six gallery and Story SVG substitutes, with hashes in
  `public/themes/gerbang-puspa/phase-two-provenance.json`. No vendor photography,
  distinctive artwork, monogram, Against/English111 binaries or media is added.
  Phase 1's licensed font substitutions remain unchanged.
- **DATA-CONTRACT LIMITATION:** Gallery has no saved focal-position field, so its
  measured first/second/paired focal roles follow array positions. Story has no
  dedicated shared-photo field, so the first item's image supplies the lead photo
  and its absence uses original local art. Arbitrary dates, locations, photos and
  longer copy expand the baseline layout instead of clipping or discarding data.

Asset slots live in `phase-two-assets.ts`. Final rights-cleared replacements can
use those slots without changing components or persisted schemas. Production code
contains no reference people's names or reference narrative text.
