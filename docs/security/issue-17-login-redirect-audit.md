# Issue #17 — already signed-in visitors on /login

## Reproduction and root cause

Issue #17 asks that an already authenticated visitor should not return to the login form. The old /login page was entirely a client component: it rendered LoginForm unconditionally and never called the authoritative getSession helper. A regression test supplying a valid mocked session failed before the fix: the page returned React.Suspense/LoginForm instead of redirecting. This reproduces the missing guard at component level, not a real Google login.

The proxy only checks cookie presence for protected routes; /login is public. Server helpers already verify the Better Auth session and recheck active account status, and protected layouts enforce user/admin permissions. Cookie presence alone must not redirect /login, because stale/forged cookies would cause loops. Logout awaits Better Auth signOut before navigating to /login; no changes to sessions, role checks, OAuth provider configuration or logout were needed.

## Fix

/login is now a server page that uses getSession and redirects an authenticated active user to a sanitized internal destination (default /invitations). The client-only Google form is retained in login-form.tsx. Both the authenticated redirect and Google callback use the same server-computed destination. Existing next and legacy redirect parameters remain supported. External/protocol-relative URLs, backslash/control/encoded ambiguity, malformed input and login/auth-endpoint loops fall back to /invitations. Role restrictions remain enforced by destination layouts; regular users directed to /admin still pass requireAdmin.

The proxy now preserves the destination query as well as pathname when sending anonymous users to login. The form reports a failed sign-in request and restores the retry button rather than leaving an unhandled rejection/loading state.

## Validation

- Regression test failed before the change and passed afterward.
- 42 targeted tests passed across login guard, safe destinations, proxy, authoritative session/role helpers, auth configuration and auth route wrappers.
- Full suite: 1,061 passed, 33 skipped.
- Chromium headless used the previously repaired private libxkbcommon0 installation. Local browser checks verified anonymous login rendering, protected-route redirect with query retention, safe callback request payload, recoverable simulated OAuth failure, replacement of an external callback, and denial of admin access with a forged cookie. Anonymous POST /api/auth/sign-out returned HTTP 200.
- API sign-in/social failure was intercepted locally, not a real provider authentication. The local server used inaccessible loopback database/Redis URLs and isolated auth settings. No production submissions or database writes occurred.
- Artifacts: /tmp/ngaturi-17-browser.mjs and /tmp/ngaturi-17-browser-results.json.

Browser authentication acceptance is NOT VERIFIED: real Google success/failure/cancel, persisted/expired real sessions, authenticated logout, role-to-role navigation, browser back/reload and multi-tab behavior require isolated accounts/database and owner QA. Logged-in redirects and active/suspended/deleted account and admin decisions were tested with mocks only. Keep #17 OPEN until these are verified. No other issues, production configuration, dependencies, migrations, push or deploy are part of this change.

Final checks: typecheck PASS; lint PASS with one pre-existing unused `_event` warning in nav-shared.test.ts. Build not rerun; local Next browser execution, typecheck and tests covered the change.
