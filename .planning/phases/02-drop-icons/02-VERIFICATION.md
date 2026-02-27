---
phase: 02-drop-icons
verified: 2026-02-27T04:00:00Z
status: human_needed
score: 11/11 automated must-haves verified
re_verification: false
human_verification:
  - test: "Open game in browser at 390px DevTools width (iPhone 12 Pro). Start a game, press I for god mode. Let drops spawn naturally or trigger elite kills."
    expected: "All six drop types appear as distinct icon silhouettes — Heart (red), Shield (blue), Bomb (black+fuse+orange tip), Magnet (cyan U-shape), Boost (yellow double-chevron >>), EliteShard (purple gem). No text label floats above any drop. Icons are distinguishable without zooming."
    why_human: "Icon silhouette legibility and color distinctness at actual mobile resolution (375-390px CSS width) requires a human eye — programmatic grep cannot evaluate visual clarity or whether an 80px icon reads as a 'heart' versus an amorphous blob."
  - test: "Watch any idle drop for 3+ seconds."
    expected: "Drop bobs gently up and down (~8px amplitude). After ~7 seconds of lifetime the drop begins flickering with increasing urgency. Bob stops cleanly when the drop slides toward the player — no jitter at the attract boundary."
    why_human: "Animation timing and visual smoothness at runtime cannot be verified by static code analysis."
  - test: "Collect a Heart, Shield, Boost, or EliteShard drop by walking into it."
    expected: "The icon bursts to ~1.5x scale, flashes white, then fades out. No floating +HP, +SHIELD, BOOST!, or +STREAK text appears. Bomb drama (slow-mo, flash, ring) fires on Bomb collect — no scale burst."
    why_human: "Tween chain behavior and absence of floating text requires visual confirmation at runtime."
  - test: "Collect a Magnet drop while XP orbs are present on screen."
    expected: "No console error. All XP orbs on screen teleport to the player position instantly."
    why_human: "Crash verification requires runtime execution. Console errors only appear in browser devtools."
  - test: "Trigger an EliteShard to spawn (god mode + elite kill). Watch it bob."
    expected: "Purple and gold sparkle particles float outward from the icon every ~300ms while it bobs."
    why_human: "Particle animation requires runtime visual confirmation."
---

# Phase 2: Ground Drop Icon System — Verification Report

**Phase Goal:** Players identify ground drop type at a glance from the icon silhouette alone — no reading required, no ambiguity between types
**Verified:** 2026-02-27T04:00:00Z
**Status:** human_needed (all automated checks passed; visual/runtime checks require human)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| #   | Truth                                                                                       | Status      | Evidence                                                                                                                                 |
|-----|---------------------------------------------------------------------------------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | All six drop types display a distinct visual icon — no text label on any drop               | ✓ VERIFIED  | `_createDrop` uses `scene.add.image(x, y, \`drop_${type}\`)`. Zero `showFloatingText` calls remain in `_collectDrop`. No text added to drop objects. |
| 2   | Each icon category is color-coded by function (red HP, blue shield, orange/yellow utility, purple/gold elite) | ✓ VERIFIED  | PreloadScene draw methods: `_drawHeart` 0xFF2244, `_drawShield` 0x4488FF, `_drawBomb` 0x111111+fuse 0x886633+tip 0xFF6600, `_drawMagnet` 0x00DDCC, `_drawBoost` 0xFFCC00, `_drawEliteShard` 0xAA44FF+0xFFCC00 |
| 3   | Drop icons remain legible at actual mobile resolution                                       | ? HUMAN     | 80px texture at scale 1.0 on 1080px canvas — size math is correct but visual readability at 375px CSS requires human verification         |
| 4   | Picking up a drop produces a collect flash confirming the pick-up                           | ✓ VERIFIED  | `_playCollectBurst(sprite)` is a substantive tween chain: scale 1→1.5x (Back.easeOut, 150ms) then white tint flash then alpha 0 + destroy |

**Automated score:** 3/4 truths fully verified. 1 truth (legibility) requires human visual check.

### Plan 01 Must-Have Truths

| #   | Truth                                                                                                                  | Status     | Evidence                                                                                         |
|-----|------------------------------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------|
| 1   | Six texture keys exist in Phaser Texture Manager after PreloadScene.create() runs                                      | ✓ VERIFIED | `_generateDropTextures()` called at PreloadScene.js:146 (before `scene.start('Menu')`). Loop iterates all six: heart, shield, bomb, magnet, boost, elite_shard. Each calls `gfx.generateTexture(\`drop_${type}\`, 80, 80)` |
| 2   | Each texture is 80x80px with dark semi-transparent backing circle and distinct icon in correct functional color        | ✓ VERIFIED | SIZE=80 constant used. `gfx.fillStyle(cfg.backing, 0.6)` + `gfx.fillCircle(40,40,40)` before every draw call. Six distinct `_drawXxx` helpers verified present with correct hex colors |
| 3   | EliteShard texture has purple-tinted backing (0x220033), all others have black backing (0x000000)                     | ✓ VERIFIED | PreloadScene.js:158 — `elite_shard: { backing: 0x220033 }` vs all others `backing: 0x000000`    |
| 4   | No temp Graphics objects remain in scene display list after texture generation                                         | ✓ VERIFIED | `this.make.graphics({ x: 0, y: 0, add: false })` at line 162 — `add: false` prevents display-list entry. `gfx.destroy()` called at line 169 immediately after `generateTexture` |

### Plan 02 Must-Have Truths

| #   | Truth                                                                                    | Status     | Evidence                                                                                                                                           |
|-----|------------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | All six drop types render as distinct sprite icons — no text label on any drop           | ✓ VERIFIED | `scene.add.image(x, y, \`drop_${type}\`)` at GroundDropManager.js:101. No `add.text()` calls in drop object creation. No `showFloatingText` in `_collectDrop` |
| 2   | Heart red, Shield blue, Bomb black+fuse, Magnet cyan, Boost yellow, EliteShard purple+gem | ✓ VERIFIED | Backed by baked textures from Plan 01 draw methods — correct colors confirmed above                                                                |
| 3   | Drops bob ~8px vertically with 1.5s cycle; bob stops when within attract radius          | ✓ VERIFIED | `BOB_AMPLITUDE=8`, `BOB_SPEED=0.00418` (= 2π/1500 rad/ms), `bobY=baseY+BOB_AMPLITUDE*Math.sin(time*BOB_SPEED+bobPhase)`. Bob branch only entered when `!(dist < ATTRACT_DIST)` |
| 4   | In final 3 seconds of lifetime, drops flicker at increasing frequency                    | ✓ VERIFIED | `FLICKER_START=7000`, `LIFETIME=10000` → 3-second window. `urgencyT` scales 0→1 over the window; `freq = 0.01 + urgencyT * 0.04` drives `Math.sin` flicker on alpha |
| 5   | Collecting non-bomb drop plays scale-burst to 1.5x + white flash + alpha fade           | ✓ VERIFIED | `_playCollectBurst` at line 283: tween `scaleX/Y 1→1.5`, `Back.easeOut`, then `setTint(0xffffff)` + alpha 0 fade + `sprite.destroy()` in chain. Bomb case returns early before this call |
| 6   | Collecting Magnet drop does NOT crash; all XP orbs teleport to player                   | ✓ VERIFIED | Magnet case iterates `scene.xpManager.orbs.forEach(orb => { orb.x=mpx; orb.y=mpy; orb.vx=0; orb.vy=0; })` — no `orbGroup.getChildren()` present anywhere in file |
| 7   | No floating text appears on any drop collect                                             | ✓ VERIFIED | Zero `showFloatingText` calls in `_collectDrop`. All six original floating text calls confirmed removed (grep returns empty) |

**Score: 11/11 automated must-haves verified**

### Required Artifacts

| Artifact                          | Expected                                                                 | Status     | Details                                                                                                                       |
|-----------------------------------|--------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------|
| `src/scenes/PreloadScene.js`      | `_generateDropTextures()` + six `_drawXxx()` helpers called from `create()` | ✓ VERIFIED | All seven methods present. `create()` calls `this._generateDropTextures()` at line 146. `generateTexture` loop confirmed.     |
| `src/systems/GroundDropManager.js`| Sprite-based drop system with bob, flicker, collect burst, sparkles, MAG crash fix | ✓ VERIFIED | `_createDrop` uses `scene.add.image`. `update()` drives bob+flicker. `_playCollectBurst`, `_updateEliteShardSparkle`, `_destroyDrop` all present and substantive. |

### Key Link Verification

| From                                 | To                                          | Via                                                        | Status     | Details                                                                                               |
|--------------------------------------|---------------------------------------------|------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------|
| `src/scenes/PreloadScene.js`         | Phaser Texture Manager                      | `gfx.generateTexture(\`drop_${type}\`, 80, 80)`            | ✓ WIRED    | Line 168. Loop covers all six types. Called in `create()` before `scene.start('Menu')`.               |
| `src/systems/GroundDropManager.js`   | Phaser Texture Manager (via Plan 01 textures) | `this.scene.add.image(x, y, \`drop_${type}\`)`            | ✓ WIRED    | Line 101. Template literal matches the `drop_${type}` key pattern registered in PreloadScene.         |
| `_collectDrop` magnet case           | `scene.xpManager.orbs`                     | `scene.xpManager.orbs.forEach(orb => { orb.x=...; ... })`  | ✓ WIRED    | Line 243. Guard `if (scene.xpManager && scene.xpManager.orbs)` prevents crash if manager absent.      |
| `update()` loop                      | `drop.sprite`                               | `drop.sprite.setPosition(drop.x, bobY)` / `drop.sprite.setAlpha(...)` | ✓ WIRED | Lines 167-198. Both position and alpha driven from update loop. Null-checked at line 152.             |

### Requirements Coverage

| Requirement | Source Plan(s)  | Description                                                                                        | Status      | Evidence                                                                                                   |
|-------------|-----------------|-----------------------------------------------------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| VISC-02     | 02-01, 02-02    | Player can identify ground drop type at a glance via visual icon (heart, shield, bomb, magnet, boost, shard) — no text labels | ✓ SATISFIED | Six baked icon textures registered at boot; sprite-based drops replace Graphics+Text architecture; zero text labels on drops; collect burst provides pick-up feedback |

No orphaned requirements found. REQUIREMENTS.md traceability table maps VISC-02 to Phase 2 only. Both plans claim VISC-02 and both deliver it.

### Anti-Patterns Found

| File                             | Line(s) | Pattern                                          | Severity    | Impact                                                                                                                                                   |
|----------------------------------|---------|--------------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/systems/GroundDropManager.js` | 321     | `scene.add.graphics()` in `_updateEliteShardSparkle` | ℹ Info      | Intentional: one sparkle Graphics per 300ms per EliteShard drop, auto-destroyed via tween `onComplete`. Not a hot-path error; event-driven and cleaned up. |
| `src/systems/GroundDropManager.js` | 353, 364, 384 | `scene.add.graphics()` in `_playBombDrama`    | ℹ Info      | Intentional: bomb collect drama (flash, ring, particles). These are one-shot event Graphics, each destroyed on tween completion. This is the intended architecture. |

No blockers or warnings found. All runtime Graphics creation is event-driven (once per drop collect or once per 300ms per idle EliteShard) and self-cleaning.

### Human Verification Required

#### 1. Icon Silhouette Legibility

**Test:** Open game at 390px DevTools viewport (iPhone 12 Pro). Start a game, press I for god mode. Let drops spawn naturally from enemy kills, or trigger an elite kill for EliteShard.
**Expected:** All six drop types appear as clearly distinct icon silhouettes at mobile resolution. Heart reads as a heart shape (red), Shield as a kite/pentagon (blue), Bomb as a round bomb with fuse and orange lit tip (black), Magnet as a U-horseshoe (cyan), Boost as double chevrons >> (yellow), EliteShard as a faceted gem (purple with gold inner facet). No text label floats above or near any drop.
**Why human:** Silhouette readability at 375-390px CSS viewport cannot be asserted from code — the 80px canvas texture maps to physical pixels at runtime and only a human eye can confirm the icons are "distinct at a glance" as VISC-02 requires.

#### 2. Bob and Flicker Animation Quality

**Test:** Watch any idle drop for its full 10-second lifetime.
**Expected:** Drop bobs gently up and down with ~8px visible travel and a smooth ~1.5s rhythm. After ~7 seconds the drop begins flickering, with the flash rate accelerating as the 10-second expiry approaches. When you walk close, the drop slides toward you and the bob stops cleanly.
**Why human:** Animation smoothness and perceived visual quality at actual frame rate requires runtime observation.

#### 3. Collect Burst Visual

**Test:** Walk into a Heart, Shield, Boost, or EliteShard drop.
**Expected:** Icon briefly scales up to ~1.5x, flashes white, then fades out. No floating text (+HP, +SHIELD, BOOST!, +STREAK) appears anywhere on screen. Bomb collect fires the full bomb drama sequence (slow-mo, white flash, expanding orange ring, particles, BOOM! text) — not the scale burst.
**Why human:** Tween chain behavior and absence of floating text at runtime requires visual confirmation.

#### 4. Magnet Crash Test

**Test:** Collect a Magnet drop while multiple XP orbs are present on screen (kill several enemies first, then pick up magnet).
**Expected:** No console error. All XP orbs on screen instantly jump to the player position.
**Why human:** JavaScript runtime errors only surface in browser devtools during execution. The fix is code-verified but crash-freedom needs runtime confirmation.

#### 5. EliteShard Sparkle Particles

**Test:** Spawn an EliteShard drop (requires killing an elite enemy — elite enemies have golden tint) and observe it while it bobs.
**Expected:** Purple and gold sparkle dots float outward from the icon every ~300ms while the drop is idle. Sparkles stop when the drop slides toward the player.
**Why human:** Particle emission at runtime requires visual observation.

### Gaps Summary

No automated gaps found. All eleven must-have truths verified against actual codebase. The phase goal is structurally complete — the code implements everything required for players to identify drops by icon silhouette without reading text.

The five human verification items above are standard visual/runtime checks that cannot be automated. They test whether the correct values (80px texture, 8px bob, 150ms burst tween) produce the intended perceptual result at actual mobile resolution and frame rate. These are confirmatory, not gap-indicating — the implementation fully matches the plan specification.

---

_Verified: 2026-02-27T04:00:00Z_
_Verifier: Claude (gsd-verifier)_
