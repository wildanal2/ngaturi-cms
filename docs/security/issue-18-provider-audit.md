# Issue #18 — music provider & upload reliability audit (2026-11-20)

## Running commit verified first

dev.ngaturi.com is served by container `ngaturi-bind-dev-app-1` running `next dev`
with the repository bind-mounted from `/home/okee/ngaturi` (`./:/app`). That
checkout was clean on `vm-qas` at `ed4aff69c41acde6a52acaa24e8ad495e9e36f48`,
equal to `origin/vm-qas`; `/api/music/deezer/<id>` (added in 13ec208) answered
307 on dev. Note: because of the bind mount, updating that checkout *is* the
DEV deployment. This fix was developed and QA'd in a separate worktree and only
pushed; the DEV checkout was not touched.

## Root causes found

| # | Symptom | Root cause | Evidence |
| --- | --- | --- | --- |
| 1 | Every Builder upload (image and audio) on DEV → HTTP 500 | `putObject` passed a signed `Request` to `fetch`. Next.js' patched fetch rebuilds Request inputs around the body *stream*, which Node sends `Transfer-Encoding: chunked` without `Content-Length`; R2 answers 411 Length Required | DEV log: `Error: Object upload failed with status 411` at `putObject` for every `POST /api/uploads 500` (images line 252, audio line 189). Reproduced against an R2-like store: baseline PUT `te=chunked, cl=null → 411`; fixed `cl=352844 → 200` |
| 2 | Builder showed `Failed to execute 'json' on 'Response': Unexpected end of JSON input` | Unhandled exceptions in `/api/uploads` produced a non-JSON 500; both upload callers did `res.json()` unconditionally | Baseline Chromium: toast text above, HTTP 500 empty body |
| 3 | Audius tracks offered that never play | Audius search returns deleted tracks (`is_delete`, stream → 404 `track not found`) and stream-gated tracks (`access.stream=false`, → 403 `track not streamable`) | 5 of 45 Audius results unplayable in the provider audit; baseline picker offered 3+ dead tracks for "Perfect Ed Sheeran" |
| 4 | iTunes track: preview fails, but selecting still saves it; invitation silent | iTunes previews are AAC in MP4 (`audio/x-m4p`/`x-m4a`). Chromium builds without proprietary codecs (Playwright Chromium, some distro builds) report `canPlayType('audio/mp4; codecs="mp4a.40.2"') === ""`; the picker offered them and `choose()` saved without checking | Baseline Chromium: 3/3 iTunes previews `MediaError 4` (SRC_NOT_SUPPORTED) yet select+save PASS and public playback FAIL |
| 5 | A failing provider could overwrite a working selection | `choose()` wrote `audio_url` without verifying the source loads | Baseline: with `/api/music/deezer/*` returning 502, the previous track ID was replaced |
| 6 | Search failure looked like "Tidak ada hasil" or an endless "Mencari…" | Non-OK → empty results; network rejection swallowed without state | Baseline: search 500 rendered "Tidak ada hasil" |
| 7 | Search handed out expiring URLs | Deezer `preview` is a signed URL with `exp` ≈ now + 15 min; the search API returned it verbatim (picker converted it, but the API itself was unsafe to persist) | Provider audit: every Deezer preview `expiresIn ≈ 0.3 h` |

Jamendo errors reported inside HTTP 200 (`headers.status != "success"`) were
also treated as "0 results"; they are now reported as unavailable.

## Fixes (minimal)

- `src/lib/storage/index.ts`: sign with aws4fetch, then `fetch(url, { body: <original bytes> })` so the body is sized.
- `src/app/api/uploads/route.ts`: catch-all returns JSON 500.
- `src/lib/uploads/client.ts` (+ `music-picker.tsx`, `field-editors.tsx`): parse upload responses tolerant of HTML/empty bodies; readable message.
- `src/app/api/music/search/route.ts`: drop unstreamable Audius tracks; return `/api/music/deezer/<id>` instead of signed previews; tag each result `format`; report failing providers in `unavailable`; Jamendo in-body errors count as failures.
- `src/lib/music/browser-playback.ts` (+ picker): hide results whose `format` the browser cannot decode (with a visible count); probe a track loads before saving it — on failure show a clear error and keep the previous selection; show search/provider errors explicitly.

No provider protection was bypassed, nothing is downloaded or proxied: audio still
streams from the provider CDN (the Deezer endpoint only redirects to a fresh
official preview URL).

## Provider audit (server-side, 2026-11-20)

7 queries, every result the picker would show, ranged GET following redirects:

| Provider | Results | Final status / type | CORS | Expiry |
| --- | --- | --- | --- | --- |
| Deezer | 78 | 78 × 206 `audio/mpeg` | `*` | signed `exp` ≈ 15 min after search |
| iTunes | 97 | 97 × 206 AAC (`audio/x-m4p` / `audio/x-m4a`) | `*` | none observed |
| Audius | 45 | 40 × 206 `audio/mpeg`; 4 × 404 deleted; 1 × 403 gated | `*` | stable `/v1/tracks/<id>/stream` redirects to a fresh signed URL |
| Jamendo | 57 | 57 × 206 `audio/mpeg` | origin echoed | `from=` param not enforced; 1 h old URLs still 206 |

First-pass network `TypeError`s (17) all succeeded on retry (concurrency of the audit itself).

## Chromium acceptance (real app, real providers, audio not mocked)

Setup: app from the fix worktree and a baseline worktree at ed4aff6, both `next dev`
on loopback; disposable PostgreSQL 16 (tmpfs, verified TLS) + Redis 7 with
migrations and seeded templates; R2-compatible mock enforcing `Content-Length`
for uploads. Sessions issued by Better Auth's internal adapter (NOT Google OAuth).
Headless Chromium 134 (Playwright 1.51.1) with privately extracted libxkbcommon0.
Per song: preview (`readyState ≥ 2`, playing, `currentTime` advancing) → Pakai →
autosave verified in PostgreSQL → Builder reload shows the track → public Navy Elegan
invitation: open seal, playing and `currentTime` advancing.

| Check | Baseline ed4aff6 | Fixed |
| --- | --- | --- |
| Deezer × 3 (Perfect; Perfect (Acoustic); Perfect Ed Sheeran Beyoncé) — all steps | PASS | PASS |
| Audius × 3 (Violin cover; AlexXx57; Dave Moffatt) — all steps | PASS, but 3+ dead tracks offered | PASS, 0 dead offered |
| Jamendo × 3 (Wedding; Wedding Music 2; Wedding Piano 14–60 sec) — all steps | PASS | PASS |
| iTunes × 3 (A Thousand Years …) | FAIL: preview MediaError 4, still saved, public silent | Not offered in this browser (11 hidden, count shown) |
| Search returns signed Deezer URLs | yes | no |
| Deezer endpoint fails while choosing | previous selection overwritten | error toast, previous kept |
| Search API 500 | "Tidak ada hasil" | alert "Pencarian gagal (HTTP 500)…" |
| Audio upload → save → public playback | FAIL: HTTP 500 empty body, JSON crash toast | PASS |
| Image upload (API) | FAIL: HTTP 500 | PASS |

Fixed run: no page errors; console errors only from the intentional 502/500
tests and Audius artwork mirror 503s (images, not audio).

## Not verified

- iTunes playback in an AAC-capable browser (Chrome/Safari/Edge); only Chromium without proprietary codecs was available.
- A real R2 write: verified via DEV logs (411) and an R2-like mock; DEV upload must be re-checked after DEV picks up the commit.
- Safari/iPhone autoplay and physical speaker output.

## Remaining risks (not changed)

- `/api/music/deezer/<id>` calls the Deezer API on every public playback; Deezer's per-IP quota could make heavy traffic return 502. Players stay stopped on failure; caching the fresh URL for a few minutes would reduce the risk.
- Jamendo intermittently answers `success` with 0 results for the same query (observed twice); the picker shows fewer results, not broken ones.
- Tracks can be deleted upstream after selection (Audius 404); playback then stays stopped.

## Automated checks

Regression tests: `src/lib/storage/index.test.ts` (Next-style request rebuild against a
local server that answers 411 without Content-Length), `src/app/api/uploads/route.test.ts`
(JSON on storage/session failure), `src/lib/uploads/client.test.ts`,
`src/app/api/music/search/route.test.ts`, `src/lib/music/browser-playback.test.ts`.
Each new route/storage test fails on ed4aff6 and passes with the fix.
Full suite 1,081 PASS / 33 skipped; typecheck PASS; lint PASS (one existing `_event` warning).
