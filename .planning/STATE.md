# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The game must feel polished and satisfying — clear visual feedback on every action, intuitive HUD at a glance, instantly recognizable power-ups without reading text
**Current focus:** Phase 2 — Ground Drop Icon System (Phase 1.1 COMPLETE)

## Current Position

Phase: 2 of 4 (Ground Drop Icon System — COMPLETE)
Plan: 2 of 2 in current phase — Plan 02-02 complete (GroundDropManager sprite migration)
Status: Phase 2 COMPLETE — sprite-based drops with bob/flicker/collect-burst/sparkle (commit c3bd2b2)
Last activity: 2026-02-27 — Completed plan 02-02: GroundDropManager fully rewritten with sprite-based drops, MAG crash fix, collect burst animation (commit c3bd2b2)

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 min
- Total execution time: 0.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-hud-orb-clarity | 4/4 | 18 min | 5 min |

**Recent Trend:**
- Last 5 plans: 10 min, 4 min, 2 min, 2 min
- Trend: Fast execution

*Updated after each plan completion*

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01-hud-orb-clarity P01 | 10 min | 3 tasks | 3 files |
| Phase 01-hud-orb-clarity P02 | 4 min | 2 tasks | 3 files |
| Phase 01-hud-orb-clarity P03 | 2 min | 2 tasks | 1 file |
| Phase 01-hud-orb-clarity P04 | 2 min | 1 tasks | 2 files |
| Phase 01.1-hud-layout-rethink P01 | 8 | 2 tasks | 1 files |
| Phase 01.1-hud-layout-rethink P02 | 15 | 1 tasks | 1 files |
| Phase 02-drop-icons P01 | 2 | 1 tasks | 1 files |
| Phase 02-drop-icons P02 | 3 | 3 tasks | 1 files |
| Phase 03 P01 | 8 | 2 tasks | 5 files |
| Phase 03 P02 | 8 | 2 tasks | 3 files |
| Phase 03 P03 | 7 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

- Roadmap: XP orb color green->orange is highest-priority (active gameplay clarity failure, not future polish)
- Roadmap: Stat bar removal is Phase 1 scope — confirmed anti-feature, belongs in results/pause only
- Roadmap: CombatUtils.js killEnemy() extraction is Phase 3 prerequisite — AoE kill logic is broken for TwinLaser and bomb kills
- Roadmap: BitmapText font pipeline needs a 30-min spike before Phase 4 commits to BitmapText approach (Vite build not validated)
- 01-01: Outer glow only breathes (0xFF6600 with pulse); mid ring steady (0xFF8800, fixed alpha) — avoids size-throb effect
- 01-01: XP color palette established: outer 0xFF6600, mid 0xFF8800, core 0xFFAA44, trail 0xFF6600, bar/text #FF8800
- [Phase 01-02]: StatBar.js deleted — 8-stat strip confirmed anti-feature; players cannot read it mid-combat and it wastes bottom-screen real estate
- [Phase 01-02]: Dirty-flag tween proxy pattern established: target HUD instance directly, stop active tween before retargeting — prevents animation debt on rapid damage events
- [Phase 01-03]: Phaser silently skips tween config properties starting with '_' (GetProps.js line 45) — use plain proxy objects with non-underscore property names; _shieldProxy.ratio and _healthProxy.ratio are now the canonical animated values in HUD.js
- [Phase 01-hud-orb-clarity]: Mutation-site notification: every mutation site (recharge, pickup) calls hud.update() immediately — not relying on next-frame loop pickup
- [Phase 01.1-hud-layout-rethink]: HUD layout constants: all 13 values extracted to module-level named constants; BAR_W=560 (was 220), SHIELD_Y=160 (was 24), XP_BAR_Y=1760 (was 85 at top), BOSS_BAR_Y=260
- [Phase 01.1-hud-layout-rethink]: Dirty-flag per-frame guard pattern: _lastShieldRatioDrawn/_lastHealthRatioDrawn skip Graphics.clear()+redraw when ratio unchanged; animated pulses (shieldGlow, lowHpPulsing) still redraw every frame
- [Phase 01.1-hud-layout-rethink P02]: Viewport-validated HUD dimensions: BAR_W=320/BAR_H=18 at SHIELD_Y=80/HEALTH_Y=106; backgrounds thin strips (hudBg 130px/0.55alpha, xpBotGrad 28px/0.40alpha); XP_BAR_Y=1872, BOSS_BAR_Y=140
- [Phase 02-drop-icons]: _generateDropTextures() called in create() not preload() — Phaser Graphics API requires scene context not available during preload()
- [Phase 02-drop-icons]: Boot-time texture baking pattern established: this.make.graphics({ add: false }) -> draw -> generateTexture() -> destroy()
- [Phase 02-drop-icons]: Sprite drop pattern: scene.add.image with boot-time textures; drop.sprite=null after _playCollectBurst so tween owns destroy lifecycle; xpManager.orbs array iterated directly for MAG fix (not orbGroup.getChildren)
- [Phase 03]: killEnemy() extracted to CombatUtils.js as canonical kill side-effect chain for all weapons — TwinLaser and bomb kills were bypassing kill streak, XP orbs, and ground drops — centralization fixes this and prevents future weapons from having the same bug
- [Phase 03]: flashEnemy() timer-gate pattern: _flashTimer data key on enemy cancels pending restore before each new flash — prevents stacking at high fire rates — Rapid fire (TwinLaser 100ms ticks) would cause flash stacking without gate; previous inline delayedCall approach couldn't cancel itself
- [Phase 03]: drawEnemyHealthBars dirty-flag: frame-level anyChanged scan chosen over per-enemy Graphics objects — single shared Graphics cannot do partial clears — STATE.md blocker resolved: per-frame redraw eliminated when no HP changes; TwinLaser 100ms ticks still trigger redraws for real-time drain (CMBT-02)

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: HUD Layout Rethink — reposition/resize HUD based on Survivor.io best practices; current HUD too small (URGENT)
- Phase 3.1 inserted after Phase 3: Visual Asset Utilization — player ship distinction, per-enemy craftpix sprite sets, weapon directionality, engine exhaust effects, per-set death animations, shooting effects (INSERTED)

### Pending Todos

- (RESOLVED) Fix crash when picking up MAG drop — fixed in 02-02 via xpManager.orbs array iteration

### Blockers/Concerns

- Phase 3: Per-frame Graphics.clear() redraw in hot paths (XP orbs, enemy HP bars, HUD bars) must be addressed in the phase that first touches each system — do not defer
- Phase 4: Bitmap font asset pipeline (Hiero/Shoebox -> Phaser loadBitmapFont in Vite) unvalidated — spike required before implementation; pooled add.text() is fallback
- Phase 3: WarpStrike has confirmed bug (teleports player into enemy cluster with no invulnerability) — out of UX overhaul scope but flag if encountered during weapon work

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 02-02-PLAN.md — GroundDropManager sprite migration: sprite-based drops (add.image), sinusoidal bob, urgency flicker, collect burst, EliteShard sparkles, MAG crash fix, all floating text removed (commit c3bd2b2). Phase 02-drop-icons COMPLETE. Phase 3 is next.
Resume file: None
