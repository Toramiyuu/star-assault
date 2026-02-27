---
phase: 03-weapon-feedback
plan: 02
subsystem: combat
tags: [hit-flash, craftpix, death-effects, fragments, explosions, visual-feedback]

requires:
  - phase: 03-weapon-feedback
    plan: 01
    provides: "killEnemy() with step 4 explosion placeholder, flashEnemy() timer-gate pattern"

provides:
  - "flashEnemy() wired into GameSceneCollisions: white/red/cyan/crit-orange flash variants"
  - "killEnemy() upgraded: craftpix 8-frame explosion + 4 fragment scatter on every kill"
  - "PreloadScene loads craftpix_enemy_expl_0..7 and craftpix_enemy_frag_1..4"
  - "_spawnFragments() and _getExplosionScale() private helpers in CombatUtils.js"

affects:
  - 03-03

tech-stack:
  added: []
  patterns:
    - "craftpix key convention: craftpix_enemy_expl_{0..7} (0-indexed keys, 001-indexed files), craftpix_enemy_frag_{1..4}"
    - "Fragment scatter via scene.add.image + tweens.add with scaleX/scaleY/alpha=0 → frag.destroy()"
    - "Hit flash color matrix: normal=0xffffff, elite=0xff2222, shield=0x44ffff; crit adds 0xff8800 follow-up"

key-files:
  created: []
  modified:
    - src/scenes/PreloadScene.js
    - src/utils/CombatUtils.js
    - src/scenes/GameSceneCollisions.js

key-decisions:
  - "Fragment Math.random() is intentional — CONVENTIONS.md explicitly permits Math.random() for purely cosmetic effects"
  - "Explosions.js needed no changes — existing play(prefix, frameCount, scale) pattern works with 0-indexed craftpix keys"
  - "Crit orange follow-up uses scene.time.delayedCall(55ms) after flashEnemy() call (not inside flashEnemy) so it runs after the white flash resolves"
  - "Elite hit flash is red (0xff2222) not white — signals tankier enemy, distinct from normal hits"

patterns-established:
  - "Fragment lifecycle: scene.add.image → tween scaleX/Y→0 alpha→0 → onComplete: frag.destroy()"
  - "Explosion scale tiers: normal=0.14, elite=0.20, bomber=0.08, elite-bomber=0.16"

requirements-completed:
  - CMBT-01
  - CMBT-03

duration: 8min
completed: 2026-02-27
---

# Phase 03 Plan 02: Hit Flash + Craftpix Death Effects Summary

**flashEnemy() wired for white/red/cyan/crit-orange hit confirmation; killEnemy() upgraded with craftpix 8-frame explosions and 4 radial fragment sprites on every kill — enemies no longer die silently**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T00:08:00Z
- **Completed:** 2026-02-27T00:16:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- PreloadScene loads craftpix 8 explosion frames (craftpix_enemy_expl_0..7) and 4 fragment sprites (craftpix_enemy_frag_1..4)
- killEnemy() upgraded: craftpix 8-frame explosion replaces old 9-frame set; `_spawnFragments()` scatters 4 fragments radially from kill position
- GameSceneCollisions fully wired with flashEnemy(): shield hit→cyan, normal hit→white, elite hit→red, crit adds orange follow-up tint
- Timer-gate prevents flash stacking at any fire rate
- Explosions.js required no changes — existing play() API already supports craftpix key convention

## Task Commits

1. **Task 1: Load craftpix assets in PreloadScene** - `cfe66d8` (feat)
2. **Task 2: Wire hit flash + craftpix death effects** - `0abac10` (feat)

## Files Created/Modified
- `src/scenes/PreloadScene.js` - Added 8 explosion frame loads + 4 fragment sprite loads in preload()
- `src/utils/CombatUtils.js` - Added _getExplosionScale(), _spawnFragments(); upgraded killEnemy() step 4 to craftpix
- `src/scenes/GameSceneCollisions.js` - Import flashEnemy; shield flash → flashEnemy(cyan,60); hit flash → flashEnemy(white/red,50) + crit orange follow-up

## Flash Color Matrix
| Hit Type | Flash Color | Duration | Notes |
|----------|-------------|----------|-------|
| Normal hit | 0xffffff (white) | 50ms | Standard bullet impact |
| Elite hit | 0xff2222 (red) | 50ms | Signals tankier enemy |
| Shield hit | 0x44ffff (cyan) | 60ms | Signals shield absorbed damage |
| Crit (normal) | white (50ms) + orange (0xff8800, 120ms) | 50+120ms | Orange fires at 55ms via delayedCall |
| TwinLaser beam | 0x88eeff (cyan-white) | 40ms | In TwinLaser.js, not collision handler |

## Craftpix Key Convention
- Explosion: `craftpix_enemy_expl_0` through `craftpix_enemy_expl_7` (0-indexed keys, `Explosion_001.png` through `Explosion_008.png` source files)
- Fragments: `craftpix_enemy_frag_1` through `craftpix_enemy_frag_4` (`Ship_Fragment_1.png` through `Ship_Fragment_4.png`)
- Paths: `assets/craftpix-981156-space-shooter-game-kit/Enemy-spaceship-game-sprites/PNG/Ship_Effects_Sprites/` and `.../Ship_Effects/`

## Explosion Scale Per Enemy Type
```js
bomber → 0.08 (isElite: 0.16)  // AoE is the real spectacle
normal → 0.14
elite  → 0.20  // Larger explosion as reward signal
```

## Decisions Made
- Explosions.js needed no changes — `play(prefix, frameCount, scale)` already works with `craftpix_enemy_expl` + frameCount=8
- Fragment Math.random() is intentional — cosmetic only, CONVENTIONS.md permits this
- Crit orange follow-up implemented as delayed call in collision handler (not inside flashEnemy) to fire after white resolves

## Deviations from Plan

None - plan executed exactly as written. Explosions.js modification noted as "No changes needed" in plan and confirmed accurate.

## Issues Encountered

None.

## Next Phase Readiness
- All visual feedback for bullet hits and deaths is complete
- Plan 03-03 (TwinLaser glow ring + HP bar dirty flag) is independent and can proceed

---
*Phase: 03-weapon-feedback*
*Completed: 2026-02-27*
