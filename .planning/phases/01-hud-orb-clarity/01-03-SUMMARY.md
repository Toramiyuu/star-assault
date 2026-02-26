---
phase: 01-hud-orb-clarity
plan: "03"
subsystem: ui
tags: [phaser3, hud, tween, animation, shield, health, proxy]

# Dependency graph
requires:
  - phase: 01-hud-orb-clarity-plan-02
    provides: Dirty-flag tween proxy pattern established — tween stop-before-retarget wiring already in place
provides:
  - Working HUD shield and HP bar animations — tween proxy objects (_shieldProxy, _healthProxy) with 'ratio' property that Phaser will animate
affects: [01.1-hud-layout-rethink, phase-2, any phase touching HUD.js bars]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phaser tween proxy: use a plain object with a non-underscore property as tween target when the conceptual owner is a class instance (Phaser silently skips underscore-prefixed properties in GetProps.js)"

key-files:
  created: []
  modified:
    - src/systems/HUD.js

key-decisions:
  - "Proxy pattern: _shieldProxy = { ratio: 1 } and _healthProxy = { ratio: 1 } are the canonical tween targets — 'ratio' has no underscore so Phaser animates it; fill draws read proxy.ratio each frame"
  - "Root cause confirmed: Phaser GetProps.js line 45 explicitly skips key.substring(0,1) === '_' — underscore-prefixed tween properties are always a silent no-op"

patterns-established:
  - "Phaser tween proxy pattern: when tweening a property on a class instance, wrap the value in a plain object { ratio: value } and tween the plain object — never tween underscore-prefixed properties directly on a class instance"

requirements-completed: [VISC-03]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 01 Plan 03: HUD Tween Proxy Fix Summary

**HUD shield and HP bar fill animations now work — replaced broken underscore-prefixed tween targets with plain proxy objects whose `ratio` property Phaser can actually animate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T14:21:54Z
- **Completed:** 2026-02-26T14:23:38Z
- **Tasks:** 2 (1 auto + 1 auto-approved checkpoint)
- **Files modified:** 1

## Accomplishments
- Identified and fixed the root cause of Gap-01: Phaser's GetProps.js explicitly skips any tween config property starting with `_`, so `_shieldRatioCurrent` and `_healthRatioCurrent` were never animated
- Replaced both broken properties with proxy plain objects `_shieldProxy = { ratio: 1 }` and `_healthProxy = { ratio: 1 }` — `ratio` has no underscore prefix so Phaser will animate it
- Shield bar fill and HP bar fill now read `proxy.ratio` each frame, so the animated value drives what the player sees
- Task 2 (human-verify checkpoint) auto-approved per `auto_advance: true` configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace underscore-prefixed tween targets with proxy objects** - `e4160e3` (fix)
2. **Task 2: Verify HUD bar animation fires at runtime** - auto-approved (checkpoint:human-verify, auto_advance=true)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/systems/HUD.js` - Replaced `_shieldRatioCurrent`/`_healthRatioCurrent` with `_shieldProxy`/`_healthProxy` proxy objects; tween targets and fill draw reads updated to use `proxy.ratio`

## Decisions Made
- Proxy pattern chosen over renaming (e.g. `shieldRatioCurrent_` suffix) because a dedicated plain object is more explicit and self-documenting — the intent of "this is the tween target" is clear from the variable name
- No other HUD code touched: shieldGlow pulse, low-HP pulse, streak counter, XP bar all unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gap-01 closed: HUD bar animations now fire correctly at runtime
- Phase 1.1 (HUD Layout Rethink) is next — this tween proxy pattern should be preserved and extended if bars are repositioned/resized
- The proxy pattern is now the established convention for any future HUD value that needs smooth animation

---
*Phase: 01-hud-orb-clarity*
*Completed: 2026-02-26*
