# Gerbang Puspa — adaptation Phase 1

The standard section registry owns four dedicated `gerbang-puspa` variants:
Loading, Cover, Hero and Quote. The catalog preset stops at Quote. No later
section, composition type, persisted contract or backend has been introduced.

`standalone/gerbang-puspa/` remains the independent visual reference. Production
components import no standalone runtime, fixtures or business simulation.

## Shared presentation

`foundation.module.css` scopes the cream, dusty pink and maroon palette, legal
font roles, stationery, surfaces, portrait framing, dividers and motion.
`primitives.tsx` provides data-derived names/initials, layered floral ornaments
and once-only reveals. `assets.ts` lists independent temporary art; its stable
paths can receive future rights-cleared replacements without changing section
contracts. CSS background/font URLs use those same stable theme paths.

`opening.tsx` supplies a presentation context and centered maximum 500px column
over a fixed public pastoral backdrop. Builder uses its existing device scroller
and a contained backdrop. Its viewport height and desktop composition come from
that device, not the host window. `content.ts` is server-safe section detection.

## Native lifecycle and data

Loading uses `InvitationLoadingBoundary` and its readiness state, with a
first-view asset/font provider. The loader adds no readiness timer or audio
player. The existing boundary's bounded preparation/dissolve policy remains
authoritative.

Cover uses persisted `names`, `tagline`, `note` and `button_label`, plus native
guest-name injection. `useOpen()` synchronously dispatches `ngaturi:open` in the
button gesture, preserving the existing music lifecycle. Closed public content
is inert and scrolling is locked. Opening releases both immediately, retains
the cover in document flow, runs its 500ms visual transition and hands off
scroll/focus to Hero after 1000ms. Cleanup restores owned scroll styles.

Hero uses persisted `couple_names`, `event_date`, `tagline`, optional `bismillah`
and `background_image`. Its numeric date preserves the persisted ISO calendar
day. Public text/initials retain 11s/12s delays and 3s reveals after handoff.

Quote uses only existing `text` and `source`. Separate paragraphs with a blank
line: the first is the upper quotation, the second is a welcome heading and
remaining paragraphs are welcome text. `source` remains the quote attribution.
No religious text is fixed in the component. Welcome media uses the existing
Hero `couple_image`, falling back to independent local illustrative art. Longer
copy can grow the cards/scene instead of being clipped.

## Explicit fidelity differences

- Native readiness includes Ngaturi's existing minimum/deadline/dissolve policy.
- Focus handoff, keyboard activation and inert content use native architecture.
- Reduced motion removes decorative animation and long waits immediately.
- Builder shows Hero content immediately for editing, contains all scroll/focus
  effects in its device viewport, and shows Loading as an editable static sample.
- Quote's combined paragraph layout and shared Hero image work within existing
  fields; there is no separate welcome salutation or media contract.
- Initials are independently derived from invitation data, replacing the fixed
  standalone monogram illustration.
- Long names/copy can change wrapping and height; measured baseline fixtures
  preserve the 817.1875px Hero and 807.3125px Quote minimum geometry.

## Rights boundary

Marcellus is from the confirmed Google Fonts OFL source. Fraunces and Parisienne
are legal temporary substitutes for uncleared Against/English111. Font licenses
and artwork hashes are in `public/themes/gerbang-puspa/`. Exact photography,
distinctive vendor art, vendor monogram, audio/video and proprietary font
binaries are excluded. The gate is an independent 20s CSS animation stand-in;
these files do not introduce any recording or music variant.

No vendor APIs, tracking, account routing or submission endpoints are used.
Phase 1 does not implement Couple or any later section.
