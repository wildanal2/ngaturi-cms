# Removed template reference audit — 2026-11-14

Branch: vm-qas; starting HEAD: 2ca66b08c10e53d98de38db80c800085e0d88ee2 (matches origin/vm-qas).

## Findings

The invitations page reads the current user's invitations directly from PostgreSQL. InvitationCard previously constructed `/templates/${sourceTemplate}/card` without checking the source catalog. The generic card route exists but returns 404 when getTemplate cannot resolve the ID. Heritage Gate Motion is absent from the current catalog, section source, public assets and repository configuration. This is a stale persisted reference, not a missing generic route or evidence of stale cache.

Read-only transactions against DATABASE_URL loaded from `.env.local` found:

- 1 templates row for heritage-gate-motion, still active, with the old card URL and a composition reference.
- 1 invitation referencing heritage-gate-motion; requires manual migration.
- A count-only scan of every public base table found references only in templates (1) and invitations (1). No personal content or credentials were exported.

This audit applies to that configured database, not independently to other environments. No database writes were executed.

## Handling

InvitationCard now resolves source availability through getTemplate, retaining inactive source-backed templates independently of new-selection policy. Deleted sources use the existing neutral “Belum ada pratinjau” fallback without issuing an invalid image request and show a manual-migration status. Runtime image failures retain ThumbnailImage's neutral unavailable fallback without console.error. Original content, sourceTemplate, links and records are unchanged.

Issue #16 availability policy remains unchanged: new selection enumerates source-backed presets and applies persisted active status. Even an active database-only row cannot make a removed source selectable. The card endpoint retains 404 for unknown IDs.

Regression coverage checks removed/unknown previews, valid previews, content and Builder link preservation, absent source, handled image errors and active orphan exclusion. Existing availability tests cover inactive source compatibility. Authenticated browser acceptance is not verified by these rendering/unit tests.

## Validation

- Full Vitest suite: 107 files passed, 1 skipped; 1,015 tests passed, 33 skipped.
- Focused preview/availability/card route suite: 20 tests passed.
- Typecheck and production build passed.
- Lint: no errors; existing unused `_event` warning in navigation test.
- Authenticated browser, physical devices and other database environments: not verified.
