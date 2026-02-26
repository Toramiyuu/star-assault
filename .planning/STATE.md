# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The game must feel polished and satisfying — clear visual feedback on every action, intuitive HUD at a glance, instantly recognizable power-ups without reading text
**Current focus:** Phase 2 — Ground Drop Icon System (Phase 1.1 COMPLETE)

## Current Position

Phase: 2 of 4 (Ground Drop Icon System — next up)
Plan: 0 of 1 in current phase — Phase 1.1 fully complete, Phase 2 not started
Status: Phase 1.1 COMPLETE — all four ROADMAP success criteria met with user sign-off
Last activity: 2026-02-27 — Completed plan 01.1-02: HUD footprint reduction after visual review — bars 320x18, hudBg 130px, xpBotGrad 28px, XP_BAR_Y=1872 (commit 5781aa9)

Progress: [████░░░░░░] 38%

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

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: HUD Layout Rethink — reposition/resize HUD based on Survivor.io best practices; current HUD too small (URGENT)

### Pending Todos

- Fix crash when picking up MAG drop (GroundDropManager, area: gameplay)

### Blockers/Concerns

- Phase 3: Per-frame Graphics.clear() redraw in hot paths (XP orbs, enemy HP bars, HUD bars) must be addressed in the phase that first touches each system — do not defer
- Phase 4: Bitmap font asset pipeline (Hiero/Shoebox -> Phaser loadBitmapFont in Vite) unvalidated — spike required before implementation; pooled add.text() is fallback
- Phase 3: WarpStrike has confirmed bug (teleports player into enemy cluster with no invulnerability) — out of UX overhaul scope but flag if encountered during weapon work

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01.1-02-PLAN.md — Phase 1.1 COMPLETE: HUD footprint reduced after visual review — bars 320x18px at Y=80/106, hudBg 130px strip, xpBotGrad 28px strip, XP_BAR_Y=1872, BOSS_BAR_Y=140 (commit 5781aa9). Phase 2 (Ground Drop Icon System) is next.
Resume file: None
