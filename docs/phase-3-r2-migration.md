# Phase 3 — Cloudflare R2 migration

This phase prepares R2 coexistence without provisioning a bucket, changing DNS,
copying production objects, rewriting stored URLs, or deleting legacy storage.

## Storage and URL contract

| Runtime/path           | Object write                           | Public URL returned                 |
| ---------------------- | -------------------------------------- | ----------------------------------- |
| Node application       | Existing signed S3-compatible request  | Legacy `S3_PUBLIC_URL`              |
| Worker application     | `MEDIA_BUCKET` binding                 | R2 Custom Domain in `R2_PUBLIC_URL` |
| Existing presign route | Existing legacy S3-compatible endpoint | Legacy `S3_PUBLIC_URL`              |

`R2_PUBLIC_URL` is a non-secret Worker variable and is required by the Worker
runtime contract. It must be an HTTPS R2 Custom Domain; `r2.dev` is rejected.
`MEDIA_BUCKET` remains a binding, never a bucket credential or hardcoded name.
Missing Worker configuration fails before an upload can return a misleading URL.
Once Worker uploads have created R2-backed URLs, configure the same non-secret
`R2_PUBLIC_URL` in the Node rollback environment so re-crop and OG generation
continue trusting both origins; Node writes still go to legacy storage.

New Worker objects keep the existing keys:

- Images: `invitations/<invitation-id>/<uuid>.webp`
- Audio: `invitations/<invitation-id>/audio/<uuid>.<extension>`

Node keeps the existing storage endpoint and key layout. This allows copied
objects to preserve keys and makes runtime rollback independent of URL rewriting.

## Legacy compatibility

Invitation content stores absolute media URLs inside `sections` and
`global_settings`. Those values are rendered as stored; the migration does not
rewrite them. Legacy storage and `S3_PUBLIC_URL` must remain publicly readable
throughout the rollback window.

The narrow server-side trust boundary used for image re-crop and invitation OG
images accepts exactly the configured legacy `S3_PUBLIC_URL` and new
`R2_PUBLIC_URL` prefixes. It compares parsed origins and path prefixes, not raw
hostname strings. Other origins are not added to this SSRF-sensitive allowlist.

During staging:

- Old records continue referencing their legacy absolute URLs.
- New Worker uploads return the R2 Custom Domain URL.
- Re-cropping an old image reads the trusted legacy URL and writes a new object
  to R2, returning the new URL.
- Node rollback continues creating legacy-storage URLs.

Do not disable the legacy origin until stored invitation data, database media
references, backups, and retained rollback versions no longer require it.

## Upload policy

The supported migration path remains browser → application upload route →
Cloudflare Images for images → `MEDIA_BUCKET`. Audio bypasses image processing
and writes directly through the same storage abstraction.

The existing presign route is not used by the current Builder and remains tied
to legacy S3-compatible storage. Direct browser-to-R2 upload is a future
optimization. Before enabling it, add all of the following together:

- Exact-origin R2 CORS for the required methods and headers.
- Server-side upload completion or object-existence verification.
- Invitation ownership and entitlement validation at completion time.
- Content-type, object-size, and key validation based on the stored object.

Do not enable browser `PUT` CORS merely because the unused presign route exists.

## Metadata and garbage collection

`media_assets` records a key, absolute URL, size, MIME type, dimensions, and
processing metadata, but it is not currently an authoritative object manifest:

- Image metadata insertion is best-effort after the object write.
- Audio uploads do not create a `media_assets` row.
- Invitation JSON can contain media URLs without a matching metadata row.
- External music and template assets are also represented by URLs.

Migration inventory must therefore come from the legacy object store plus a
scan of persisted invitation URLs; `media_assets` alone is insufficient. Phase 3
does not add a schema, backfill, manifest, or garbage collector. No object may be
garbage-collected based only on the absence of a `media_assets` row.

## Staging migration procedure

1. Provision an isolated staging R2 bucket; record its ownership and retention
   policy without committing its name or credentials here.
2. Add it as the staging Worker `MEDIA_BUCKET` binding.
3. Attach a staging R2 Custom Domain and set its HTTPS origin as
   `R2_PUBLIC_URL`. Do not enable or depend on `r2.dev`.
4. Because uploads remain application-proxied, configure only CORS proven
   necessary for public media reads. Use exact application origins and only
   `GET`/`HEAD`; do not add browser `PUT` yet.
5. Inventory legacy objects by key, size, content type, checksum/ETag where
   reliable, cache metadata, and prefix. Separately inventory absolute media
   URLs in invitation data and `media_assets`.
6. Copy objects to R2 while preserving keys and content/cache metadata where
   possible. Do not delete or mutate the source.
7. Compare per-prefix object counts and byte totals, then verify checksums or
   download hashes for a representative sample and all high-value outliers.
8. Verify existing stored legacy URLs still render, play, and can be re-cropped.
9. With staging bindings, verify image processing and audio uploads write to R2
   and return the Custom Domain URL; verify those URLs from a clean browser.
10. Keep legacy objects, credentials, public origin, and the Node runtime
    available until staging acceptance and the production rollback window end.

Production media copy, DNS cutover, URL rewriting, direct uploads, object
deletion, garbage collection, and Published Snapshot manifests remain outside
Phase 3.
