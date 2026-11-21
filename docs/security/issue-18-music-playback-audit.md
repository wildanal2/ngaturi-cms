# Issue #18 — expiring Deezer previews

## Evidence and cause

The issue screenshot shows a Deezer preview failing in MusicPickerField. Selection/search previously supplied and persisted a signed CDN preview URL directly. Read-only inspection of the configured `.env.local` database found one Deezer music reference whose signed URL expired on 2026-10-16 and returned HTTP 403. No database records were changed or exported. A newly obtained preview returned audio/mpeg HTTP 200 and decoded in Chromium after a real click, with currentTime advancing. This distinguishes expired-source failure from browser autoplay policy.

## Change

Deezer tracks now use `/api/music/deezer/<numeric-id>` for picker preview and selection. This public endpoint retrieves current provider metadata with no-store and redirects without caching to an HTTPS dzcdn.net preview; invalid IDs, missing previews, untrusted destinations and upstream failures are rejected. It does not proxy arbitrary caller URLs. Native music variants (including Lakon Kencana's separate player) derive this stable URL for historical `deezer:<id>` props, preserving saved content and requiring no data migration. Uploads/custom URLs and other providers retain their existing URLs. Playback remains tied to the existing click/Opening gesture.

## Browser environment and checks

Ubuntu 22.04, apt/dpkg. Only libxkbcommon.so.0 was missing according to ldd. Passwordless sudo was unavailable, so `apt-get download libxkbcommon0` and `dpkg-deb -x` installed a private copy under `/tmp/ngaturi-browser-libs/extracted`. LD_LIBRARY_PATH points to that directory. Cached Playwright drove cached Chromium headless_shell-1161; headless launch and page navigation succeeded. No project dependency or production Docker/deployment change was made.

Nine local browser checks passed with actual HTMLAudioElement decoding (readyState >= 2, !paused and advancing currentTime), not a mocked play() promise:

1. Actual MusicPickerField selects and stores a stable track URL in isolated fixture localStorage.
2. Preview starts decoding and currentTime advances after clicking Play.
3. Pause sets paused=true.
4. Reload retains fixture selection and Play resumes decoding.
5. Public-mode cinematic player handles Opening and repairs a legacy signed source using track_id.
6. Invalid endpoint/audio loading failure leaves the player stopped with aria-pressed=false.
7. Cinematic preview does not autoplay on Opening.
8. Native Lakon Kencana renderer/cover/music plays after the opening gesture.
9. Native Serambi Delima renderer/cover/music plays after opening and clicking Play.

Tests ran through a temporary local-only fixture using real components and full native template renderers. The catalog list was intercepted with a known provider track; provider API and audio CDN requests were real. All unrelated remote browser requests were blocked. The fixture server overrode database/Redis URLs to an inaccessible loopback port, and the fixture was removed after testing. Native cinematic full-template interaction was not established under the isolated loading/cover fixture; the standalone cinematic player passed. Fixture harness timing/cover failures were corrected before the final nine-check run.

Artifacts: `/tmp/ngaturi-18-browser.mjs`, `/tmp/ngaturi-18-browser-results.json`, `/tmp/ngaturi-18-dev.log`. The fixture URL in the script is no longer served after cleanup.

## Validation and limits

- Targeted tests: 12 passed (playback URL, provider endpoint and shared player).
- Full suite: 1,036 passed, 33 skipped.
- Authenticated database autosave/save/reload, physical-device audibility and production provider/CAPTCHA acceptance were not tested. Browser media decoding does not prove physical speaker output.
- #25: Chromium is now available, but complete browser-to-isolated-PostgreSQL RSVP/guestbook acceptance was not run. Existing mocked tests passed as part of the full suite; #25 remains OPEN pending owner-approved full QA. #16 was not touched.

Keep #18 OPEN pending authenticated persistence and owner browser/device acceptance. No push, deploy, migration or production data mutation.

Final checks: typecheck PASS after removing stale generated type references to the temporary fixture; lint PASS with one existing unused `_event` warning in navigation tests. Build was not rerun; browser execution, typecheck and tests cover this scoped change.
