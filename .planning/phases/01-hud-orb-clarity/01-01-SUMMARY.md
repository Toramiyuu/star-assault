---
phase: 01-hud-orb-clarity
plan: "01"
subsystem: ui
tags: [phaser3, graphics, xp-orbs, hud, upgrade-cards, color]

# Dependency graph
requires: []
provides:
  - Orange/gold XP orb rendering with 0.8s glow breathe in XPManager.js
  - Orange magnet trail lines in XPManager.js
  - Orange XP bar fill, border, and LV text in HUD.js
  - Orange stat text and NEW/level-dot accents in UpgradeCardUI.js
affects: [01-02, 01-hud-orb-clarity]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/systems/XPManager.js
    - src/systems/HUD.js
    - src/ui/UpgradeCardUI.js

key-decisions:
  - "Outer glow only breathes (0xFF6600 with pulse multiplier); mid ring is steady (0xFF8800, alpha 0.4 fixed) — prevents size-throb effect"
  - "Breathe period set to 0.8s via multiplier 0.00785 (2*PI/800) applied to time-in-ms"
  - "Kill streak counter and wave announcement text left unchanged — will be addressed in plan 01-02"

patterns-established:
  - "XP color palette: outer glow 0xFF6600, mid ring 0xFF8800, core 0xFFAA44, trail 0xFF6600, bar/text #FF8800"

requirements-completed: [VISC-01]

# Metrics
duration: 10min
completed: 2026-02-26
---

# Phase 1 Plan 01: XP Orb Orange Color Swap Summary

**XP orb glow layers, breathe pulse, magnet trail, XP bar fill/border/LV text, and upgrade card stat/NEW accents all converted from green (0x00ff88) to orange/gold palette readable against all six background zones**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-26T00:00:00Z
- **Completed:** 2026-02-26T00:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- XP orb outer glow breathes at ~0.8s period with orange color (0xFF6600); mid ring and core are steady warm amber
- Magnet pull trail lines are orange, matching orb palette
- XP bar (fill, border, LV label) fully orange — no green remains in HUD.js XP code
- Upgrade card stat text and NEW/level-dot text use orange accent (#FF8800)

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch XP orb colors and breathe pulse in XPManager.js** - `a04d7fe` (feat)
2. **Task 2: Update XP bar and upgrade card accent colors to orange** - `c35fe7e` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/systems/XPManager.js` - Orange orb glow layers (0xFF6600/0xFF8800/0xFFAA44), 0.8s breathe pulse, orange magnet trail
- `src/systems/HUD.js` - XP bar fill (0xFF6600), XP bar border (0xFF6600), LV text (#FF8800)
- `src/ui/UpgradeCardUI.js` - Stat text (#FF8800), NEW/level-dot text (#FF8800)

## Decisions Made
- Outer glow only breathes; mid ring stays at fixed alpha 0.4 — avoids a size-throb where the whole orb appears to grow/shrink. This matches the CONTEXT.md note "glow breathe, not a size throb."
- Kill streak counter (StatBar.js) left untouched as per plan — will be addressed in plan 01-02.
- Wave announcement text (#aaaaaa) left untouched — grey is neutral and readable with orange orbs.
- HUD frame/border accents skipped — competing with shield/HP bar colors would be visually noisy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three files ready for plan 01-02 (StatBar removal / kill streak HUD migration)
- Orange orb palette established: outer 0xFF6600, mid 0xFF8800, core 0xFFAA44 — future plans should maintain this palette for XP-related visuals

---
*Phase: 01-hud-orb-clarity*
*Completed: 2026-02-26*
