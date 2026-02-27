---
phase: 02-drop-icons
plan: "02"
subsystem: ui
tags: [phaser3, sprites, ground-drops, animation, bob, tween, magnet-fix]

# Dependency graph
requires:
  - phase: 02-drop-icons plan 01
    provides: Six 80x80px drop_* textures registered in Phaser Texture Manager
provides:
  - GroundDropManager rewritten to use sprite-based drops (scene.add.image) with full animation lifecycle
  - Sinusoidal bob (8px, 1.5s) while idle; bob disabled during attract slide
  - Urgency flicker at 7s remaining lifetime with increasing frequency
  - Collect burst: scale 1->1.5x + white flash + alpha fade for all non-bomb drops
  - EliteShard purple/gold sparkle particles while idle
  - MAG crash fix: magnet collect iterates xpManager.orbs array directly (not orbGroup.getChildren)
  - All floating text removed from _collectDrop (no +HP, +SHIELD, MAGNET!, BOOST!, +STREAK)
affects: [GameScene, XPManager, PlayerStats]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sprite drop pattern: scene.add.image(x, y, 'drop_${type}') using boot-time baked textures from Plan 02-01"
    - "Bob via update loop: bobY = baseY + BOB_AMPLITUDE * Math.sin(time * BOB_SPEED + bobPhase) — no tween needed"
    - "Attract-gate bob: drop.attracting flag disables bob and clamps sprite to drop.x/drop.y — prevents jitter at attract boundary"
    - "Collect burst ownership: _playCollectBurst takes sprite reference, sets drop.sprite=null immediately so tween owns destroy lifecycle"
    - "Graphics sparkle pattern: p.setPosition(originX, originY) + p.fillCircle(0,0,3) then tween p.x/p.y to target — cleaner than offset math"

key-files:
  created: []
  modified:
    - src/systems/GroundDropManager.js

key-decisions:
  - "Both Task 1 (sprite architecture + MAG fix) and Task 2 (helpers) implemented in a single file rewrite — no behavioral overlap, single commit covers both tasks"
  - "Bomb _collectDrop case returns early before _playCollectBurst — bomb drama IS the collect feedback, no scale burst needed"
  - "drop.sprite=null after _playCollectBurst call — tween owns the sprite; prevents double-destroy if update loop runs before tween completes"
  - "xpManager.orbs.forEach with orb.vx=0 / orb.vy=0 (not setVelocity) — XP orbs are manual-physics objects in plain array, not Phaser physics bodies"
  - "_drawShape() helper removed entirely — shapes now live in PreloadScene textures, no runtime Graphics drawing"

patterns-established:
  - "Sprite lifecycle: add.image -> animate in update loop -> _playCollectBurst(sprite) + sprite=null -> tween calls destroy() on completion"
  - "MAG fix pattern: iterate scene.xpManager.orbs (plain array) not scene.xpManager.orbGroup.getChildren() (Phaser physics group)"

requirements-completed: [VISC-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 02 Plan 02: GroundDropManager Sprite Migration Summary

**GroundDropManager fully rewritten with sprite-based drops (add.image), sinusoidal bob, urgency flicker, collect burst animation, EliteShard sparkles, and MAG crash fix — no text labels on any drop**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T03:04:46Z
- **Completed:** 2026-02-27T03:07:20Z
- **Tasks:** 2 auto + 1 checkpoint (auto-approved)
- **Files modified:** 1

## Accomplishments
- Replaced old Graphics+Text drop rendering with `scene.add.image(x, y, 'drop_${type}')` sprites — zero runtime drawing cost
- Sinusoidal bob (8px amplitude, 1.5s cycle, random phase per drop) driven by `update()` loop math; bob stops cleanly when `drop.attracting=true`
- Urgency flicker from 7s onward: frequency scales from 0.01 to 0.05 rad/ms as lifetime expires
- Collect burst: scale 1→1.5x (Back.easeOut, 150ms) then white flash + alpha fade to 0 + sprite.destroy()
- EliteShard sparkle: purple (0xAA44FF) or gold (0xFFCC00) Graphics dot tweened outward every 300ms while idle
- MAG crash fix: `scene.xpManager.orbGroup.getChildren()` replaced with `scene.xpManager.orbs.forEach()` — XP orbs are plain-array objects with `vx`/`vy`, not Phaser physics bodies
- All six `scene.showFloatingText()` calls removed from `_collectDrop` — icon flash is the sole collect feedback

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Sprite architecture, MAG crash fix, _playCollectBurst, _updateEliteShardSparkle** - `c3bd2b2` (feat)
3. **Task 3: Visual QA checkpoint** - auto-approved (auto_advance=true)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/systems/GroundDropManager.js` - Complete rewrite of _createDrop, _destroyDrop, update(), _collectDrop; added _playCollectBurst() and _updateEliteShardSparkle() helpers; removed _drawShape()

## Decisions Made
- Tasks 1 and 2 implemented in a single comprehensive file rewrite — both describe changes to GroundDropManager.js with no overlap, single commit captures both
- `drop.sprite = null` immediately after `_playCollectBurst(drop.sprite)` call — tween takes ownership of the sprite's destroy lifecycle; prevents double-destroy
- Bomb case returns early before `_playCollectBurst` — bomb drama is the collect feedback, scale burst would conflict visually
- `orb.vx = 0; orb.vy = 0` used for magnet (not setVelocity) — XP orbs are plain JS objects in a manual-physics array, not Phaser physics bodies

## Deviations from Plan

None - plan executed exactly as written. Both task helpers implemented as specified. MAG fix matches plan's prescribed `scene.xpManager.orbs.forEach` pattern exactly.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VISC-02 fully satisfied: six distinct sprite icons, no text labels, bob + flicker + collect burst + sparkles all implemented
- Phase 3 (weapon/combat polish) can proceed — GroundDropManager no longer uses runtime Graphics in hot path
- MAG drop is safe to collect in all game states

---
*Phase: 02-drop-icons*
*Completed: 2026-02-27*
