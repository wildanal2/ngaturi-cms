# Combined QA: #17, #18, #25 — 2026-11-14

## Scope and isolation

Branch vm-qas, initially clean at d67f47e94cc3c49c189a5ff1f7d33d9f6a957cdf. Relevant local commits:

- #17: d67f47e94cc3c49c189a5ff1f7d33d9f6a957cdf
- #18: 13ec208e0e214f76d864d159d1a204e68279842d
- #25: a0b69502a752467d3d12bf2fc5d376c59a9f7589

App ran on loopback port 3060 with isolated PostgreSQL 16 (tmpfs, new database, verified self-signed test TLS) and Redis 7 containers. Existing containers/volumes and production data/configuration were not touched. Existing repository SQL migrations were applied only to the fresh disposable database. App startup suppressed dotenv merging and supplied only explicit testing configuration, including dummy Google credentials. Chromium headless used the repaired private libxkbcommon0 installation. Browser network access was restricted to loopback and Deezer API/CDN; no browser endpoint was mocked.

Users, roles, invitation records and historical responses were fixtures. Sessions were issued by the actual Better Auth internal adapter into real isolated Redis and validated by the app against real fixture users in PostgreSQL. This proves session handling, NOT Google OAuth or user identity verification. Secrets, cookies and personal tokens were not printed. Rate-limit keys in isolated Redis were reset between independent security scenarios; real limiting code remained enabled. Browser/API writes affected only disposable test data.

## Acceptance matrix

| Issue | Criterion | Result |
| --- | --- | --- |
| #17 | Anonymous protected page redirects with full destination/query | PASS |
| #17 | Valid Better Auth test session visiting /login redirects to invitations | PASS |
| #17 | Internal callback and query retained | PASS |
| #17 | External, protocol-relative, login-loop and auth-endpoint callbacks fall back safely | PASS |
| #17 | Expired real test session cannot enter protected page | PASS |
| #17 | User denied admin destination, admin allowed | PASS |
| #17 | Authenticated UI logout clears protected access | PASS |
| #17 | Real Google success/failure/cancel/consent | NOT VERIFIED: no testing Google credentials/account |
| #18 | Builder Deezer preview decodes real audio | PASS |
| #18 | Choose, real authenticated autosave to PostgreSQL, reload persist stable URL | PASS |
| #18 | Change music persists a different track | PASS |
| #18 | Public Opening playback and Play/Pause | PASS |
| #18 | Expired signed CDN URL returns 403; stored track identity recovers playback | PASS |
| #18 | Invalid URL/media loading failure leaves player stopped | PASS |
| #18 | Reload after fixture failure restores valid persisted playback | PASS |
| #18 | Console/network audit | PASS with expected test-induced errors described below |
| #18 | Safari/iPhone and physical speaker output | NOT VERIFIED: manual device QA pending |
| #25 | Personal RSVP form without login stores authorized guest identity/count | PASS |
| #25 | Cards guestbook form and historical greeting | FAIL before follow-up fix; PASS after fix |
| #25 | Invalid token, wrong name and cross-invitation requests rejected for both endpoints | PASS |
| #25 | Duplicate RSVP does not change original response | PASS |
| #25 | Two concurrent requests produce exactly one insert (HTTP 200 + 409) | PASS |
| #25 | Party size above guest bound denied; tokenless direct writes rejected | PASS |
| #25 | Historical unlinked RSVP preserved; guestbook reload still reads historical message | PASS |
| #25 | Generic-link real form cannot impersonate a named guest | PASS |
| #25 | Injected payload IDs cannot replace server-derived identity/invitation | PASS: IDs ignored; authorized guest remains the target |
| #25 | Shared chat guestbook form | PASS |
| #25 | Authenticated owner dashboard displays historical RSVP | PASS |

Final browser counts: #17 seven PASS/one NOT VERIFIED; #18 eight PASS/one NOT VERIFIED; #25 eleven PASS after follow-up fix. First harness runs needed correction for fixture section IDs, cover selectors and a required phone field; these were fixture issues, not application fixes.

## Music evidence

Actual native Builder and public Navy Elegan invitation, without fixture page/source modifications. Two real Deezer previews were loaded into the isolated music catalog. Audio was not mocked: checks required HTMLAudioElement.readyState >= 2, paused=false and advancing currentTime across a delay. Browser decoded real provider media following click/Opening gestures; no forced autoplay flag was used. Existing prior native Lakon Kencana/Serambi Delima checks are documented in issue-18-music-playback-audit.md.

No uncaught page errors occurred. Captured console errors: 26 `net::ERR_FAILED` messages while unrelated external assets were deliberately blocked and one expected HTTP 400 from the invalid-audio test. The only failing audio HTTP request was the intentional invalid endpoint. Fresh playable media and repaired expired sources succeeded. This does not prove physical audibility or Apple autoplay behavior.

## Follow-up bug and minimal fix (#25)

The legacy GuestbookCards component bypassed postInvitationForm and posted raw FormData JSON directly. Therefore a valid personal-link visit omitted guest_token and the backend rejected the legitimate message (HTTP 403). Shared guestbook variants already used the authorized transport.

Only GuestbookCards was changed to use postInvitationForm, retain input on rejection, show the returned error, and skip submissions without invitation ID/inside preview. Three regression tests cover shared transport use, preserved input on rejection, and preview no-op. Browser submission then returned HTTP 200 and persisted the message in PostgreSQL; cards and chat flows both passed. Backend authorization was not weakened or rewritten.

## Automated verification

- Targeted: 83 tests PASS in 13 files.
- Full suite: 1,064 PASS, 33 skipped (113 files passed, 1 skipped).
- Typecheck PASS.
- Lint PASS with one existing unused `_event` warning in navigation tests.

Private temporary harness/artifacts: /tmp/ngaturi-combined-qa/{qa.mjs,music.mjs,results.json,music-results.json,pre-fix-results.json,targeted.log,full-tests.log,typecheck.log,lint.log}. No auth secrets are included in this report or GitHub comments. Disposable runtime/services are stopped after QA. No push, merge, deployment, dependency installation or production migration.

## Issue disposition

#17 remains OPEN pending genuine Google OAuth acceptance. #18 remains OPEN pending Safari/iPhone/physical-device acceptance. #25 technical browser criteria passed after the follow-up fix; remains OPEN pending the owner's acceptance required in the prior instructions. #16 was not read or changed. No issue is closed by this run.
