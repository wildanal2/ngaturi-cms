# Phase 7A — Enchanted Garden Visual Audit

Audit date: 2026-09-11  
Runtime: `localhost:3009/templates/enchanted-garden/preview`  
Mode: Immersive only  
Viewports: `390 × 844`, `1440 × 900`

### Overall assessment

The native-scroll journey, persistent R3F world, and readable Ngaturi content provide a sound foundation, and the dark teak/gold direction is consistent. The current result is nevertheless below the target **Premium Enchanted Javanese Royal Wedding**: the world is severely underexposed, landmark silhouettes are generic, materials read as untextured primitives, garden/floral depth is sparse, and the Gebyok/Pelaminan never becomes a climax. Cream DOM cards are legible but visually overpower the 3D world. The late functional journey also has major card collisions. Scroll reached the end on both viewports, one Canvas remained mounted, and no blocking console error occurred.

### Highest priority issues

#### P0

None.

#### P1 — Late functional cards collide

Area: Gallery through closing  
Viewport: Both; most severe at `390 × 844`  
Problem: The short absolute journey ranges cannot contain the real RSVP, guestbook, gift, and closing card heights. Adjacent cream cards visibly stack over one another, obscure form content and actions, and prevent the closing from receiving a clean final frame. The fixed navigation dock adds another obstruction near the bottom.  
Recommended fix: Preserve the current stop/progress architecture, but increase the stage travel and rebalance the late stop ranges so every rendered card gets at least one clear viewport moment plus separation. Keep tall forms internally scrollable only when necessary and reserve bottom clearance for the dock. Verify that no two `.contentCard` boxes intersect at either target viewport.  
Likely files: `src/sections/enchanted-garden/enchanted-garden.module.css`, `src/sections/enchanted-garden/journey.ts`, `src/sections/enchanted-garden/composition.tsx`

#### P1 — Architecture does not yet read as ceremonial Javanese landmarks

Area: Candi Bentar, Pendopo/Joglo, Gebyok/Pelaminan  
Viewport: Both  
Problem: The Candi Bentar reads as paired block towers with gold pyramids; the Pendopo is dominated by a broad simple pyramid and repeated dark columns; the Gebyok is a flat rectangular grid with hanging rods. The final landmark has no stronger silhouette, floral density, or light hierarchy than earlier moments.  
Recommended fix: Refine the existing procedural meshes only: strengthen split-gate tiering and inward ceremonial profile; clarify the Joglo's stepped/tumpang roof, soko guru hierarchy, and raised base; add shallow carved-panel rhythm, central pelaminan framing, throne/canopy definition, and concentrated jasmine/floral clusters to the Gebyok. Keep the procedural R3F approach and existing landmark positions; add no GLB.  
Likely files: `src/sections/enchanted-garden/scene/scene-controller.tsx`, `src/sections/enchanted-garden/scene/environment.tsx`

#### P1 — Lighting and materials crush scene depth

Area: Entire 3D journey  
Viewport: Both  
Problem: Most andesite, teak, foliage, and background geometry collapses into near-black silhouettes while isolated lamps and gold edges clip into bright hotspots. The palette is coherent, but surfaces lack readable roughness/color separation; foliage is nearly invisible and floral spheres appear plastic. Fog does not establish clear foreground/midground/background depth.  
Recommended fix: Establish a controlled moonlit base, localized warm pools at each landmark, and a brighter final pelaminan focus. Separate andesite, teak, roof, foliage, ivory flowers, and antique gold through restrained value/roughness changes and lighting—not global brightness. Tune fog to reveal layered silhouettes while retaining the night mood.  
Likely files: `src/sections/enchanted-garden/scene/lights.tsx`, `src/sections/enchanted-garden/scene/scene-controller.tsx`, `src/sections/enchanted-garden/scene/environment.tsx`, `src/sections/enchanted-garden/manifest.ts`

#### P1 — Mobile framing crops landmarks and magnifies primitive forms

Area: Cover through couple; Pendopo and closing  
Viewport: `390 × 844`  
Problem: The Candi wings/tops are mostly outside the frame, the Pendopo roof becomes a dark ceiling, the large gold ring and columns crowd the quote/couple cards, and the final Gebyok cannot be seen as a complete composition. Close framing exposes simple geometry and removes the spatial context needed to understand the journey.  
Recommended fix: Add viewport-aware framing within the existing CameraRig/journey contract: use a wider mobile composition, slightly lower focal emphasis where needed, and safe focal zones behind the narrower cards. Preserve native scroll and the same landmark sequence; do not create a separate mobile journey.  
Likely files: `src/sections/enchanted-garden/journey.ts`, `src/sections/enchanted-garden/scene/camera-rig.tsx`, `src/sections/enchanted-garden/enchanted-garden.module.css`

#### P1 — Missing fallback backgrounds

Area: WebGL/simple fallback  
Viewport: Both  
Problem: `enchanted-portal.jpg` returns 404 during Immersive load, and `golden-gazebo.jpg` is also absent from the expected public directory. The gradients mask the first failure, but both resilience paths lack their intended imagery.  
Recommended fix: Restore the two already-approved Phase 1 JPEG assets at the exact URLs already referenced by CSS. Validate JPEG signature, `1152 × 2048` dimensions, and the public 200 responses. Do not change the CSS URLs, hotlink, or introduce another fallback system.  
Likely files: `public/themes/enchanted-garden/backgrounds/enchanted-portal.jpg`, `public/themes/enchanted-garden/backgrounds/golden-gazebo.jpg`

#### P2 — DOM cards overpower the continuous world

Area: Hero through closing  
Viewport: Both  
Problem: Large, nearly opaque cream cards repeat with similar weight at every stop. Readability is good, but the world becomes a dark wallpaper and scene transitions feel like disconnected cards rather than movement through one garden.  
Recommended fix: Keep the existing Ngaturi sections and readable cream palette, but vary card width/placement by content type, slightly reduce visual mass where copy is short, and provide consistent backdrop quiet zones. Never place important text directly over active particles or bright lamps.  
Likely files: `src/sections/enchanted-garden/enchanted-garden.module.css`, existing `*-enchanted-garden.tsx` section variants

#### P2 — Particles read as screen-space squares/confetti

Area: Entire journey  
Viewport: Both; more obvious on desktop high quality  
Problem: Large pale square points float in front of landmarks and cards. They compete with text and do not read as subtle fireflies or petals.  
Recommended fix: Reduce apparent point size/opacity near content, warm and soften fireflies, make petals less square, and bias density away from the central reading zone. Retain the current instanced/buffer implementation and quality tiers.  
Likely files: `src/sections/enchanted-garden/scene/particles.tsx`, `src/sections/enchanted-garden/manifest.ts`

### Journey findings

1. **Cover / entrance:** Text hierarchy is clear and the centered dark glass card feels formal. Desktop establishes a processional axis; mobile loses most of the gate and surrounding garden. The scene begins too brown/flat for a premium first impression.
2. **Candi Bentar:** Symmetry and approach direction work, but the towers are blocky and gold-capped rather than convincingly split, tiered stone architecture. The ceremonial threshold is weak on mobile because it is cropped.
3. **Hero:** The cream arch card is readable and balanced on desktop. It is too dominant on mobile, while the Pendopo roof becomes a black slab behind it; there is little depth separation around the focal card.
4. **Quote / garden:** Copy is highly readable. The garden identity is minimal: dark low-poly trees and an oversized abstract gold ring replace layered foliage, jasmine, mist, and moonlit depth.
5. **Couple:** Portrait and name hierarchy is clear on both sizes. On mobile the two-column card is dense and the oversized gold ring/columns crowd its edges; the background does not support the intimate moment.
6. **Story journey:** Timeline content reads well, but the tall opaque card hides most of the world. Repeated dark trees/path maintain continuity but provide no new visual beat.
7. **Pendopo / Events:** Event cards remain readable. The structure does not clearly read as a refined Joglo because the roof profile, soko guru hierarchy, teak detail, and warm interior focus are too weak.
8. **Countdown:** The sparse card gives the architecture more room, but the numbers are small relative to the card. This is the clearest view toward the final stage, yet the Gebyok still reads as flat panels.
9. **Gallery:** Images are clear and the grid is compact. Decorative DOM foliage is more visible than the 3D garden, and the next RSVP card already intrudes into the same frame.
10. **RSVP / functional area:** Form surfaces contrast well with the dark world, but RSVP, guestbook, and gift cards overlap substantially. Inputs/actions and the intended visual focal point are obscured, especially on mobile.
11. **Gebyok / Pelaminan / Closing:** The backdrop remains a dark rectangular grid with simple hanging elements. It lacks the carved teak, antique-gold focus, floral abundance, layered ceremony lighting, and isolated final composition required for the climax; the closing card is visually crowded by earlier cards.

### Mobile-specific findings

- Scene quality correctly selects `low`, but close framing enlarges primitive silhouettes and crops the Candi, Pendopo, and Gebyok.
- Cards use nearly the full width, leaving too little visible garden context and creating a uniform card-stack rhythm.
- Couple/event content is readable; lower functional content is not visually safe because adjacent cards and the dock cover it.
- The fixed preview header plus navigation dock reduce the usable focal area; camera/card safe zones must account for both.
- Particle density is not excessive, but individual squares are still too prominent against the dark background.

### Desktop-specific findings

- Scene quality correctly selects `high`; the wide frame establishes a convincing central processional axis and shows landmark scale better than mobile.
- Large empty black regions and crushed foliage weaken depth despite the available width.
- The Candi silhouette is clearer but still generic; the Pendopo and Gebyok remain broad, flat geometric masses.
- Cards have a suitable maximum width and strong readability, but centered repetition underuses the available composition space.
- High-quality particles are conspicuous as square overlays and occasionally compete with headings/architecture.

### Fallback asset issue

Runtime evidence: `GET /themes/enchanted-garden/backgrounds/enchanted-portal.jpg` returns 404. The filesystem also lacks both CSS-referenced backgrounds. The lightweight Phase 7B fix is asset-only: restore the two accepted Phase 1 JPEGs under `public/themes/enchanted-garden/backgrounds/`, retain the current CSS URLs and gradient overlays, then smoke-check both URLs and the forced WebGL/simple fallback. No renderer, routing, dependency, or architecture change is required.

### Performance observations

- No visible blocking failure occurred and native scroll reached the closing on both viewports. Visual capture did not establish real-device frame-rate stability; detailed profiling remains Phase 7C.
- The scene uses no shadow casting, so expensive shadows are not the obvious concern.
- Desktop high quality permits DPR up to `1.75`; retain for now, but verify its GPU cost in Phase 7C after visual tuning.
- The light rig has multiple dynamic point lights plus a spotlight and two directional lights. This is a Phase 7C measurement candidate; Phase 7B should first improve focus using the existing rig rather than add lights.
- Per-frame particle updates are bounded by quality tier, but high-quality square particles are visually excessive before they are computationally excessive.
- Multiple overlapping translucent cards with `backdrop-filter: blur(12px)` create avoidable large composited layers in the functional tail. Removing the visual overlap in Phase 7B should also reduce that concern.

### Phase 7B recommended changes

1. Restore the two approved fallback JPEGs at their existing public paths and verify both return 200.
2. Eliminate all content-card intersections from gallery through closing at both audit viewports by increasing travel and rebalancing existing journey stop ranges; provide dock-safe bottom clearance.
3. Establish mobile-safe camera framing for the complete Candi, recognizable Pendopo roof/columns, and full Gebyok/Pelaminan focal composition without creating a separate journey.
4. Refine the existing procedural Candi, Joglo, and Gebyok silhouettes/proportions; make the Gebyok/Pelaminan the strongest final landmark.
5. Rebalance the current light/fog rig so surfaces retain a dark ceremonial mood while andesite, teak, foliage, gold, ivory florals, and landmark depth remain distinguishable.
6. Improve the existing procedural materials and add restrained foliage/jasmine clustering using current primitive geometry only.
7. Reduce repetitive DOM-card mass while preserving content contrast, business components, and safe reading zones.
8. Soften and relocate fireflies/petals so particles support atmosphere and never compete with copy/forms.
9. Repeat only the two-viewport Immersive visual pass plus scroll/console smoke check; defer profiling and optimization decisions to Phase 7C.

### Scope guard

Do **not** during Phase 7A:

- change production source code;
- tune camera values;
- modify materials;
- modify lighting;
- change particles;
- add GLB assets;
- install project dependencies;
- run the full test suite;
- run a build;
- commit;
- start Phase 7B.
