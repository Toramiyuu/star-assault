---
phase: 03-weapon-feedback
plan: 03
subsystem: combat
tags: [twin-laser, glow-ring, dirty-flag, performance, hp-bars, kill-linger]

requires:
  - phase: 03-weapon-feedback
    plan: 01
    provides: "killEnemy() called from TwinLaser; flashEnemy() for timer-gated hit flash"

provides:
  - "TwinLaser cyan pulsing glow ring on beam-targeted enemies (POL-03)"
  - "TwinLaser kill linger: 100ms glow at kill position before explosion (drama effect)"
  - "drawEnemyHealthBars() dirty-flag guard: skips redraw when no HP changed (performance)"
  - "CMBT-02: real-time HP drain visible during TwinLaser contact (100ms ticks)"

affects: []

tech-stack:
  added: []
  patterns:
    - "Dirty-flag pattern: _lastHPDrawn/_lastShieldDrawn per enemy; frame-level anyChanged scan before clear()+redraw"
    - "Kill linger: _lingerTarget = {x, y, endTime}; delayedCall(100ms) wraps killEnemy(); lazy-cleared in drawEffects"
    - "Glow ring drawn outside origins loop to avoid per-origin duplication; inner loop breaks after first matching origin"

key-files:
  created: []
  modified:
    - src/weapons/TwinLaser.js
    - src/scenes/GameScene.js

key-decisions:
  - "Frame-level anyChanged check chosen over per-enemy individual Graphics objects — single shared Graphics cannot do partial clears; per-enemy Graphics too expensive at 10+ enemies"
  - "_lingerTarget uses lazy cleanup in drawEffects (check endTime, null if expired) rather than a timer — avoids timer management complexity"
  - "Glow ring placed OUTSIDE origins loop to guarantee each enemy gets exactly one ring, regardless of whether both beams hit it"
  - "TwinLaser hit flash upgraded from inline tint to flashEnemy(0x88eeff, 40ms) for consistency with collision handler"

patterns-established:
  - "Linger pattern: capture position on kill, store endTime, delay killEnemy(), draw glow until endTime in render loop"
  - "Dirty-flag scan pattern: forEach check all enemies → anyChanged → early return or proceed with full redraw"

requirements-completed:
  - CMBT-02
  - POL-03

duration: 7min
completed: 2026-02-27
---

# Phase 03 Plan 03: TwinLaser Glow Ring + HP Bar Dirty Flag Summary

**TwinLaser shows pulsing cyan glow ring on targeted enemies with 100ms kill linger; drawEnemyHealthBars() gains dirty-flag guard that skips per-frame clear+redraw when HP is unchanged — resolves STATE.md performance blocker**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T00:16:00Z
- **Completed:** 2026-02-27T00:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- TwinLaser.drawEffects() now draws a pulsing cyan glow ring (strokeCircle r=34, inner r=28) around enemies in the beam path — ring drawn outside origins loop for correct single rendering
- Kill linger: _lingerTarget stores kill position for 100ms; drawEffects draws larger glow ring at that position; killEnemy() fires via delayedCall(100ms)
- TwinLaser hit flash upgraded from inline tint+delayedCall to flashEnemy(0x88eeff, 40ms)
- drawEnemyHealthBars() dirty-flag guard: only clears and redraws when at least one enemy's HP or shield differs from _lastHPDrawn/_lastShieldDrawn
- CMBT-02 works correctly: TwinLaser 100ms ticks cause HP change each tick, triggering redraw — real-time drain is visible

## Task Commits

1. **Task 1: TwinLaser cyan glow ring + kill linger** - `48994a9` (feat)
2. **Task 2: Dirty-flag guard for drawEnemyHealthBars()** - `20b9ef8` (perf)

## Files Created/Modified
- `src/weapons/TwinLaser.js` - _lingerTarget in constructor; kill linger delayedCall pattern; flashEnemy() for beam hit; glow ring + linger in drawEffects()
- `src/scenes/GameScene.js` - dirty-flag anyChanged scan + early return; _lastHPDrawn/_lastShieldDrawn stored after each draw

## _lingerTarget Pattern
```js
// In fire(): on hp <= 0
this._lingerTarget = { x: e.x, y: e.y, endTime: this.scene.time.now + 100 };
const capturedE = e;
this.scene.time.delayedCall(100, () => {
  killEnemy(this.scene, capturedE);
  if (this._lingerTarget && this._lingerTarget.endTime <= this.scene.time.now + 10) {
    this._lingerTarget = null;
  }
});
e.setData('hp', 0); // Prevent re-processing on next tick

// In drawEffects(): linger glow
if (this._lingerTarget) {
  const lt = this._lingerTarget;
  if (this.scene.time.now <= lt.endTime) { /* draw large glow ring */ }
  else { this._lingerTarget = null; } // lazy cleanup
}
```

## Dirty-Flag Approach
Frame-level anyChanged scan (not per-enemy individual Graphics):
- Chose frame-level over per-enemy individual Graphics objects because Graphics cannot do partial clears (single shared Graphics must clear all or nothing)
- Per-enemy Graphics would require 10+ Graphics objects with separate clear() calls — worse than current approach
- anyChanged scan is O(n) with early-exit behavior, acceptable cost vs. full redraw every frame
- Correctly enables CMBT-02: TwinLaser's 100ms ticks change hp every tick, so anyChanged=true every 100ms during laser contact

## Decisions Made
- Glow ring drawn after origins loop (not inside) — prevents double-draw when both beam origins hit same enemy
- Inner `for (const o of origins)` in glow ring section uses `break` after first match
- _lingerTarget lazy-cleared in drawEffects instead of a timer — avoids timer/delayedCall stack complexity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- All Phase 3 plans complete (03-01, 03-02, 03-03)
- STATE.md performance blocker resolved (drawEnemyHealthBars dirty-flag)
- Phase 3 verification can proceed

---
*Phase: 03-weapon-feedback*
*Completed: 2026-02-27*
