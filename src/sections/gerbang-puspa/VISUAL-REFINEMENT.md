# Gerbang Puspa visual refinement

Gerbang Puspa retains its native standard-section preset, licensed Fraunces,
Marcellus and Parisienne fonts, cream/pink/maroon palette and original asset
slots. This refinement supersedes the initial comparison's geometry and visual
timing. The earlier phase documents describe historical implementation details.

## Presentation

- A small monogram supports prominent, naturally wrapping names. The Cover has
  two complementary botanical corners and a scrollable viewport overlay on short
  public screens. Builder retains normal flow. The Hero uses a thin arch over the
  existing garden artwork and separate original vector gate leaves on entry.
- Body copy is approximately 16px. Cream sections alternate with soft pink Events
  and Countdown surfaces. Quote, Couple, Story and Closing have quieter framing.
- Portraits retain arched/oval shapes. Gallery keeps authored order with one lead
  image, paired images and a full-width final image when needed. Story retains
  the first item's lead-image mapping and editorial, left-aligned chapters.
- Events retain authored groups, dates and venues. Location is the primary
  action; valid per-event calendar actions follow it. Missing dates/maps remain
  explicit. A matching immediately adjacent Location portals its action into a
  normal-flow event slot. It follows the whole card's reveal naturally, without
  coordinate overlays or a second animation. Separated sections stay independent.
- RSVP uses a cream dialog, maroon controls, visible labels, fixed header/tabs
  and a footer linked to the actual form. One inner element scrolls. Visual
  viewport changes resize the surface. Guestbook entries use names, wishes, timestamps
  and fine dividers. Independent transport/moderation/pagination remain native.
- Gift accounts use individual stationery cards with copy success/failure next
  to each control. Account numbers are copied verbatim. Music retains the native
  player and its actual playback/error states, with a 48px safe-area-aware control.

## Opening and motion

`useOpen()` dispatches `ngaturi:open` synchronously in the opening gesture.
The existing native Loading boundary remains the only readiness owner. A
`closed → opening → opened` lifecycle releases inert content/scroll ownership
immediately and starts a 600ms Hero reveal. Two vector gate leaves open during
the 1100ms sequence; animation completion has an independent completion fallback,
not a second readiness system. The dock then enters in 300ms. An initial
scroll/focus handoff runs on the next animation frame;
wheel, touch, pointer or keyboard interaction cancels pending/running handoff.
There is no later focus timer or repeated automatic scrolling.

Other reveals use 16–18px movement, 600ms by default, at most 700ms, and short
stagger capped at 180ms. They reveal once. Decorative loops pause offscreen;
Builder removes decorative waits and confines sizing/effects to its device.
Reduced motion makes content readable immediately.

## Assets and contracts

All artwork and font paths are retained. The original generic bank placeholder
now uses cream/maroon; its provenance hash is updated. Bride/groom, welcome,
gallery and Story media remain original **illustration placeholders**, not
production photography. Broken authored media recovers through the existing
local illustration slots. No vendor art, photography, fonts or audio was added.

No persisted field, backend, API hook, CAPTCHA policy or saved section identity
was changed. Renderer/Canvas integration changes are guarded to Gerbang Puspa.
Preset order affects new invitations only; authored repeated sections remain.
RSVP never creates a public wish.

## Validation evidence

The rendered baseline and final screenshots, local fixture harness, browser
checks and command logs are stored outside the repository at
`/tmp/gerbang-puspa-interactive-20261016/`. The harness imports the actual renderer,
registry and Builder Canvas/store; it contains no duplicate template.
All RSVP/Guestbook transport uses local API mocks. Real backend/CAPTCHA acceptance,
production deployment and physical-device keyboard behavior are outside this
local validation. See the evidence report for final results and coverage.
