# Issue #25 — RSVP authorization audit

The public page resolves `?to=<slugToken>` using both invitation ID and token, but the old form transport discarded that capability. RSVP and guestbook POST accepted arbitrary names on any active public invitation. RSVP only inserted rows (there is no public update/delete handler), so duplicate submissions with another/empty phone could simulate changed attendance and inflate counts. Client-side sending/done state, CAPTCHA, IP limits, public IDs and names do not establish guest identity.

The patch forwards the existing personal token and validates it against the target invitation and stored guest name for both mutations. Client-supplied guest/invitation IDs cannot override the route or server-derived identity. RSVP records now store guestInviteId; a transaction locks the authorized guest before checking for a prior linked response and inserting. This serializes concurrent RSVP requests without schema changes. Guest count cannot exceed the authorized guest's maxGuests. UUID path validation, payload validation, public expiry, Turnstile, honeypot and rate limiting remain in force.

Personal links remain bearer capabilities requiring no login. A person who possesses another guest's full valid secret link can act as that guest; the patch cannot establish real-world identity beyond possession of the secret. Generic links remain viewable but cannot submit a verified identity: users must use a personal invitation link. No tokens are derived from names or public guest IDs.

Existing historical responses without guestInviteId cannot safely be attributed using name/phone alone. They are preserved without backfill or deletion; the duplicate guarantee applies to linked submissions. No migration, dependency, live submission or database write was used for verification.

Tests cover valid identity, wrong name, absent/invalid token, token/invitation predicate scoping, ignored injected IDs, duplicate RSVP, party size, malformed payload, existing expiry policies and shared form token transport. Database operations are mocked; production CAPTCHA and real concurrent PostgreSQL requests require owner QA. Issue #25 must remain open until that QA.

Validation: full Vitest suite 1,027 passed, 33 skipped (108 files passed, 1 skipped); targeted tests 26 passed; typecheck passed; lint passed with one pre-existing unused `_event` warning in nav-shared.test.ts. No production browser acceptance claimed.
