---
phase: 01-hud-orb-clarity
plan: "02"
subsystem: ui
tags: [phaser3, hud, tween, animation, statbar, killstreak]

# Dependency graph
requires:
  - phase: 01-hud-orb-clarity
    provides: "HUD.js base structure with shield/HP bars and XP bar already in place"
provides:
  - "StatBar removed — bottom stat strip (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) eliminated from live gameplay"
  - "Kill streak counter migrated to HUD.js as streakText + updateStreak() method"
  - "Shield and HP fill bars animate smoothly via dirty-flag tween proxy (150ms Power2.easeOut)"
affects:
  - 01-hud-orb-clarity
  - Phase 2 (any plan touching HUD.js or bar rendering)
  - Phase 3 (combat feedback / per-frame Graphics hot paths)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dirty-flag tween proxy: tween targets the HUD instance itself (_shieldRatioCurrent/_healthRatioCurrent); dirty check on _ratioTarget prevents tween debt at 60fps"
    - "Stop-before-retarget pattern: if tween is active, stop it before starting new one — ensures rapid damage snaps to final value with no queue"

key-files:
  created: []
  modified:
    - src/systems/HUD.js
    - src/scenes/GameScene.js
  deleted:
    - src/ui/StatBar.js

key-decisions:
  - "StatBar.js deleted — 8-stat strip (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) confirmed anti-feature; players cannot read it mid-combat"
  - "Kill streak accent colors preserved as-is (white/orange/red) — changing to yellow would conflict with HP-damage aesthetic"
  - "Tween targets HUD instance directly (not a separate proxy object) — avoids Graphics scaleX pivot problem; Graphics setOrigin not supported so scale tweens shift bar leftward"
  - "Low-HP alpha pulse runs every frame via Math.sin (not tween) — correct design, not tween-debt risk"

patterns-established:
  - "Dirty-flag tween proxy: track _ratioTarget and _ratioCurrent separately; only fire tweens.add() inside an if (newValue !== target) guard"
  - "Stop-and-retarget: always call tween.stop() before creating a new tween on the same property — prevents animation debt on rapid events"

requirements-completed:
  - VISC-03

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 1 Plan 02: HUD Stat Bar Removal + Smooth Bar Animation Summary

**Bottom stat strip eliminated and kill streak migrated to HUD; shield and HP bars animate via stop-and-retarget tween proxy that prevents animation debt on rapid damage**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T13:30:17Z
- **Completed:** 2026-02-26T13:33:39Z
- **Tasks:** 2 executed + 1 auto-approved checkpoint
- **Files modified:** 2 modified, 1 deleted

## Accomplishments

- Deleted `src/ui/StatBar.js` — the 8-stat strip (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) no longer appears at the bottom of the screen during wave play
- Migrated kill streak counter to `HUD.js` as `streakText` + `updateStreak()` — streak still appears top-right at x5/x10 ON FIRE/x20 UNSTOPPABLE with correct tier colors
- Implemented dirty-flag tween proxy pattern for shield and HP fill bars — bars animate 150ms ease-out on value change; rapid damage stops active tween and jumps to final value without lag

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate streak counter to HUD.js and remove StatBar** - `2437137` (feat)
2. **Task 2: Add dirty-flag tween proxy to HUD shield and HP bars** - `31efebe` (feat)
3. **Task 3: Phase 1 human verification checkpoint** - auto-approved (auto_advance: true)

## Files Created/Modified

- `src/systems/HUD.js` - Added `streakText` field, `updateStreak()` method, and dirty-flag tween proxy properties/logic for shield and HP bars
- `src/scenes/GameScene.js` - Removed StatBar import, construction (`new StatBar(this)`), and `this.statBar.update()` call; replaced with `this.hud.updateStreak(this.killStreak || 0)`
- `src/ui/StatBar.js` - Deleted (was untracked in git; stat strip is confirmed anti-feature)

## Decisions Made

- StatBar.js deleted — the stat strip could not be read mid-combat and consumed bottom-screen real estate
- Kill streak tier colors (white/orange/red) preserved unchanged — orange would conflict with HP-damage aesthetic
- Tween targets the HUD instance itself (`targets: this`) rather than a separate proxy object — Graphics objects don't support setOrigin so scale tweens would shift the bar leftward; self-targeting avoids this
- Low-HP alpha pulse (`Math.sin(scene.time.now * 0.008)`) runs unconditionally in draw block — this is correct behavior (pulse effect per frame), not a tween-debt risk since no `tweens.add()` is called there
- ShieldGlow pulse block left completely untouched as specified in plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — `StatBar.js` was untracked in git (never committed), so deletion required no git staging. The `git add src/ui/StatBar.js` would error; deletion was confirmed clean via `git ls-files src/ui/`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 (01-hud-orb-clarity) is complete: XP orb color (plan 01), stat bar removal + bar animation (plan 02)
- Requirement VISC-03 fulfilled: stat strip removed, streak counter preserved in HUD
- HUD.js tween proxy pattern is established and can be applied to boss bar in future phases if needed
- No blockers for Phase 2

## Self-Check: PASSED

- FOUND: src/systems/HUD.js
- FOUND: src/scenes/GameScene.js
- CONFIRMED DELETED: src/ui/StatBar.js
- FOUND: .planning/phases/01-hud-orb-clarity/01-02-SUMMARY.md
- FOUND commit: 2437137 (Task 1)
- FOUND commit: 31efebe (Task 2)

---
*Phase: 01-hud-orb-clarity*
*Completed: 2026-02-26*
