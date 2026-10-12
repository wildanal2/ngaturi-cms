# Gerbang Puspa Phase 3

Six dedicated variants complete the native section preset: Countdown, RSVP,
Guestbook, Gift, Closing and Music. Phases 1–2 and the standalone stay unchanged.
No backend, schema, submission endpoint, payment or unrelated template changes
are included.

## Native contracts and presentation

- Countdown uses `useCountdown` and its existing tick/cleanup lifecycle. Active,
  expired and missing-date states remain distinct. The baseline shows four zero
  units for an actual expired target; no reference date or fake readiness is used.
- An adjacent RSVP owns the dialog launched inside Countdown's existing visual
  slot. An adjacent Guestbook contributes its independent form and list through
  presentation-only portals. Each instance keeps its own hooks/state. The surface
  store contains only DOM targets and active-form/pairing metadata.
- RSVP uses `useRsvp` unchanged, including honeypot, canonical payload fields,
  sending guard, validation errors and success summary. Phone is optional according
  to `require_phone`; the local country-prefix control produces the existing single
  `phone` field. Full international numbers are retained. Guest count replaces the
  reference Group field because self-reported group persistence is unsupported.
- Guestbook uses `useGuestbook` unchanged, including native limits, server moderation,
  fetch cancellation, retries and six-item client pagination. RSVP never publishes
  a wish. Public wishes have a separate submit control and truthful result. No
  attendance badge is fabricated from unrelated RSVP data.
- One public native dialog owns one scrolling white surface. Native Escape,
  focus trapping/restoration, scroll-lock cleanup and labelled controls remain.
  Only the active form mounts the existing `TurnstileField`; forms preserve their
  independent verification and transport. Builder renders independent inline
  forms, disables submissions and keeps the host scroll unlocked.
- Gift uses only `bank_accounts[]`/`intro`. Numbers are copied verbatim; failure
  never reports success. Missing numbers disable the copy action, missing accounts
  have an empty state, and multiple/long accounts grow naturally. An original local
  bank SVG is a broken-logo fallback, with Phase 3 provenance.
- Closing retains the corrected frame floor: 607px on mobile, 585.4px on desktop,
  maximum 350px width, original paragraph spacing and 175px botanical footer. The
  existing message's blank-line paragraphs supply main text, thanks and signoff;
  names use the existing data. Longer content grows without clipping.
- Music uses `usePlayer` unchanged. It never starts at readiness, uses the existing
  Opening gesture/autoplay setting, and exposes actual play/pause/unavailable/error
  state. The 40px control remains at the audited viewport corner with safe-area
  insets; Builder contains it inline. No production audio is shipped.

## Accepted differences

- **NGATURI INTENTIONAL IMPROVEMENT:** independent form tabs and statuses in one
  surface, native guest count/optional phone/maybe attendance, keyboard/focus/scroll
  cleanup, honest moderated/copy/media states, native country selection, and deep
  maroon labels/icons on the original orange controls for contrast. The reference
  white text on orange is below text contrast requirements. These scoped colours
  preserve the existing surfaces and geometry.
- **DATA-CONTRACT LIMITATION:** no unsupported Group field or attendance badges on
  wishes, no combined RSVP/public-wish submission, and Closing's paragraph roles
  share its existing message field. Missing source dates/accounts/audio do not
  acquire invented production values.
- **RIGHTS/ASSET LIMITATION:** original illustrations and licensed substitute font
  roles remain. No vendor photos/artwork/monogram, Against/English111 binaries or
  blocked audio/video are added. A locally generated silent WAV outside the
  repository exercises actual playback only during comparison.
- **IMPLEMENTATION MISMATCH:** measured geometry/spacing/motion differences must
  be corrected before acceptance, rather than hidden by a redesign.

Validation uses the actual renderer/registry and Builder in an external temporary
Next app with local API fixtures. Production endpoints/hooks/CAPTCHA components
are not replaced. This verifies frontend integration and error handling; it does
not claim real backend writes or a configured external CAPTCHA acceptance.
