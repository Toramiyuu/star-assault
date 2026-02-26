---
phase: 01-hud-orb-clarity
plan: "04"
subsystem: ui
tags: [hud, animation, shield, health, phaser3]

# Dependency graph
requires:
  - phase: 01-hud-orb-clarity
    plan: "03"
    provides: dirty-flag tween proxy in HUD.js enabling smooth bar animations
provides:
  - hud.update() called immediately after every hp/shield mutation site
  - gap-02 closed: shield recharge bar tweens upward (no snap)
  - gap-03 closed: heart and shield pickup bars animate upward on collect
affects:
  - 01.1-hud-layout-rethink

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Immediate HUD notification: every mutation site (recharge, pickup) calls hud.update() directly rather than relying on next end-of-frame call"

key-files:
  created: []
  modified:
    - src/scenes/GameScene.js
    - src/systems/GroundDropManager.js

key-decisions:
  - "Defensive guard pattern: `if (this.hud)` / `if (scene.hud)` used on all new calls to prevent null-ref during scene teardown — hud is always present during gameplay but guard is cheap insurance"

patterns-established:
  - "Mutation-site notification: any code that changes a stat displayed in the HUD should call hud.update() immediately after the mutation, not rely on next-frame loop pickup"

requirements-completed: [VISC-03]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 04: HUD Update Wiring Summary

**Three hud.update() calls wired to gap-02 (shield recharge) and gap-03 (heart/shield pickup) mutation sites so bars tween upward the same frame state changes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T15:13:39Z
- **Completed:** 2026-02-26T15:15:09Z
- **Tasks:** 1 auto + 1 auto-approved checkpoint
- **Files modified:** 2

## Accomplishments
- Shield recharge increment in `updateShieldRecharge()` now calls `hud.update()` immediately after `playShieldRecharge()` — gap-02 closed
- Heart pickup `case 'heart':` in `_collectDrop()` now calls `hud.update()` after `scene.hp` increment — gap-03 (HP bar) closed
- Shield pickup `case 'shield':` in `_collectDrop()` now calls `hud.update()` after `playerShieldCurrent` increment — gap-03 (shield bar) closed
- All three calls use defensive guard (`if (this.hud)` / `if (scene.hud)`) to prevent null-ref during teardown

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire hud.update() after every hp/shield mutation in recharge and pickup paths** - `fd4a165` (feat)
2. **Task 2: Verify HUD bars update on pickup and shield recharge** - auto-approved (checkpoint, auto_advance=true)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/scenes/GameScene.js` - Added `if (this.hud) this.hud.update(this.score, this.hp)` inside `updateShieldRecharge()` after `playShieldRecharge()` call (line 345)
- `src/systems/GroundDropManager.js` - Added `if (scene.hud) scene.hud.update(scene.score, scene.hp)` in `case 'heart':` (line 275) and `case 'shield':` (line 285)

## Decisions Made
- Defensive `if (this.hud)` guard on all new calls: hud is always present during gameplay, but the guard is a one-character cost that prevents a null-ref crash during scene teardown sequencing. Plan specified this explicitly and it was followed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- gap-02 and gap-03 are now closed — all three HUD bar animation paths (damage, pickup, recharge) fire the dirty-flag tween correctly
- Phase 1 gap-closure work is complete: gap-01 (tween proxy), gap-02 (recharge wiring), gap-03 (pickup wiring) all resolved
- Ready for Phase 1.1: HUD Layout Rethink

---
*Phase: 01-hud-orb-clarity*
*Completed: 2026-02-26*
