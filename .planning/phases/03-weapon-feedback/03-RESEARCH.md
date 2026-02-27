# Phase 3: Weapon Visual Feedback - Research

**Researched:** 2026-02-27
**Domain:** Phaser 4 visual effects (setTintFill, Filters/Glow API, sprite animation), kill routing consolidation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hit Flash (Bullet / Direct Fire)
- Hard white-out: the whole enemy sprite goes fully white on hit
- Duration: 40–60ms (very short, snappy)
- Gated: each hit resets the flash timer, does not stack — enemy stays white under sustained rapid fire and snaps off when fire stops
- Crit hits: white flash + orange/gold rim to distinguish from normal hits
- Elite enemies (golden tint): red flash instead of white — signals they're tankier
- Shield hits (Formation Leaders, Bombers): cyan/blue flash — signals shield absorbed, not HP damage
- Bosses: same white flash as regular enemies (HP bar communicates damage progress)

#### Death Effects
- Use craftpix sprite-based effects, NOT code-drawn particles
- Each kill plays: 8-frame explosion animation + 4 ship fragment sprites scatter outward
- Enemy type determines which explosion set is used:
  - Enemy ships → Enemy explosion set
  - Pirate ships → Pirate explosion set
  - UFO ships → UFO explosion set
  - (Claude maps existing enemy variants to closest available set)
- Fragment behavior: radial burst outward from death point, fade + shrink exit (no off-screen drift)
- Elite enemies: bigger explosion scale + more fragments (proportionally more rewarding kill)
- Bombers: smaller death effect than regular enemies (they already have the big AoE detonation)
- No screen shake or slow-mo on regular kills — explosion is enough

#### Screen Beam Fix
- Additive: fires alongside primary weapon (does NOT replace it)
- Fire interval scales with fire rate upgrades (more fire rate = Screen Beam fires more often)
- Animated sweep: beam visibly crosses the screen rather than instant hit
- Brief charge-up glow telegraph (~200ms charge flash before beam sweeps)

#### TwinLaser Contact Feedback
- Pulsing cyan glow on the enemy currently targeted by the beam
- Smooth real-time HP bar drain as laser ticks damage (player watches HP decrease frame by frame)
- Cyan/white spark particles continuously emit from the contact point while beam is active
- Laser kill drama: beam lingers on enemy ~100ms before full explosion triggers — feels like the enemy got cooked

#### Enemy HP Bars
- Always visible from spawn (not hidden at full HP)
- Stays visible until enemy dies (no fade timer)
- Positioned above the enemy sprite
- Shielded enemies (Formation Leaders, Bombers): two-bar system — cyan shield bar above red HP bar; cyan depletes first, then red takes damage
- This matches the cyan hit flash system for shields

#### Boss HP Bar Fix
- Current state: boss bar overlaps player shield/health blocks at top of screen (screenshot confirmed)
- Fix: adjust BAR_Y and verify clear separation from player HUD elements — must be verified in-browser, not just by constant value

#### Kill Routing (AoE Weapons)
- TwinLaser kills and bomb kills MUST route through the same killEnemy() path as bullet kills
- This fixes: kill streak not incrementing, ground drop spawns, XP orbs not awarding on AoE kills
- This is a prerequisite for all other Phase 3 visual work (particles and effects need the kill event to fire correctly)

### Claude's Discretion
- Exact Phaser preFX API choice for hit flash (setTintFill vs addGlow vs custom shader)
- Fragment sprite scale and velocity values
- Spark particle count/velocity for TwinLaser contact
- Precise boss BAR_Y value (find one with clear visual separation)
- How to map current enemy type identifiers to craftpix explosion sprite sets

### Deferred Ideas (OUT OF SCOPE)
- New enemy ship variants using craftpix Pirate + UFO sprites — user explicitly requested "add them now, we have hardly any variation!" — HIGH PRIORITY, dedicated phase after Phase 4
- Possible future use of craftpix boss sprite parts (Boss_01/02/03) as alternate boss designs
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMBT-01 | Player sees a brief white flash on an enemy when their bullet lands (hit confirmation within 100ms) | setTintFill(0xffffff) already used — needs gating, crit/elite/shield variants, timer management |
| CMBT-02 | Enemy health bars visibly drain in real-time during twin laser beam contact (health drain tug animation) | HP bar drawn each frame in drawEnemyHealthBars() — laser tick rate (100ms) drives real-time drain; needs rendered-HP tracking separate from actual HP |
| CMBT-03 | Enemy deaths produce a particle burst (5-8 colored particles) — enemies do not silently disappear | craftpix sprite sets confirmed at correct paths; fragment sprites confirmed at Ship_Effects/ path; Explosions.js needs extension |
| CMBT-04 | TwinLaser and bomb kills correctly trigger kill streak, ground drop spawns, and XP orb rewards (AoE kill logic consolidated) | killEnemy() extraction: bullet kill logic is in GameSceneCollisions.js; TwinLaser.js fire() and GroundDropManager._playBombDrama() both bypass kill streak / ground drops |
| POL-03 | The twin laser shows a sustained glow/highlight on the enemy currently being targeted by the beam | Phaser 4 Filters API confirmed — enemy.enableFilters() + filters.internal.addGlow(); OR simpler: Graphics-drawn cyan circle at enemy position each frame in drawEffects() |
</phase_requirements>

---

## Summary

Phase 3 is a visual and logic-plumbing phase. The kill routing fix (CMBT-04) is genuinely prerequisite: both TwinLaser kills and bomb AoE kills currently bypass the kill streak counter, ground drop spawning, and boss drop logic. The fix is to extract a shared `killEnemy(scene, enemy)` helper into `src/utils/CombatUtils.js` and route all three kill paths through it. This is 30-40 lines of extraction work with high mechanical safety.

The hit flash system (CMBT-01) is almost entirely already implemented — `setTintFill(0xffffff)` is used for bullet hits in `GameSceneCollisions.js` and `setTintFill(0x88eeff)` for laser hits in `TwinLaser.js`. The outstanding work is: enforcing the 40–60ms gate so hits don't stack (use a `_flashTimer` data key to cancel the previous restore callback), adding the crit variant (orange rim via `setTint` after the white flash resolves), and the red flash for elite enemies.

Death effects (CMBT-03) require the most asset work. The craftpix kit has the exact sprite sets needed: 8-frame `Explosion_001–008.png` frames per ship family, and 4 `Ship_Fragment_1–4.png` per family. These are individual files, not sprite sheets — the existing `Explosions.play()` pattern (swap texture on a timer) can be extended directly. Fragment scatter needs a new pattern: spawn 4 `add.image()` sprites at death point, tween each radially outward with fade+shrink, then destroy.

The Phaser 4 Filters/Glow API (`enemy.enableFilters()` + `enemy.filters.internal.addGlow()`) is confirmed available and documented in the installed version (4.0.0-rc.6). However, it has a per-frame draw-call cost — adding a glow to every visible enemy would be expensive. For POL-03 (TwinLaser sustained glow on the beam target), the simpler approach — drawing a cyan circle via the existing `drawEffects()` Graphics pass — is lower cost and sufficient.

**Primary recommendation:** Extract `killEnemy()` first (prerequisite), then ship all three plans (03-01, 03-02, 03-03) as the plan sequence. The plans map directly to the three tasks described in the phase.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 4 | 4.0.0-rc.6 | Game framework — tint, filters, tweens, graphics | Already in use; all APIs verified from node_modules source |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| craftpix sprite assets | local | Explosion animation frames + fragment sprites | Confirmed present at correct paths |
| `src/systems/Explosions.js` | local | Frame-swapping explosion animation helper | Extend for new craftpix explosion sets |
| `src/scenes/GameSceneCollisions.js` | local | Bullet kill logic | Source for killEnemy() extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setTintFill for hit flash | enemy.enableFilters().filters.internal.addGlow() | Glow FX is one extra draw call per object per frame; setTintFill is zero-cost and already proven in codebase |
| Graphics-drawn cyan ring for POL-03 | Glow filter on laser target | Glow filter adds draw call cost for potentially 5+ enemies on screen; Graphics pass already exists in drawEffects() |
| Individual frame files for explosions | Sprite sheets | Individual files match existing Explosions.play() pattern; no atlas conversion needed |

**Installation:** None required — no new packages.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   └── CombatUtils.js       # NEW — killEnemy(scene, enemy) shared helper
├── systems/
│   └── Explosions.js        # EXTEND — add craftpix explosion sets
└── scenes/
    └── GameSceneCollisions.js   # MODIFY — import killEnemy, remove duplicate code
```

### Pattern 1: setTintFill Hit Flash with Gate
**What:** Use `setTintFill()` for full white-out. Store a pending restore handle using enemy data to cancel stacking.
**When to use:** All bullet and laser hit confirmation flashes.
**Example:**
```js
// Source: GameSceneCollisions.js lines 157-167 (existing pattern, needs gate added)
function flashEnemy(scene, enemy, flashColor, duration) {
  // Cancel any pending restore to prevent stacking
  const prev = enemy.getData('_flashTimer');
  if (prev) prev.remove();

  enemy.setTintFill(flashColor);
  const timer = scene.time.delayedCall(duration, () => {
    if (enemy.active) {
      if (enemy.getData('isElite')) {
        enemy.setTint(0xffd700);
      } else {
        const bt = enemy.getData('baseTint');
        bt ? enemy.setTint(bt) : enemy.clearTint();
      }
    }
  });
  enemy.setData('_flashTimer', timer);
}
```

### Pattern 2: killEnemy() Extracted Helper
**What:** Single function that handles all kill side-effects: explosion play, audio, kill streak, XP orb, ground drop, Nebula Rounds cloud, Death Nova, enemy.destroy(), waveManager.onEnemyRemoved().
**When to use:** Every code path that kills a regular enemy — bullet collision, TwinLaser fire(), and GroundDropManager bomb AoE.
**Example:**
```js
// Source: CombatUtils.js (new file)
export function killEnemy(scene, enemy) {
  if (!enemy.active) return;
  const x = enemy.x, y = enemy.y;
  const enemyType = enemy.getData('enemyType') || 'grunt';
  const isElite = enemy.getData('isElite') || false;

  // Explosion + audio
  const explosionPrefix = _getExplosionPrefix(enemyType);
  scene.explosions.play(x, y, explosionPrefix, 8, _getExplosionScale(enemyType, isElite));
  scene.audio.playEnemyExplosion();

  // Kill streak
  scene.killStreak = (scene.killStreak || 0) + 1;

  // Score
  const killType = isElite ? 'elite' : 'basic';
  const pts = scene.scoreManager.addKill(killType) * scene.powerups.getScoreMultiplier();
  scene.score = scene.scoreManager.score;

  // XP
  if (scene.xpManager) {
    let xpValue = scene.xpManager.getXPForEnemy(enemyType);
    if (isElite) xpValue = Math.round(xpValue * 2.5);
    scene.xpManager.spawnOrb(x, y, xpValue);
  }

  // Ground drop
  if (scene.groundDrops) {
    if (enemyType === 'bomber' && enemy.getData('bomberState') !== 'detonate') {
      scene.groundDrops.spawnGuaranteed(x, y, 'bomb');
    } else {
      scene.groundDrops.trySpawnDrop(x, y, isElite);
    }
  }

  // Weapon systems
  if (scene.nebulaRoundsActive && scene.weaponManager?.weapons?.get('B07')) {
    scene.weaponManager.weapons.get('B07').createCloud(x, y);
  }
  if (scene.upgradeManager) scene.upgradeManager.checkDeathNova(x, y);

  enemy.destroy();
  scene.waveManager.onEnemyRemoved();
}
```

### Pattern 3: Fragment Scatter on Death
**What:** Spawn 4 `add.image()` at death position using craftpix Ship_Fragment sprites, tween each radially outward with fade and shrink.
**When to use:** Called inside `killEnemy()` after `scene.explosions.play()`.
**Example:**
```js
// Source: craftpix-981156-space-shooter-game-kit/Enemy-spaceship-game-sprites/PNG/Ship_Effects/
function spawnFragments(scene, x, y, fragmentPrefix, count, scaleMultiplier) {
  for (let i = 0; i < count; i++) {
    const fragIndex = (i % 4) + 1;  // Ship_Fragment_1 to Ship_Fragment_4
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 60;
    const frag = scene.add.image(x, y, `${fragmentPrefix}_fragment_${fragIndex}`)
      .setScale(scaleMultiplier * (0.3 + Math.random() * 0.2))
      .setDepth(25)
      .setAlpha(1);
    scene.tweens.add({
      targets: frag,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 400 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => frag.destroy(),
    });
  }
}
```

### Pattern 4: TwinLaser Sustained Glow via Graphics
**What:** In `TwinLaser.drawEffects()`, draw a pulsing cyan filled-circle at the enemy's position during beam contact.
**When to use:** POL-03 — confirmed beam target needs visual highlight.
**Example:**
```js
// Source: TwinLaser.js drawEffects() — add inside the enemy forEach loop
if (this._inBeam(o.x, o.y, e.x, e.y, aimCos, aimSin, halfW)) {
  // Existing spark flash code stays
  // ADD: pulsing glow ring around target
  const glowPulse = 0.4 + 0.3 * Math.sin(time * 0.015);
  graphics.lineStyle(8, 0x00eeff, glowPulse);
  graphics.strokeCircle(e.x, e.y, 32);
  graphics.lineStyle(3, 0xffffff, glowPulse * 0.7);
  graphics.strokeCircle(e.x, e.y, 28);
}
```

### Anti-Patterns to Avoid
- **Glow filter on each enemy every frame:** `enemy.enableFilters()` + `addGlow()` for hit flash is overkill — one extra render pass per object. Use setTintFill, which is zero additional draw calls.
- **Multiple simultaneous setTintFill restore timers:** Without cancelling the previous timer, rapid fire causes cascading restore callbacks. The `_flashTimer` gate pattern above prevents this.
- **Calling `enemy.destroy()` in TwinLaser.fire() without routing through killEnemy():** This is the current bug — TwinLaser.js line 86 calls `e.destroy()` directly, bypassing kill streak, drops, and score.
- **Fragment sprites with physics bodies:** The fragments are purely visual (no collision needed). Using `add.image()` with tweens is correct; do not add them to the enemies physics group.
- **Loading craftpix explosion frames in PreloadScene with sprite sheet API:** These are individual files, not sprite sheets. The existing `Explosions.play()` approach (load as individual `this.load.image()` calls with a naming convention, then swap texture on timer) is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Explosion animation | Custom frame sequencer | `Explosions.play()` with new prefix | Already works; just add new texture keys |
| Tween-based fragment scatter | Custom movement loop | `scene.tweens.add()` | Handles easing, cleanup via onComplete |
| Hit flash restore | Manual setTimeout tracking | Phaser `scene.time.delayedCall()` + enemy data store | Phaser timer survives pause, scales correctly |

**Key insight:** Almost all required building blocks exist. This phase is mostly wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Flash Timer Stacking
**What goes wrong:** Rapid-fire hits create multiple pending restore timers. When timer 1 fires, it restores tint. Timer 2 fires 20ms later and re-restores, fighting with any new hit that fired in between.
**Why it happens:** Each `time.delayedCall()` is independent; without cancellation, they accumulate.
**How to avoid:** Store the timer handle via `enemy.setData('_flashTimer', timer)` and call `enemy.getData('_flashTimer')?.remove()` before setting a new flash.
**Warning signs:** Enemy flickers between tints at high fire rates.

### Pitfall 2: Craftpix Explosion Frames Are 1-Indexed
**What goes wrong:** Frame keys loaded as `enemy_expl_001` through `enemy_expl_008` but Explosions.play() called with frameCount=9 or starting from 0.
**Why it happens:** The actual filenames start at `Explosion_001.png` (1-indexed), not `Explosion_000.png`.
**How to avoid:** In PreloadScene, load frames starting at index 1 and pass correct frameCount (8) to `Explosions.play()`. OR rename to 0-indexed during preload by loading `Explosion_001.png` as key `enemy_exp_expl_0`, etc.
**Warning signs:** First or last frame shows broken/missing texture.

### Pitfall 3: Fragment Sprites Accumulate if killEnemy() is Called Multiple Times
**What goes wrong:** If a dying enemy is processed twice (e.g., TwinLaser fires once more during the 100ms linger), fragments spawn twice.
**Why it happens:** `enemy.active` is still true during the 100ms linger window.
**How to avoid:** In killEnemy(), call `enemy.setActive(false).setVisible(false)` immediately at entry before spawning effects, then `enemy.destroy()` at the end. The `if (!enemy.active) return` guard at the top of killEnemy() will block the second call.
**Warning signs:** Double explosion + 8 fragments instead of 4.

### Pitfall 4: Phaser 4 Filters Are WebGL-Only
**What goes wrong:** `enemy.enableFilters()` works in WebGL but silently fails or throws in Canvas renderer mode.
**Why it happens:** Documented WebGL-only in `Filters.js` source: `if (typeof WEBGL_RENDERER)`.
**How to avoid:** The Graphics-drawn glow ring for POL-03 is renderer-agnostic. Only use the Filters API if testing confirms WebGL is always active (likely true on mobile, but safer to avoid for this phase).
**Warning signs:** Filters appear missing on some devices.

### Pitfall 5: Boss HP Bar Y Constant — Must Verify In-Browser
**What goes wrong:** Adjusting `BOSS_BAR_Y` in HUD.js to an estimated value that still overlaps or leaves too much gap.
**Why it happens:** HUD.js uses `BOSS_BAR_Y = 60` (near top). The HTML HUD pips are DOM elements outside the canvas — their layout affects visual overlap but not JavaScript constants. Need to verify in actual browser.
**How to avoid:** In the plan task, require: open browser, enable boss (B key in dev mode), confirm visual separation from player shield pips before marking task complete.
**Warning signs:** Looks fine in code but still overlaps in-game.

### Pitfall 6: Animation Key Collision with Existing Keys
**What goes wrong:** New craftpix explosion texture keys conflict with existing `enemy_explosion_0` through `enemy_explosion_8` keys already loaded in PreloadScene.
**Why it happens:** PreloadScene loads `enemy_explosion_0` to `enemy_explosion_8` as 9 frames. The craftpix keys need distinct prefixes.
**How to avoid:** Use prefix `craftpix_enemy_expl_` (not `enemy_explosion_`) for the new sets. The existing `Explosions.play('enemy_explosion', ...)` call stays unchanged; new calls use new prefixes.
**Warning signs:** Explosions show wrong sprite for some enemies.

---

## Code Examples

### Current Kill Path — Bullet (GameSceneCollisions.js lines 111-155)
```js
// Source: src/scenes/GameSceneCollisions.js
if (hp <= 0) {
  const isElite = enemy.getData("isElite");
  const enemyType = enemy.getData("enemyType") || 'grunt';
  const killType = isElite ? "elite" : "basic";
  const pts = scene.scoreManager.addKill(killType) * scene.powerups.getScoreMultiplier();
  scene.score = scene.scoreManager.score;
  scene.explosions.play(enemy.x, enemy.y, "enemy_explosion", 9, 0.12);
  scene.audio.playEnemyExplosion();
  scene.cameras.main.shake(80, 0.003);
  scene.showFloatingText(enemy.x, enemy.y - 30, `+${pts}`, "#ffffff");
  scene.killStreak = (scene.killStreak || 0) + 1;
  if (scene.xpManager) { ... scene.xpManager.spawnOrb(...) }
  if (scene.groundDrops) { ... scene.groundDrops.trySpawnDrop(...) }
  // ... nebula, death nova
  enemy.destroy();
  scene.waveManager.onEnemyRemoved();
}
```

### Current Kill Path — TwinLaser (TwinLaser.js lines 77-88) — BROKEN
```js
// Source: src/weapons/TwinLaser.js — missing: killStreak, groundDrops, score
if (hp <= 0) {
  this.scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
  this.scene.audio.playEnemyExplosion();
  this.scene.cameras.main.shake(60, 0.002);
  const enemyType = e.getData('enemyType') || 'grunt';
  if (this.scene.xpManager) {
    this.scene.xpManager.spawnOrb(e.x, e.y, ...);
  }
  // NO killStreak increment
  // NO groundDrops.trySpawnDrop
  // NO scoreManager.addKill
  e.destroy();
  this.scene.waveManager.onEnemyRemoved();
}
```

### Current Kill Path — Bomb AoE (GroundDropManager.js lines 504-512) — BROKEN
```js
// Source: src/systems/GroundDropManager.js — missing: killStreak, groundDrops, score
if (hp <= 0) {
  scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
  if (scene.xpManager) {
    scene.xpManager.spawnOrb(e.x, e.y, ...);
  }
  // NO killStreak increment
  // NO groundDrops.trySpawnDrop (ironic — bomb kill doesn't spawn drops)
  // NO scoreManager.addKill
  e.destroy();
  scene.waveManager.onEnemyRemoved();
}
```

### Phaser 4 Glow Filter API (from node_modules/phaser/src/gameobjects/components/FilterList.js)
```js
// Source: FilterList.js lines 409–414 — WebGL only
enemy.enableFilters();
const glow = enemy.filters.internal.addGlow(
  0x00eeff,   // color (cyan)
  4,          // outerStrength
  0,          // innerStrength
  1,          // scale
  false,      // knockout
  10,         // quality (immutable after creation)
  10          // distance (immutable after creation)
);
// To animate: tween glow.outerStrength or toggle glow.active
// To remove: enemy.filters.internal.clear()
```

### Explosions.js Extension Pattern (current implementation)
```js
// Source: src/systems/Explosions.js lines 7–25
// Existing pattern: load individual frame images as `${prefix}_0`, `${prefix}_1`, etc.
// Extend by loading craftpix frames under new prefix keys in PreloadScene,
// then calling: this.scene.explosions.play('craftpix_enemy_expl', 8, scale)
// Note: craftpix files are Explosion_001–008 (1-indexed, 8 frames, not 9)
```

### Phaser setTintFill vs setTint
```js
// setTintFill(color) — overrides the ENTIRE sprite with flat color (white-out effect)
// setTint(color)     — multiplies sprite color by tint (golden hue for elites)
// clearTint()        — removes all tint, restores original texture colors
// Source: confirmed by current usage throughout GameSceneCollisions.js and TwinLaser.js
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phaser 3 preFX (addGlow on sprite) | Phaser 4 Filters — `enableFilters()` + `filters.internal.addGlow()` | Phaser 4.0.0 | API completely different; preFX no longer exists as a sprite method |
| `enemy_explosion` (custom 9-frame PNG set at assets/enemies/) | Same custom set + NEW craftpix sets (8-frame per ship family) | Phase 3 | Two coexisting explosion systems; existing calls unchanged |

**Deprecated/outdated:**
- `preFX.addGlow()`: This was Phaser 3. In Phaser 4, the correct API is `gameObject.enableFilters()` then `gameObject.filters.internal.addGlow()`. The installed version (4.0.0-rc.6) has this confirmed from source.

---

## Asset Inventory

### Confirmed Craftpix Explosion Assets
All paths relative to `assets/craftpix-981156-space-shooter-game-kit/`:

| Set | Explosion Frames | Fragment Sprites | Frame Count |
|-----|-----------------|-----------------|-------------|
| Enemy ships | `Enemy-spaceship-game-sprites/PNG/Ship_Effects_Sprites/Explosion_001–008.png` | `Enemy-spaceship-game-sprites/PNG/Ship_Effects/Ship_Fragment_1–4.png` | 8 frames |
| Pirate ships | `Pirate-spaceship-game-sprites/PNG/Ship_Effects_Sprites/Explosion_001–007.png` | `Pirate-spaceship-game-sprites/PNG/Ship_Effects/Ship_Fragment_1–4.png` | 7 frames |
| UFO ships | `Ufo-spaceship-game-sprites/PNG/Ship_Effects_Sprites/Explosion_001–008.png` | `Ufo-spaceship-game-sprites/PNG/Ship_Effects/Ship_Fragment_1–4.png` | 8 frames |

Note: Pirate set has only 7 frames (Explosion_001–007), not 8.

### Enemy Type → Sprite Set Mapping (Recommended)
Current enemy types use sprites from `ENEMY_TYPES` in `src/config/waves.js`:

| Enemy type | Sprite keys | Recommended explosion set |
|------------|-------------|--------------------------|
| grunt | enemy_01, enemy_02 | Enemy (default) |
| zigzagger | enemy_03 | Enemy |
| diver | enemy_04 | Enemy |
| formation_leader | enemy_05 | Enemy |
| bomber | enemy_06 | Enemy (smaller scale — user decision) |

All current enemy sprites map to the Enemy set since they are all from the same craftpix enemy sprite pack. Pirate and UFO sets are available but reserved for the dedicated new-enemy-types phase (deferred).

---

## Open Questions

1. **Screen Beam weapon: which weapon ID is it?**
   - What we know: The phase plans mention "Screen Beam fix — additive firing". No weapon named "ScreenBeam" was found in the weapons directory or WeaponManager during this research.
   - What's unclear: The weapon may be called by a different name, may not yet be implemented, or may be `PhotonDevastator.js`.
   - Recommendation: Planner should inspect `src/weapons/PhotonDevastator.js` and `src/systems/WeaponManager.js` weapon registry before creating the 03-01 plan task. If Screen Beam is unimplemented, the fix cannot be planned yet; note this in the plan as a conditional task.

2. **TwinLaser 100ms kill linger: beam visual during linger window**
   - What we know: The user wants "beam lingers on enemy ~100ms before full explosion triggers". The laser uses Graphics redrawn each frame.
   - What's unclear: During the 100ms linger, the enemy is destroyed (or deactivated). If the enemy no longer exists, the `_inBeam` check in `drawEffects()` won't find it in `scene.enemies`.
   - Recommendation: Store the linger target separately (e.g. `this._lingerTarget = {x, y, endTime}`) in TwinLaser and draw the glow at stored coordinates until endTime expires.

3. **HP bar draw is per-frame Graphics.clear() — acknowledged concern from STATE.md**
   - What we know: STATE.md flags this: "Per-frame Graphics.clear() redraw in hot paths (XP orbs, enemy HP bars, HUD bars) must be addressed in the phase that first touches each system."
   - What's unclear: Whether to optimize now (dirty-flag pattern) or just accept it for Phase 3.
   - Recommendation: The CMBT-02 HP drain animation requires the bar to update on every laser tick (every 100ms), which is already handled by the per-frame clear+redraw. The performance concern is real but not a correctness blocker. Add a `_lastHPDrawn` data key per enemy and skip redraw if HP unchanged — same dirty-flag pattern used in HUD.js. Planner should include this as a subtask of 03-03.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — no vitest, jest, or other test runner found |
| Config file | None |
| Quick run command | `npm run dev` + manual in-browser verification |
| Full suite command | N/A |
| Estimated runtime | ~5 seconds to Vite HMR reload |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMBT-01 | White flash visible on bullet hit within 100ms | manual | Dev mode: shoot an enemy, observe flash | N/A |
| CMBT-02 | HP bar drains in real-time during TwinLaser contact | manual | Dev mode: hold laser on enemy, watch HP bar | N/A |
| CMBT-03 | Explosion + 4 fragments appear on enemy kill | manual | Dev mode: kill enemies, observe death effects | N/A |
| CMBT-04 | TwinLaser kills increment kill streak | manual | Dev mode: X key for streak HUD, kill with laser | N/A |
| CMBT-04 | Bomb AoE kills increment kill streak | manual | Dev mode: collect bomb drop, observe streak | N/A |
| POL-03 | Cyan glow ring visible on laser beam target | manual | Dev mode: hold laser on enemy, observe ring | N/A |

### Nyquist Sampling Rate
- **Minimum sample interval:** After each task — open `http://localhost:5173?dev=1` in browser, run dev mode checks
- **Full suite trigger:** All manual checks before phase close
- **Phase-complete gate:** All 5 manual verifications pass in a single browser session
- **Estimated feedback latency per task:** ~5 seconds (Vite HMR reload)

### Wave 0 Gaps (must be created before implementation)
- No test framework to install. All verification is manual in-browser.
- Verification checklist will be created in 03-VERIFICATION.md per project convention.

*(No automated test infrastructure exists. This is consistent with all previous phases in this project.)*

---

## Sources

### Primary (HIGH confidence)
- `node_modules/phaser/src/gameobjects/components/Filters.js` — confirmed enableFilters() API, WebGL-only annotation
- `node_modules/phaser/src/gameobjects/components/FilterList.js` — confirmed addGlow() signature with all 7 parameters
- `node_modules/phaser/src/filters/Glow.js` — confirmed Glow class parameters including quality/distance immutability note
- `src/scenes/GameSceneCollisions.js` — confirmed complete bullet kill path (lines 111–155)
- `src/weapons/TwinLaser.js` — confirmed missing kill routing (lines 77–88)
- `src/systems/GroundDropManager.js` — confirmed missing kill routing in bomb AoE (lines 504–512)
- `assets/craftpix-981156-space-shooter-game-kit/` — confirmed all explosion and fragment sprite paths via filesystem scan
- `src/config/waves.js` — confirmed enemy type → sprite key mappings

### Secondary (MEDIUM confidence)
- `src/systems/Explosions.js` — confirmed frame-swap animation approach (23 lines, very simple)
- `src/systems/HUD.js` — confirmed BOSS_BAR_Y = 60 as current value; HTML DOM pips layout not measured

### Tertiary (LOW confidence)
- Screen Beam weapon identity — not resolved during research; requires inspection of PhotonDevastator.js

---

## Metadata

**Confidence breakdown:**
- Kill routing fix (CMBT-04): HIGH — all three broken paths located and analyzed, fix is straightforward extraction
- Hit flash (CMBT-01): HIGH — setTintFill already proven in codebase, gate pattern is mechanical
- Death effects (CMBT-03): HIGH — all asset paths confirmed on filesystem; Explosions.js extension pattern clear
- TwinLaser feedback (CMBT-02, POL-03): HIGH — drawEffects() pattern clear; linger target storage is LOW (open question)
- Boss HP bar fix: MEDIUM — constant location found, but correct Y value requires in-browser verification
- Screen Beam: LOW — weapon identity unresolved

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable Phaser 4 RC API; craftpix assets are local)
