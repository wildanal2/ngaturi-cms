# Enchanted Garden R3F Integration Map

## Identity

- Name: Enchanted Garden
- ID: `enchanted-garden`
- Category: `wedding`
- Tier: `premium`
- Rendering: Three.js + React Three Fiber (R3F)
- 3D strategy: procedural Three.js first; GLB assets are optional future replacements
- Prototype source: `.agent-input/enchanted-garden-v2/`

## Architecture Decision

Enchanted Garden is one composition with two deliberately separate layers:

- R3F owns only the persistent visual environment, camera, lighting, fog, and particles.
- Ngaturi DOM sections own all invitation content and business behavior. `invitation.sections` and `global_settings` remain the only production content sources.

The shared journey input is a mutable normalized progress ref. Public native window scroll and the Builder's local DeviceFrame scroller produce the same `[0, 1]` contract without making the R3F tree rerender for every scroll tick.

## Composition Integration

Current Ngaturi supports `TemplateComposition = "standard" | "cinematic"`. Both `InvitationRenderer` and Builder `Canvas` reduce composition selection to `isCinematic`; a true value always mounts `CinematicComposition`. Detection also falls back to the `cinematic-vintage` hero variant. Therefore adding Enchanted Garden as another generic `cinematic` preset would incorrectly route it through the Cinematic Vintage renderer and editing policy.

Phase 2 must replace the boolean dispatch with an explicit composition identity that distinguishes:

- `standard` -> standard section flow
- `cinematic-vintage` -> `CinematicComposition` and its existing timeline
- `enchanted-garden` -> a dedicated Enchanted Garden R3F composition and journey

The catalog, composition policy, public renderer, Builder canvas, and fallback classifier must use that identity. Cinematic Vintage's core-section rules and renderer must remain scoped to `cinematic-vintage`; no renderer or timeline is shared accidentally.

## Prototype File Map

| Prototype | Decision | Future Ngaturi target | Required adaptation |
| --- | --- | --- | --- |
| `src/components/scene/EnchantedJavaneseScene.tsx` | ADAPT | `src/sections/enchanted-garden/scene/enchanted-garden-scene.tsx` | Preserve one Canvas and tone/fog setup; make positioning public-vs-Builder aware and derive quality from the real viewport/device. |
| `src/components/scene/CameraRig.tsx` | ADAPT | `src/sections/enchanted-garden/scene/camera-rig.tsx` | Keep ref-driven damping; consume the Ngaturi progress source and eliminate journey-transform allocations in the frame loop. |
| `src/components/scene/SceneController.tsx` | PORT | `src/sections/enchanted-garden/scene/scene-controller.tsx` | Retain the procedural Candi Bentar, Pendopo/Joglo, Gebyok/Pelaminan, and foliage components; rename/style only for local conventions. |
| `src/components/scene/Environment.tsx` | ADAPT | `src/sections/enchanted-garden/scene/environment.tsx` | Preserve path, courtyard, pools, and mist; freeze/tune mist for reduced motion and quality tiers. |
| `src/components/scene/Lights.tsx` | ADAPT | `src/sections/enchanted-garden/scene/lights.tsx` | Preserve the rig; freeze flicker for reduced motion and tune light count/intensity for mobile. |
| `src/components/scene/Particles.tsx` | ADAPT | `src/sections/enchanted-garden/scene/particles.tsx` | Keep instancing/buffer approach; make motion delta-based, wire density tuning, and cap counts per quality tier. |
| `src/config/journey-config.ts` | ADAPT | `src/sections/enchanted-garden/journey.ts` | Make this the single journey authority; use Ngaturi section IDs/types and allocation-free camera output. |
| `src/config/camera-path.ts` | IGNORE | `src/sections/enchanted-garden/journey.ts` | Redundant compatibility wrapper; do not create a second camera authority. |
| `src/config/section-anchors.ts` | ADAPT | derived exports from `journey.ts` | Derive DOM/navigation anchors without duplicate IDs or prototype-only section names. |
| `src/config/scene-manifest.ts` | ADAPT | `src/sections/enchanted-garden/scene-manifest.ts` | Keep procedural/GLB slots and visual constants; remove any implication that models or unused texture URLs are required. |
| `src/config/theme-tokens.ts` | ADAPT | Enchanted Garden styles plus Ngaturi globals | Keep scene palette guidance; DOM color/font ownership must use `global_settings` and supported Ngaturi font/CSS variables. |
| `src/hooks/useScrollProgress.ts` | ADAPT | `src/sections/enchanted-garden/use-journey-progress.ts` | Accept an explicit scroll owner/range; remove forced scroll-to-top and history mutation; throttle DOM state separately from the ref. |
| `src/hooks/useReducedMotion.ts` | REUSE NGATURI | shared Ngaturi composition motion handling | Do not create a competing preference source; feed one Ngaturi-owned value to camera, environment, lights, particles, and DOM. |
| `src/hooks/useSceneProgress.ts` | IGNORE | `journey.ts` selectors where needed | It is unused by the scene and encourages state-driven camera updates/rerenders. |
| `src/components/layout/InvitationShell.tsx` | IGNORE | dedicated Ngaturi composition | Prototype shell imports mock data and duplicate DOM/business orchestration. |
| `src/components/layout/ScrollProgressProvider.tsx` | ADAPT | thin Enchanted Garden stage/controller | Extract only progress-ref, quality, and optional tuning contracts; do not port its window-owned provider wholesale. |
| `src/components/dev/DevTuningPanel.tsx` | ADAPT | optional Phase 7 dev-only tool | Make scroller-aware, dynamically/dev gated, and absent from visitor bundles/UI; retain camera/light/fog/quality inspection only. |
| `src/components/overlay/InvitationOverlay.tsx` and `src/components/overlay/Section*.tsx` | REUSE NGATURI | existing registry sections | Use as visual reference only. Ngaturi supplies cover, hero, quote, couple, story, events/map, countdown, gallery, RSVP, guestbook, gift, closing, music, and navigation. |
| `src/data/mock-invitation.ts` | IGNORE | adapter over `invitation.sections` | Demo content and schema must never enter production. |
| `src/lib/types.ts` | ADAPT | local scene/journey types only | Keep only `SceneQuality`, journey, camera, and manifest contracts; discard all mock invitation/business types. |
| `src/main.tsx`, `src/App.tsx`, `src/app/page.tsx`, `vite.config.ts`, `index.html` | IGNORE | existing Next.js routing/rendering | Standalone Vite/AI Studio bootstrap and media middleware. |
| `metadata.json`, `.env.example`, `bun.lock`, prototype `package.json` scripts | IGNORE | none | AI Studio metadata, Gemini capability, lockfile, and demo tooling are not production inputs. |

### Reusable Three.js engine

- Canvas, fog, tone mapping, and DPR baseline: `EnchantedJavaneseScene.tsx` — ADAPT for containment, lifecycle, and device-aware quality.
- Camera journey: `CameraRig.tsx` + `journey-config.ts` — ADAPT for Ngaturi scroll ownership, section vocabulary, and allocation-free frames.
- Candi Bentar: `ProceduralPortal` in `SceneController.tsx` — PORT.
- Pendopo/Joglo and Soko Guru: `ProceduralPendopo` in `SceneController.tsx` — PORT.
- Gebyok/Pelaminan: `ProceduralPelaminan` in `SceneController.tsx` — PORT.
- Garden foliage: `ProceduralFoliageA` and `ProceduralFoliageB` in `SceneController.tsx` — PORT.
- Andesite path, teak inlays, pools, and mist: `Environment.tsx` — ADAPT for motion/quality.
- Ambient, moon, lantern, and stage lights: `Lights.tsx` — ADAPT for reduced motion/mobile cost.
- Fog constants: `scene-manifest.ts` + Canvas fog in `EnchantedJavaneseScene.tsx` — ADAPT.
- Fireflies and petals: `Particles.tsx` — ADAPT for delta timing and density/performance controls.
- Quality: `EnchantedJavaneseScene.tsx`, `ScrollProgressProvider.tsx`, and `Particles.tsx` — ADAPT; Builder quality cannot be inferred from the host window width.
- Reduced motion: `useReducedMotion.ts`, `CameraRig.tsx`, and `Particles.tsx` are incomplete as a set — REUSE NGATURI preference ownership, then ADAPT all animated scene parts to honor it.

## Required Dependencies

No dependency is installed in Phase 1.

| Dependency | Existing in Ngaturi? | Needed? | Action |
| --- | --- | --- | --- |
| `three` | No | Yes | Add a compatible production dependency in Phase 3. |
| `@react-three/fiber` | No | Yes | Add a React 19-compatible production dependency in Phase 3. |
| `@types/three` | No | Yes for TypeScript declarations used by the port | Add as a development dependency in Phase 3 if the selected `three` release does not provide the required declarations. |
| `@react-three/drei` | No | No for the current procedural engine | Do not install; no reusable prototype scene file imports it. Reconsider only for a future GLB feature with a concrete Drei use. |
| `react`, `react-dom`, `lucide-react`, Tailwind, TypeScript | Yes | Already supplied by Ngaturi | Use existing versions and conventions; do not copy prototype version pins. |
| `motion` | No | No | Do not install; it is unused by the prototype source. |
| `@google/genai`, `express`, `dotenv` | No | No | Do not import or install; AI Studio/backend demo dependencies. |
| Vite, `@vitejs/plugin-react`, `@tailwindcss/vite`, `esbuild`, `tsx`, `@types/express` | Not relevant to the Next.js runtime | No | Ignore prototype build/tooling dependencies. |

## Journey Contract

Production contract:

`scroll owner -> normalized progressRef.current in [0, 1] -> authoritative journey config -> CameraRig useFrame`

The prototype already keeps high-frequency camera progress in a mutable ref, so scroll does not directly rerender the R3F camera. Preserve that property. Remaining Phase 3/4/5 issues:

- `activeProgressDisplay` is set on every scroll RAF despite a comment claiming about 15 fps, causing provider/overlay rerenders; throttle or derive only low-frequency DOM state.
- `getJourneyCameraTransform()` returns fresh arrays and an object on every R3F frame; replace with caller-owned/preallocated output.
- `camera-path.ts` and `section-anchors.ts` are derived wrappers, but navigation thresholds and `JOURNEY_NAV_ITEMS` contain separate hardcoded values; derive all navigation from one journey source.
- The prototype has two stops for `hero`, duplicate anchor IDs, prototype names (`couple`, `events`) that do not equal Ngaturi types, and no distinct `map-location` stop. Align the contract with actual section IDs/types.
- Fixed progress ranges are normalized against the entire document height, so variable DOM section heights can create camera/section drift. Normalize against an Enchanted Garden journey stage/range and keep functional tail behavior explicit.
- Particle movement uses per-frame increments rather than `delta`, producing frame-rate-dependent speed; fix in Phase 7.

## Public Scroll Contract

- Owner: `window` / native document scroll.
- Scope progress to the Enchanted Garden journey stage, clamp to `[0, 1]`, and write to the shared ref in one RAF-coalesced passive listener.
- Do not copy prototype startup behavior that changes `window.history.scrollRestoration` and forces `window.scrollTo(0, 0)`.
- Public navigation may translate a journey target to window scroll coordinates, but existing Ngaturi cover, music, navigation, calendar, gallery/lightbox, and event behavior remains authoritative.
- Public-only assumptions are concentrated in `useScrollProgress.ts` (`window`, `document`, history, viewport, scroll/resize), `ScrollProgressProvider.tsx` (window width/keyboard), `SectionCover.tsx` (query string), `InvitationOverlay.tsx` (fixed chrome, Web Audio/timers), `SectionGallery.tsx` (window keydown), `SectionGift.tsx` (clipboard), and `DevTuningPanel.tsx` (clipboard/fixed UI). Only the visual engine and adapted scroll contract should cross into production.

## Builder Scroll Contract

- Owner: the existing nearest `[data-device-scroller]` created by `DeviceFrame`, never `window` or the Builder page.
- Normalize `scroller.scrollTop` over the dedicated journey stage/range and feed the same progress ref and `CameraRig` used publicly.
- The R3F container must be absolute/sticky within the device viewport rather than prototype `fixed inset-0`; it must not escape or intercept Builder controls.
- Mount exactly one Canvas for the Enchanted Garden preview and cleanly dispose it/listeners/resources on composition change or remount.
- Builder seek/selection must translate section IDs through the journey config, while business sections remain selectable/editable through the existing Builder flow.
- Quality must follow DeviceFrame/container dimensions (and a conservative preview policy), not the desktop host's `window.innerWidth`.

## Business Section Mapping

All expected concepts have authoritative registry types; no new section type is needed.

| Prototype overlay/concept | Ngaturi source | Decision |
| --- | --- | --- |
| `SectionCover` | `cover` | REUSE NGATURI |
| `SectionHero` | `hero` | REUSE NGATURI |
| `SectionQuote` | `quote` | REUSE NGATURI |
| `SectionCouple` | `couple-intro` | REUSE NGATURI |
| `SectionStory` | `story` | REUSE NGATURI |
| `SectionEvents` | `event-details` + `map-location` | REUSE NGATURI; maps stay in the existing map/event contracts |
| `SectionCountdown` and calendar link | `countdown` + existing event/calendar behavior | REUSE NGATURI |
| `SectionGallery` and lightbox | `gallery` | REUSE NGATURI |
| `SectionRSVP` simulated attendance/wishes | `rsvp` + `guestbook` | REUSE NGATURI; never copy simulated state |
| `SectionGift` | `gift` | REUSE NGATURI |
| `SectionClosing` | `closing` | REUSE NGATURI |
| `InvitationOverlay` audio controls | `music` | REUSE NGATURI; do not copy synthesized Web Audio behavior |
| `InvitationOverlay` chapter bar | `navigation` | REUSE NGATURI; adapt journey targets behind the existing UI |

## Three.js-owned Visuals

- Candi Bentar/ceremonial portal
- Garden courtyard, processional path, pools, Pendopo/Joglo, and Soko Guru
- Gebyok/Pelaminan and procedural foliage
- Camera position, target, FOV, and subtle pointer parallax
- Fog, lights, fireflies, petals, mist, vignette, and ambient environment

## Ngaturi-owned Content/Functions

- Guest name, couple names/profile, quote, story, event cards, venue, and closing text
- Countdown and calendar behavior
- Gallery media and lightbox
- RSVP, guestbook, gift, and maps
- Cover/open state, music controls, and navigation UI/behavior
- All persistence, validation, preview/editing, and business actions from `invitation.sections` and `global_settings`

## GLB Policy

V1 uses the procedural scene and does not search for, create, download, or require GLBs. Future GLBs may replace individual slots without changing the journey/business contract:

| Optional future slot | Current procedural implementation |
| --- | --- |
| `portal.glb` | `ProceduralPortal` / Candi Bentar |
| `pendopo.glb` | `ProceduralPendopo` / Joglo and Soko Guru |
| `pelaminan.glb` | `ProceduralPelaminan` / Gebyok and bridal dais |
| `foliage-a.glb` | `ProceduralFoliageA` / garden landscaping |
| `foliage-b.glb` | `ProceduralFoliageB` / lanterns and floral plinths |

The manifest's texture paths are declarations only and are not consumed by current reusable scene code; they are not V1 dependencies.

## Development Tuning Policy

`DevTuningPanel.tsx` is ADAPT as optional Phase 7 tooling, not a production foundation. It is useful for camera stop, light, fog, helper, and quality tuning, but must be development-only, hidden/excluded from visitor UI and bundles, scroller-aware, and free of business state. The current particle-density control is unwired and must not be presented as functional until connected.

## Known Integration Risks

| Risk | Evidence/impact | Owning phase |
| --- | --- | --- |
| Composition dispatch collision | Generic `isCinematic` always selects Cinematic Vintage in public and Builder. | Phase 2 |
| Cinematic Vintage regression | Shared boolean policy/core locks could leak to the new renderer. | Phase 2 and Phase 8 |
| Duplicate Canvas/WebGL remount | Public/Builder branching can mount more than one Canvas or recreate context on ordinary edits. | Phase 3 and Phase 5 |
| WebGL/resource lifecycle | Procedural materials/geometries and R3F context disposal must be verified across template switch/remount. | Phase 3 and Phase 8 |
| Builder scroll hijack | Prototype hook owns window/history; copying it would move the Builder page. | Phase 5 |
| Stale listeners/RAF | Adapted public and local-scroller listeners need symmetric cleanup on owner/remount changes. | Phase 3 and Phase 5 |
| React rerender pressure | Prototype writes display progress state each scroll RAF. | Phase 3 |
| Per-frame allocation/timing | Journey returns new arrays/object; particles use frame-dependent increments. | Phase 3 and Phase 7 |
| Mobile GPU cost | DPR up to 2, lights, particles, antialiasing, and future shadows need device/container budgets. | Phase 7 |
| Incorrect Builder quality | Prototype selects quality once from host window width, not DeviceFrame size. | Phase 5 and Phase 7 |
| Incomplete reduced motion | Camera/particles respond, but mist and light flicker continue. | Phase 3 and Phase 7 |
| External asset dependency | Manifest declares models/textures, though procedural code does not need them. Accidental loaders could block V1. | Phase 3 |
| Duplicate business schema | Prototype mock types, RSVP/gift/audio/navigation logic conflict with Ngaturi persistence/functions. | Phase 4 and Phase 6 |
| Camera/section drift | Static whole-document ranges, duplicate hero anchors, mismatched section names, and hardcoded nav thresholds can diverge. | Phase 3 and Phase 4 |

## Phase Handoff

### Phase 2 — Composition Foundation

- Introduce explicit `standard` / `cinematic-vintage` / `enchanted-garden` dispatch.
- Scope renderer and Builder policy to the selected composition identity.
- Add the Enchanted Garden catalog foundation without mounting R3F.
- Preserve all current Cinematic Vintage and standard behavior.

### Phase 3 — Three.js Engine Port

- Add only required Three/R3F dependencies and port the procedural scene.
- Implement the allocation-conscious journey ref -> CameraRig contract.
- Add one lifecycle-safe Canvas and shared reduced-motion input.
- Keep models/textures optional and business data out of the engine.

### Phase 4 — Native Ngaturi Template + Section Adapter

- Add Enchanted Garden section variants/preset using the existing registry/schema.
- Adapt `invitation.sections` to DOM scenes and authoritative journey IDs.
- Keep `global_settings` as visual settings source and add no business schema.
- Align section anchors/navigation with actual ordered sections.

### Phase 5 — Builder Integration

- Bind progress exclusively to `[data-device-scroller]` in Builder.
- Contain Canvas/chrome inside DeviceFrame and preserve Builder page scroll.
- Connect selection/seek to journey section IDs.
- Use DeviceFrame-aware conservative preview quality and verify cleanup.

### Phase 6 — Functional Integration

- Wire existing RSVP, guestbook, gift, maps, music, navigation, and countdown/calendar behavior.
- Reuse existing gallery/lightbox and cover/open behavior.
- Confirm preview/public business actions retain their current safeguards.

### Phase 7 — Performance + Visual Polish

- Tune DPR, particles, lights, antialiasing, and any shadows by quality tier.
- Fix delta timing and finish reduced-motion coverage.
- Profile allocations/remounts and prevent context/resource leaks.
- Optionally adapt the development-only tuning panel.

### Phase 8 — Final Verification

- Verify public and Builder journeys across target mobile/device sizes.
- Verify reduced motion, fallback behavior, and functional sections.
- Regression-check standard and Cinematic Vintage compositions.
- Run the repository's full required checks and final lifecycle/performance review.
