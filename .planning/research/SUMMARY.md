# Project Research Summary

**Project:** Star Assault — UX Overhaul Milestone
**Domain:** Mobile horde-survivor game UX polish (Phaser 4 RC6, WebGL, portrait 1080x1920)
**Researched:** 2026-02-24 to 2026-02-26
**Confidence:** HIGH

## Executive Summary

Star Assault is a Phaser 4 mobile horde-survivor with a strong mechanical foundation — roguelite upgrades, elite enemies, a boss fight, ground drops, and zone-based backgrounds — but its visual feedback layer does not yet match the polish of genre leaders like Survivor.io and Vampire Survivors. The UX overhaul milestone targets the gap between mechanics being implemented and mechanics being communicated: players need to read XP orb collection, weapon hit confirmation, shield/health state changes, and drop pickups at a glance during dense combat. Every feature needed already exists in Phaser 4's built-in APIs; no new dependencies are required.

The recommended approach sequences work by dependency: HUD layout and icon foundations first, then XP orb and ground drop visual fixes (which depend on HUD being stable), then weapon feedback polish (which depends on weapon architecture being stable), then floating text and combat feedback last (which touches all other systems). This order is supported by the build-order analysis in ARCHITECTURE.md and avoids rework from building on unstable foundations. Every technique in scope — glow effects via `preFX.addGlow()`, smooth bar tweens via `scaleX`, particle bursts via `explode()`, floating text via BitmapText pools — has HIGH confidence from official Phaser documentation.

The single most important risk is the existing per-frame `Graphics.clear()` pattern used in three hot paths (XP orbs, enemy HP bars, HUD fill bars). This pattern is already causing frame budget overruns at wave 5+ based on the performance analysis in PITFALLS.md. Any phase that touches these systems must fix the dirty-flag redraw pattern before adding additional visual complexity. The second risk is visual noise overload: adding individual effects in isolation without stress-testing all effects firing simultaneously. The orb color change from green to orange must happen early because green orbs are currently invisible against nebula backgrounds — this is an active gameplay clarity failure, not just a polish issue.

---

## Key Findings

### Recommended Stack

The stack is locked: Phaser 4.0.0-rc.6, Vite 7.3.1, vanilla ES2022+. No new runtime dependencies should be added for this milestone. All UX techniques needed are available in Phaser 4's built-in API surface, including the FX pipeline (`preFX.addGlow()`, `postFX.addVignette()`), Tween Manager (`tweens.chain()`, `tweens.add()`), Particle Emitter (`add.particles()`, `explode()`), Camera effects (`shake()`, `flash()`), BitmapText, and the Layer API (`add.layer()`).

All listed APIs have been in Phaser since 3.60 and carry forward to Phaser 4 RC6 without breaking changes. RC6 is confirmed production-ready by the Phaser team.

**Core techniques (all zero install cost):**
- `preFX.addGlow()` — enemy hit flash, pickup hover glow; isolates from existing elite/boss tints unlike `setTint()`
- `scene.tweens.add()` with `scaleX` — smooth HUD bar transitions without per-frame GPU texture re-uploads
- `scene.add.particles()` with `explode()` mode — weapon impact sparks, enemy death bursts; hard-cap `maxParticles` for mobile
- `camera.shake()` / `camera.flash()` — calibrated to 1080x1920: 80ms/0.003 for bullet hits, 150ms/0.006 for HP damage, 300ms/0.012 for bombs
- `scene.add.bitmapText()` pooled — floating damage numbers, no Canvas2D text rendering overhead
- `add.layer()` at depth 200 — HUD containment guarantee for new elements; don't refactor existing HUD, apply to new additions only
- `Graphics.generateTexture()` at preload — bake drop icons to GPU texture once; 10-20x cheaper than per-frame Graphics draws
- `physics.world.pause()` for 40-80ms — hitstop on boss slams and bomb explosions only (2-4 events per session maximum)

**ADD blend mode warning:** Limit to 1-2 emitters with ADD blend per scene. Each ADD emitter causes a WebGL batch flush, multiplying draw calls. Use NORMAL blend for death sparks, XP collect effects, and most particles.

**Mobile performance ceiling:** 6-8 total active particle emitters, ~150 particles alive simultaneously, max 3 Graphics clear/redraw per frame.

---

### Expected Features

Research against Survivor.io, Vampire Survivors, Brotato, and 20 Minutes Till Dawn confirms the following feature expectations for the genre.

**Must have (table stakes — players leave without these):**
- Orange/gold XP orbs — the current green blends with nebula backgrounds; this is a confirmed active failure, not a future polish item
- Ground drop icons with distinct silhouettes — text labels are too small at 1080px portrait on a physical device; icon-first with color coding (red=HP, blue=shield, orange=utility) is genre standard
- Enemy hit flash — brief white flash (80-100ms) confirming shots land; without it, weapons feel unresponsive
- Health bar visible drain during sustained damage — critical for the twin laser; players cannot tell if the laser is working without real-time bar feedback
- Kill confirmation — particle burst on enemy death; enemies must not simply disappear
- Level-up card slide-in animation — cards should animate in from bottom with slight bounce; the static appearance breaks the reward feeling

**Should have (differentiators — Star Assault can compete here):**
- Laser weapon identity — twin laser beam with thickness variation, sustained glow on target while beam contacts, and health drain "tug" animation (shadow bar that trails the real bar with slight delay, the fighting-game pattern)
- Zone atmosphere reinforcement — zone palette influencing XP orb tint and particle colors slightly (zone transitions are already a differentiator vs. genre; reinforce the identity)
- Arena badge in HUD — small indicator for weekly challenge runs (seeded arena system is unique in the genre)
- Floating damage numbers — optional but high impact; pooled BitmapText, shown on kill or crit, not every tick

**Defer (not essential for this milestone):**
- Bottom stat bar redesign — remove or relocate; belongs in pause/results, not live HUD (current stat bar actively clutters and obscures gameplay)
- Scrapyard shop UI (Chunk G from PRD v4) — complex layout; rexUI may be justified here but belongs in a separate milestone
- Arena badge — low effort but deprioritized vs. gameplay clarity fixes

**Confirmed anti-features (do not build):**
- Text labels on ground drops (too small on mobile)
- Damage numbers on every laser tick (visual noise; show on kill or slow-drain only)
- HUD elements at screen center (obscures gameplay)
- Real-time raw stat display during gameplay (players don't read it mid-combat)
- Screen shake on every kill (accumulates to nausea; reserve for HP damage, bombs, boss attacks)

---

### Architecture Approach

The existing single-scene architecture is correct and should be preserved. All HUD elements live in GameScene with `setScrollFactor(0)` and high depth values. There is no benefit to splitting into a separate UIScene for this game — the HUD is tightly coupled to GameScene state and the `upgradePaused` mechanism already handles modal UX cleanly within one scene.

The game already correctly implements the shared Graphics object pattern for enemy HP bars (`this.enemyHPBars`) and the shared `aoeGraphics` pattern for weapon effects. The TwinLaser impact flare improvement slots into the existing `drawEffects(graphics, time)` extension point without architectural changes. The depth ordering is well-defined and should be followed for all new elements.

**Major components and their responsibilities:**
1. **HUD** (`src/systems/HUD.js`) — Shield/health/XP bars, boss bar, score; must switch fill bar animation from per-frame redraw to scaleX tween with dirty-flag guard
2. **XPManager** (`src/systems/XPManager.js`) — Orb rendering (switch to orange), magnet trail (update line color), orb pool management
3. **GroundDropManager** (`src/systems/GroundDropManager.js`) — Replace text labels with `generateTexture`-based sprite icons from a preloaded drops atlas; max 12 drops, per-drop Graphics for animations is appropriate at this count
4. **WeaponManager / TwinLaser** (`src/weapons/TwinLaser.js`) — Add impact flare via `drawEffects()` extension; add sustained glow on target via `preFX.addGlow()`; throttle any floating text to kill events only
5. **FloatingTextManager** (NEW: `src/systems/FloatingTextManager.js`) — Pooled BitmapText (12-15 pre-allocated objects); replaces ad-hoc `showFloatingText()` tween-destroy pattern for high-frequency sources
6. **PreloadScene** (`src/scenes/PreloadScene.js`) — Add `generateTexture()` calls for drop icons and bitmap font loading (`loadBitmapFont`)

**Key depth assignments to maintain:**
- Background: 0-2, Enemies: 4, Player: 5, Drops: 8-9, Weapon FX: 15, Enemy HP bars: 50, HUD: 99-101, Floating text: 200, Modal overlays: 300-400

**Build order for this milestone (dependency-ordered):**
1. PreloadScene texture generation (drop icons, bitmap font)
2. HUD dirty-flag optimization + layout changes
3. XPManager orb color change (orange) + magnet trail color
4. GroundDropManager icon sprites replacing text labels
5. TwinLaser visual feedback (impact flares, sustained glow, health drain animation)
6. FloatingTextManager pool (replaces ad-hoc text creation for all high-frequency sources)

---

### Critical Pitfalls

1. **Per-frame Graphics.clear() redraw degradation** — The three hot paths (XP orbs at 4 fillCircle/orb, enemy HP bars at 4 fillRect/enemy, HUD fill bars at 2 fillRoundedRect/frame) are the highest-risk performance issue in the codebase. At wave 5+ with 20 enemies and 15 orbs, this can push render time from 3ms to 45ms. Fix: add dirty-flag guard to HUD bars (only redraw when ratio changes), switch to `scaleX` tween for shield/HP bars, add viewport culling for orbs. Do not add any additional Graphics-based effects on top of the existing load without first profiling.

2. **setTimeout audio leak across scene transitions** — `ProceduralMusic` uses raw `setTimeout` which survives Phaser scene shutdown. Each game-over-then-restart session accumulates orphaned Web Audio nodes. Fix: implement `ProceduralMusic.stop()` with `clearTimeout(this.timerId)` + node disconnection; call it in `GameScene.shutdown()`; add `this.scene.events.once('shutdown', () => this.stop(), this)` as safety net. This must be fixed before any audio work.

3. **Visual noise overload during dense waves** — Each effect looks good in isolation but all simultaneously (hit flashes, particle bursts, zone crossfades, floating text, screen shake) can destroy situational awareness. Rules: shake only on HP damage/bombs/boss; max 8px displacement with diminishing falloff; floating text capped at 6-8 simultaneously; death chain kills must NOT stack additional shake; zone crossfades must not coincide with boss phase transitions.

4. **Floating text from high-frequency sources** — TwinLaser fires every 100ms. Showing floating text per tick = 10 text objects/second per enemy in beam = visible GC pressure and unreadable screen. The `showFloatingText()` pattern (create-tween-destroy) is correct for infrequent events but must be throttled at high-frequency sources. TwinLaser should show text only on kill. FloatingTextManager with BitmapText pool is the correct long-term fix.

5. **Kill logic inconsistency (AoE weapons miss score/streak/drops)** — Confirmed in CONCERNS.md: TwinLaser, BlackHole, and Bomb kills do not increment kill streak, score, or trigger ground drops. The `killStreak` upgrade is effectively broken for AoE builds. Fix: extract `killEnemy(scene, enemy, killerType)` to a shared `CombatUtils.js` before any phase adds more kill sources. This is a prerequisite for any phase touching kill feedback.

---

## Implications for Roadmap

The research clearly supports a 4-phase structure ordered by dependencies and risk. Each phase has a coherent deliverable that is testable in isolation.

### Phase 1: HUD Foundations and XP Orb Clarity

**Rationale:** XP orbs being invisible against backgrounds is an active gameplay failure, not a future polish item. HUD bar dirty-flag optimization must happen before adding effects on top. These are the highest-impact, lowest-risk changes and unblock everything downstream.

**Delivers:** Orange XP orbs (with magnet trail color update and HUD accent color update — all three must change together), HUD fill bar `scaleX` tween with dirty-flag guard (eliminates per-frame redraw on static bars), stat bar removal or relocation from bottom of screen, Layer-based HUD containment for new elements.

**Features from FEATURES.md:** Orange/gold orbs (table stakes), HUD layout cleanup (anti-feature removal), level indicator near XP bar.

**Pitfalls to avoid:** Graphics.clear() redraw (fix dirty-flag before adding complexity), visual consistency (all three orb color references must update together or theme breaks — PITFALLS.md "Looks Done But Isn't" checklist item #1).

**Research flag:** Standard patterns — no additional research needed. All techniques are HIGH confidence.

---

### Phase 2: Ground Drop Icon System

**Rationale:** Drop text labels are confirmed unreadable at 1080px portrait on device. Icon system requires PreloadScene `generateTexture()` setup which is a prerequisite for other visual work. This phase has a clear deliverable and bounded scope.

**Delivers:** 6 drop type icons (Heart, Shield, Bomb, Magnet, Boost, EliteShard) generated via `generateTexture()` at preload time, rendered as sprites from a baked texture rather than per-frame Graphics draws, with bob animation and collect flash. Touch targets verified at 88px minimum on physical device.

**Features from FEATURES.md:** Icon-first design (table stakes), color coding by category (red=HP, blue=shield, yellow=utility), distinct silhouettes for accessibility.

**Architecture from ARCHITECTURE.md:** Per-drop Graphics + tween pattern is correct at max 12 drops; switch the icon from `add.text()` label to `add.image()` from baked texture atlas.

**Pitfalls to avoid:** Verify icons are legible at actual mobile resolution (not just browser DevTools) — PITFALLS.md "Looks Done But Isn't" checklist item #2.

**Research flag:** Standard patterns — `generateTexture()` approach is HIGH confidence. Asset creation (icon shapes) requires design decisions outside research scope.

---

### Phase 3: Weapon Visual Feedback (TwinLaser Polish + Enemy Hit Flash)

**Rationale:** Hit confirmation is a table-stakes genre requirement. The twin laser's "invisible" damage feel is a known issue: no per-tick visual change makes players doubt the weapon is working. This phase depends on weapon architecture being stable (WeaponManager `drawEffects()` pattern) and orb system being stable.

**Delivers:** Enemy hit flash via `preFX.addGlow()` (white, 60ms, yoyo tween — NOT `setTint()` to avoid conflicts with elite gold and boss tints), twin laser sustained glow on target while beam contacts, health drain "tug" animation on enemy HP bars during laser beam contact, 2-particle cyan spark per laser tick via `hitParticles.emitParticleAt()`, kill confirmation particle burst (5-8 colored particles matching enemy type), hitstop (`physics.world.pause()` for 60ms) on boss slams and bomb explosions only.

**Features from FEATURES.md:** Hit confirmation (table stakes), health bar drain for laser (table stakes), laser weapon identity via sustained glow (differentiator), kill confirmation particle burst (table stakes).

**Architecture from ARCHITECTURE.md:** TwinLaser `drawEffects()` extension point, `preFX` for all sprites, shared `aoeGraphics` for impact flare ring rendering.

**Pitfalls to avoid:** ADD blend mode limit (1-2 emitters maximum), floating text throttle on TwinLaser (kill events only, never per tick), closure-per-bullet GC (review during weapon code changes), kill logic inconsistency — extract `killEnemy()` to CombatUtils.js as prerequisite so kill streak and drops work for TwinLaser kills.

**Research flag:** Standard patterns — HIGH confidence. The TwinLaser "drain animation" health bar tug pattern (shadow bar with slight delay) is MEDIUM confidence — it is an established fighting-game technique but specific Phaser implementation requires design judgment during execution.

---

### Phase 4: Floating Text System and Combat Feedback Polish

**Rationale:** Floating text touches all other systems and must come last. It is the integration layer that ties together damage numbers from weapon hits, "+HP" from drop pickups, "SHIELD DOWN!" from HUD events, and level-up feedback. Building the pool before the systems that use it creates orphaned infrastructure; building it after means all systems already have stable hook points.

**Delivers:** `FloatingTextManager` with BitmapText pool (12-15 pre-allocated objects), replacing all ad-hoc `showFloatingText()` tween-destroy calls for high-frequency sources. Bitmap font asset added to PreloadScene. Floating text capped at 8 simultaneously visible (queue overflow discards oldest). Kill streak counter fix for AoE weapons (requires CombatUtils.js from Phase 3 prerequisite). Level-up card slide-in animation polish (bottom-up with slight bounce, matching Survivor.io pattern). Boss HP full-restore indicator for Horn Mode ("FULL RESTORE" text + dramatic sfx).

**Features from FEATURES.md:** Floating damage numbers (should-have), level-up card animation polish (table stakes), boss feedback clarity.

**Architecture from ARCHITECTURE.md:** FloatingTextManager is new but slots into existing `showFloatingText()` call sites; BitmapText pool at depth 200 matches existing floating text depth convention.

**Pitfalls to avoid:** Per-frame text creation (BitmapText pool eliminates this), text at wrong depth (depth 200 established), emoji icons in HUD (replace with sprite-based or Unicode-drawn icons for cross-platform consistency — iOS vs Android emoji rendering diverges).

**Research flag:** BitmapText pool implementation is HIGH confidence. Bitmap font asset sourcing (Hiero/Shoebox workflow) is MEDIUM confidence — research documented the approach but asset creation has not been validated in this specific project setup.

---

### Phase Ordering Rationale

- Phase 1 before Phase 2: HUD dirty-flag optimization removes render pressure before icon system adds new draw calls. Orb color establishes the color palette that informs icon color coding.
- Phase 2 before Phase 3: Icon system establishes `generateTexture()` workflow in PreloadScene, which Phase 3's weapon effects may reuse. More importantly, drop system must be stable before weapon kills trigger drop spawns with visual feedback.
- Phase 3 before Phase 4: FloatingTextManager hook points (weapon kill events, enemy death) must be stable before building the pool that serves them. CombatUtils.js (Phase 3 prerequisite) must exist before Phase 4 wires floating text to kill events.
- All phases: Per-frame Graphics redraw issues are addressed within the phase that first touches each system. Do not defer optimization to a separate "performance pass" — the optimization is the prerequisite for adding more complexity.

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1:** All techniques HIGH confidence. Orb color change and dirty-flag optimization are well-documented Phaser patterns.
- **Phase 2:** `generateTexture()` approach HIGH confidence. Icon asset creation is a design decision, not a research question.
- **Phase 3:** `preFX.addGlow()` and particle patterns HIGH confidence. Health drain "tug" animation is MEDIUM — implementation details need design judgment during execution but the pattern is established.

Phases that may benefit from targeted research during planning:
- **Phase 4:** Bitmap font asset pipeline (Hiero/Shoebox to Phaser `loadBitmapFont`) has not been validated in this project's Vite build setup. Recommend a 30-minute spike on font loading before committing to BitmapText as the implementation approach. If font pipeline proves difficult, pooled `add.text()` objects with content change throttling are an acceptable fallback.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified against official Phaser 4 RC6 docs and Phaser 3.60 changelog. No version compatibility issues identified. |
| Features | HIGH | Genre analysis based on direct play of Survivor.io, Vampire Survivors, Brotato, 20 Minutes Till Dawn. Green orb vs. nebula background failure is confirmed live in the codebase, not inferred. |
| Architecture | HIGH | Grounded in direct codebase analysis (existing HUD.js, XPManager.js, TwinLaser.js, WeaponManager.js reviewed). Build order is derived from actual dependency analysis, not guesswork. |
| Pitfalls | HIGH | Most pitfalls cross-referenced against the codebase's own CONCERNS.md. Performance figures (3ms → 45ms Graphics degradation) sourced from documented Phaser community cases. |

**Overall confidence:** HIGH

### Gaps to Address

- **Bitmap font asset pipeline:** Loading `.fnt`/`.xml` format bitmap fonts in a Vite build has not been validated in this project. Validate the import/load path before Phase 4 implementation.
- **Physical device testing:** Drop icon readability and touch target size (88px minimum) must be verified on an actual Android device, not just Chrome DevTools device emulation. DevTools scaling does not accurately represent physical pixel density.
- **TwinLaser "tug" animation exact implementation:** The health bar shadow-bar pattern is an established fighting-game convention but the specific Phaser implementation (second Graphics object trailing the first, or a tween offset approach) needs a small design spike during Phase 3 planning.
- **WarpStrike invulnerability gap:** Confirmed bug from PITFALLS.md — WarpStrike teleports player into enemy cluster with no invulnerability window. This is a gameplay bug that should be tracked separately from UX polish but will be encountered during Phase 3 weapon work.
- **Kill logic consolidation:** Extracting `killEnemy()` to CombatUtils.js is a prerequisite called out in Phase 3, but the exact refactor scope (which of the 4 kill paths need consolidation, test coverage required) needs scoping during Phase 3 planning.

---

## Sources

### Primary (HIGH confidence)
- Phaser FX System Documentation — `preFX`/`postFX` glow, vignette, all 15 shaders. https://docs.phaser.io/phaser/concepts/fx
- Phaser FX Changelog v3.60 — Complete list of effects added. https://github.com/phaserjs/phaser/blob/v3.60.0/changelog/3.60/FX.md
- ParticleEmitter API — maxParticles, explode(), frequency, viewBounds, blendMode behavior. https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter
- Phaser Tweens Concepts — chain(), stagger, easing equations. https://docs.phaser.io/phaser/concepts/tweens
- Phaser Graphics API — fillRoundedRect, fillGradientStyle, generateTexture. https://docs.phaser.io/phaser/concepts/gameobjects/graphics
- Phaser Camera Shake Effect — shake/flash/zoom built-in effects. https://photonstorm.github.io/phaser3-docs/Phaser.Cameras.Scene2D.Effects.Shake.html
- Phaser 4.0 RC6 Release Notes — RC6 is final RC, production-ready. https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out
- BitmapText API — batching advantage over Text confirmed. https://docs.phaser.io/api-documentation/class/gameobjects-bitmaptext
- Layer API — Layer as HUD container. https://docs.phaser.io/api-documentation/class/gameobjects-layer
- Phaser official health bar examples — per-entity vs shared graphics pattern. https://phaser.io/examples/v3.85.0/game-objects/graphics/view/health-bars-demo
- Existing codebase: `src/systems/HUD.js`, `src/systems/XPManager.js`, `src/systems/GroundDropManager.js`, `src/scenes/GameScene.js`, `src/weapons/TwinLaser.js`, `src/systems/WeaponManager.js` — direct code analysis
- `.planning/codebase/CONCERNS.md` — primary source for existing known bugs and performance bottlenecks

### Secondary (MEDIUM confidence)
- Phaser optimization guide (2025) — object pooling, canvas sizing, rendering method selection. https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025
- Phaser community — HUD scene launch patterns. https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348
- Phaser community — Graphics rendering performance degradation (3ms → 45ms documented case). https://phaser.discourse.group/t/rendering-performance-problem/11069
- Mobile WebGL performance budget. https://gamedevjs.com/articles/best-practices-of-optimizing-game-performance-with-webgl/
- Bishop Games — Visual clarity and brightness hierarchy in games. https://www.linkedin.com/pulse/mastering-visual-clarity-gaming-bishop-games
- Screen shake design analysis. http://www.davetech.co.uk/gamedevscreenshake
- Web Audio autoplay policy — Phaser UNLOCKED event. https://blog.ourcade.co/posts/2020/phaser-3-web-audio-best-practices-games/
- Genre reference: Survivor.io, Vampire Survivors, Brotato, 20 Minutes Till Dawn — direct play analysis

### Tertiary (LOW confidence)
- Phaser Optimization Tips (2025) — blend mode batch flush, Canvas vs WebGL on mobile. https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b (paywalled, could not fully verify)
- PhaserFX library — Phaser 4 RC6 compatibility not confirmed; not recommended for use

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
