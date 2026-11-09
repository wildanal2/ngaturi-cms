# Gerbang Puspa interactive refinement

The native standard composition, Loading boundary, licensed fonts, original art
slots and persisted contracts remain authoritative. No new animation dependency,
schema, backend endpoint or duplicate template runtime is introduced.

## Entry and navigation ownership

- `lifecycle.ts` owns closed, opening and opened. `ngaturi:open` remains synchronous
  in Cover's existing `useOpen` gesture. Repeated gestures are harmless. Two
  independently drawn vector gate leaves animate; the flat garden SVG is intact.
  Animation end and an 1100ms timer can complete the same transition only once.
  Reduced motion completes synchronously; audio success never gates opening.
- The public Cover is fixed to the viewport and scrolls internally when necessary.
  SSR section wrappers are inert before hydration. Closed entry temporarily owns
  manual history restoration, aligns to the invitation and handles `pageshow`.
  Opening releases this ownership and the native document lock immediately.
- The initial focus/scroll handoff and menu scrolling share one interruptible
  native scroll helper. Wheel, touch, pointer and keyboard intent cancel it.
  Completion never schedules another focus or scroll. No snapping is introduced.
- The presentation owns one five-item cream dock, resolving stable rendered
  section IDs. Countdown, Events and Location share Acara; active state follows
  actual section geometry. Empty/hidden content is omitted. Multiple saved generic
  navigation sections cannot create duplicate chrome. Explicitly hidden navigation
  is respected. Builder contains the dock in its existing device viewport, while
  its native section placeholders retain editing/selection. New presets include
  a native Navigation row so visibility is directly editable. Older invitations
  without a row receive the same dock without a persisted-data migration.
- The dock and music disappear visually while any native modal is open; native
  `showModal` supplies the keyboard/accessibility boundary. Closing restores focus
  to the actual opener. Unconfigured public music is omitted, while Builder keeps
  useful missing-track feedback. Configured playback still uses `usePlayer`.

## Forms and motion

The existing RSVP instance owns its modal state. Both the dock and page CTA call
that instance's launch button. Adjacent Guestbook retains its independent hook,
controlled draft, moderation and pagination through the existing surface store.
Separated sections keep independent entry points.

Konfirmasi/Ucapan use tablist, tab and tabpanel semantics with arrow/Home/End keys.
Their DOM/state survives tab changes. The header, tabs and real submit button
remain outside one bounded scrolling body. Submit buttons use native `form` IDs,
so validation, FormData, honeypot, Turnstile and sending guards remain unchanged.
The initial focus is the close button, avoiding an unsolicited touch keyboard.
Visual viewport changes resize the dialog; short landscape retains reachable
close and submit controls.

Attendance precedes guest count. The existing endpoint requires a positive
`guest_count` even for `not_attending`; the absence UI retains the canonical value
1 without displaying attending guests in its success summary. Phone remains
optional according to existing props. Private RSVP messages and public wishes
have separate explanations and submissions.

Motion tokens live in the scoped foundation. Hero/reveals use 600ms and at most
18px movement, dock 300ms/12px, overlays 220ms, button press 120ms. Reveals run once
and default to readable content if observation/animation is unavailable. Botanical
loops pause offscreen and on document visibility events. Reduced-motion CSS and
the lifecycle reach the same functional state.

## Composition and assets

New presets use optional empty/hidden Story before Countdown/Events, one Gallery,
RSVP/Wishes, Gift and Closing. No sample personal history is generated. Empty
optional Gallery/Story scenes have no public spacing; Builder remains editable.
Saved section order, visibility, props and repeated Gallery/Quote IDs are not
normalized or deleted by the renderer.

The audited live slug rendered Gerbang Puspa with two later Serambi Delima
sections. Its duplicate galleries and quote after Closing were present in the
public saved composition, not injected by the renderer or default preset. A
separate, unapplied visibility proposal is stored with the audit artifacts.
The slug alone does not establish template identity or deployed commit identity.

Existing SVG illustrations and public sample-photo URLs remain placeholders.
They are not finished personal photography. No new photo, font or audio was
copied. The architectural gate and bank icon use original vector/existing Lucide
linework, with no vendor imagery.

## Evidence

`/tmp/gerbang-puspa-interactive-20261016/` contains the public read-only audit,
matching local saved-composition fixture, production screenshots, interaction
recording, command logs and browser assertions. Its external app imports the
actual renderer, registry and Canvas. Form transport is mocked locally. The
repository's own production preview route is checked separately with its actual
standalone build. No frontend check establishes real backend/CAPTCHA acceptance,
physical-device behavior, deployment or saved-composition repair.
