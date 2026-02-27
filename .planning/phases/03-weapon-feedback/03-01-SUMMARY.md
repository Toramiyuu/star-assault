---
phase: 03-weapon-feedback
plan: 01
subsystem: combat
tags: [kill-routing, combatutils, twin-laser, bomb-aoe, photon-devastator, kill-streak, xp-orbs, ground-drops]

requires:
  - phase: 02-drop-icons
    provides: GroundDropManager with spawnGuaranteed/trySpawnDrop API used by killEnemy()

provides:
  - "src/utils/CombatUtils.js with killEnemy(scene, enemy) and flashEnemy(scene, enemy, color, duration)"
  - "Single canonical kill side-effect chain used by all four weapon kill paths"
  - "TwinLaser kills now correctly increment kill streak, spawn XP orbs, trigger ground drops"
  - "Bomb AoE kills now correctly increment kill streak, spawn XP orbs, trigger ground drops"

affects:
  - 03-02
  - 03-03

tech-stack:
  added: []
  patterns:
    - "Double-call guard pattern: setActive(false).setVisible(false) at top of killEnemy() prevents multi-source kills"
    - "Timer-gate flash pattern: _flashTimer data key stores pending restore timer; cancelled before each new flash"
    - "Centralized side-effect routing: all kill weapons import from CombatUtils.js, not inline logic"

key-files:
  created:
    - src/utils/CombatUtils.js
  modified:
    - src/scenes/GameSceneCollisions.js
    - src/weapons/TwinLaser.js
    - src/systems/GroundDropManager.js
    - src/weapons/PhotonDevastator.js

key-decisions:
  - "killEnemy() includes score calculation inline (not delegated back to callers) so score is always consistent regardless of weapon source"
  - "flashEnemy() timer-gate uses enemy.getData('_flashTimer') to cancel old timers before new flash — prevents stacking at high fire rates"
  - "explosion prefix stays 'enemy_explosion' (9-frame) for now — Plan 02 upgrades to craftpix 8-frame set"
  - "Double-call guard uses setActive(false) before any side-effects — position captured first to ensure effects fire at correct location"

patterns-established:
  - "Import CombatUtils.js from ../utils/CombatUtils.js (from scenes/) or ../../utils/CombatUtils.js (from weapons/)"
  - "Wait — weapons/ files are one level up from src/, so they use '../utils/CombatUtils.js' (both scenes/ and weapons/ are direct children of src/)"

requirements-completed:
  - CMBT-04

duration: 8min
completed: 2026-02-27
---

# Phase 03 Plan 01: CombatUtils.js — Shared Kill Path Consolidation Summary

**killEnemy() helper in src/utils/CombatUtils.js consolidates 13 kill side-effects; all four weapon kill paths (bullets, TwinLaser, bomb AoE, PhotonDevastator) now route through it — TwinLaser and bomb kills now correctly increment kill streak, spawn XP orbs, and trigger ground drops**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T00:00:00Z
- **Completed:** 2026-02-27T00:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `src/utils/CombatUtils.js` with `killEnemy()` (13 kill side-effects, double-call guard) and `flashEnemy()` (timer-gate hit flash)
- Routed all four kill paths through `killEnemy()`: GameSceneCollisions (bullet kills), TwinLaser, GroundDropManager bomb AoE, PhotonDevastator
- Removed ~40 lines of duplicated kill logic from 4 files
- TwinLaser kills now trigger kill streak increment, XP orb spawn, and ground drop spawn (was broken)
- Bomb AoE kills now trigger kill streak increment, XP orb spawn, and ground drop spawn (was broken)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CombatUtils.js with killEnemy() and flashEnemy() helpers** - `0835baa` (feat)
2. **Task 2: Wire all broken kill paths through killEnemy()** - `2f55d9d` (feat)

## Files Created/Modified
- `src/utils/CombatUtils.js` - New file: killEnemy() with 13 side-effect steps + flashEnemy() with timer-gate pattern
- `src/scenes/GameSceneCollisions.js` - Added import, replaced 40-line kill block with `killEnemy(scene, enemy)`
- `src/weapons/TwinLaser.js` - Added import, replaced kill block (was missing score/streak/drops)
- `src/systems/GroundDropManager.js` - Added import, replaced kill block in bomb AoE (was missing streak/drops)
- `src/weapons/PhotonDevastator.js` - Added import, replaced kill block (was missing score/streak/drops)

## killEnemy() Side-Effect Steps
1. Double-call guard: `if (!enemy.active) return; enemy.setActive(false).setVisible(false)`
2. Capture position: `const x = enemy.x; const y = enemy.y`
3. Read metadata: `enemyType`, `isElite`, `bomberState`
4. Explosion + audio: `scene.explosions.play(x, y, 'enemy_explosion', 9, 0.12)` + `scene.audio.playEnemyExplosion()`
5. Camera shake: `scene.cameras.main.shake(80, 0.003)`
6. Score: `scoreManager.addKill(killType) * powerups.getScoreMultiplier()`
7. Floating score text: `showFloatingText(x, y-30, '+pts', '#ffffff')`
8. Kill streak: `scene.killStreak = (scene.killStreak || 0) + 1`
9. XP orb: `xpManager.spawnOrb(x, y, xp)` with elite 2.5x multiplier
10. Ground drop: bomber → `spawnGuaranteed(bomb)`, others → `trySpawnDrop(isElite)`
11. Nebula Rounds: create cloud via `weaponManager.weapons.get('B07').createCloud(x, y)`
12. Death Nova: `upgradeManager.checkDeathNova(x, y)`
13. Cleanup: `enemy.destroy(); waveManager.onEnemyRemoved()`

## flashEnemy() Timer-Gate Pattern
```js
const existingTimer = enemy.getData('_flashTimer');
if (existingTimer) { existingTimer.remove(false); }
enemy.setTintFill(flashColor);
const timer = scene.time.delayedCall(duration, () => {
  if (enemy.active) { /* restore elite/baseTint/clearTint */ }
  enemy.setData('_flashTimer', null);
});
enemy.setData('_flashTimer', timer);
```
Used by Plan 02 for hit flash wiring in GameSceneCollisions.

## Decisions Made
- Score calculation kept inline in killEnemy() (not delegated to callers) — all kills produce consistent score regardless of weapon
- explosion prefix stays 'enemy_explosion' for now — Plan 02 upgrades to craftpix 8-frame set and swaps the prefix
- Double-call guard position capture happens after setActive(false) check but effects use the captured x/y — ensures effects fire at correct pre-deactivation position

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Plans 02 and 03 (Wave 2) can now execute in parallel
- Plan 02 depends on: `flashEnemy()` from CombatUtils, craftpix asset paths, `Explosions.js` pattern
- Plan 03 depends on: `killEnemy()` being called from TwinLaser (verified), `drawEffects()` pattern in TwinLaser

---
*Phase: 03-weapon-feedback*
*Completed: 2026-02-27*
