# Architecture Research

**Domain:** Mobile horde-survivor game UX feedback systems (Phaser 3/4)
**Researched:** 2026-02-24
**Confidence:** HIGH (grounded in existing codebase analysis + verified Phaser docs patterns)

---

## Research Question

How should UX feedback systems be structured in a Phaser 3 horde-survivor game, covering:
1. Health bar rendering (per-entity, 30+ enemies simultaneously)
2. HUD system architecture (layered vs single scene)
3. Particle/effect system (pooling, queuing, budget)
4. Weapon visual feedback pipeline (beam, hit detection, damage indicators)
5. Icon-based power-up/drop rendering (sprite atlas vs procedural)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENDER LAYER (depth ordering)                 │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────┤
│ depth 0  │ depth 5  │ depth 8  │ depth 15 │ depth 50 │ depth 99+   │
│Background│ XP Orbs  │ Drops    │ Weapon   │ Enemy HP │ HUD         │
│(bg.js)   │(graphics)│(graphics)│ FX       │ Bars     │(fixed UI)   │
│          │          │+ tweens  │(shared   │(single   │             │
│          │          │          │ graphics)│ graphics)│             │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       SINGLE SCENE ARCHITECTURE                      │
│                                                                      │
│  GameScene (hub)                                                     │
│  ├── HUD (system)           ← scrollFactor(0), depth 99-101        │
│  ├── StatBar (ui)           ← scrollFactor(0), depth 100           │
│  ├── XPManager (system)     ← shared Graphics object, depth 5      │
│  ├── GroundDropManager      ← per-drop Graphics + tween, depth 8   │
│  ├── WeaponManager          ← shared aoeGraphics, depth 15         │
│  ├── enemyHPBars            ← single shared Graphics, depth 50     │
│  ├── FloatingText           ← add.text() + tween-destroy pattern   │
│  └── Explosions             ← sprite animation system              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| HUD | Player shield/health/XP/score/boss bars, fixed to screen | Graphics objects with setScrollFactor(0), depth 99-101 |
| StatBar | Debug/stat strip at bottom of screen | Text object with setScrollFactor(0), depth 100 |
| XPManager | Orb movement, magnet attraction, XP accumulation, drawing | Single shared Graphics object cleared each frame |
| GroundDropManager | Drop spawning, fade/expire lifecycle, collection | Per-drop Graphics + tweens; label text above each drop |
| WeaponManager | Weapon registry, shared bullet pool, shared AoE graphics | Shared aoeGraphics object cleared and redrawn each frame |
| enemyHPBars | Per-enemy health and shield pip rendering | Single shared Graphics object cleared/redrawn each frame |
| FloatingText | Damage numbers, event popups (BLOCKED!, +HP etc) | add.text() + tween to y-60/alpha-0 + destroy in onComplete |
| Explosions | Enemy death animations | Sprite frame animation from spritesheet |

---

## Recommended Project Structure

The existing structure is well-organized. UX feedback work slots into existing locations:

```
src/
├── config/
│   └── constants.js          # Add: EFFECT_BUDGET, PARTICLE_MAX, HUD_DEPTHS
├── systems/
│   ├── HUD.js                # Modify: relocate stat bar, add icons, polish
│   ├── XPManager.js          # Modify: change orb color orange, icon atlas
│   ├── GroundDropManager.js  # Modify: replace text labels with icon sprites
│   ├── WeaponManager.js      # Shared aoeGraphics — used by all weapons
│   └── FloatingTextManager.js  # NEW: pooled floating text system
├── ui/
│   ├── UpgradeCardUI.js      # Existing — cards slide in from right
│   └── StatBar.js            # Existing — may move/redesign
├── weapons/
│   └── TwinLaser.js          # Modify: improved visual feedback, impact flares
└── assets/
    └── drops-atlas.json      # NEW: sprite atlas for drop icons
```

### Structure Rationale

- **systems/**: Stateful managers instantiated by GameScene — HUD, XPManager, GroundDropManager all belong here
- **ui/**: Pure display components that render state they don't own (UpgradeCardUI, StatBar)
- **weapons/**: Each weapon owns its own visual feedback in `drawEffects()` — no centralized effect coordinator needed
- **assets/drops-atlas**: Icon sprites for ground drops replace procedural text labels

---

## Architectural Patterns

### Pattern 1: Single Shared Graphics Object (Batched Enemy HP Bars)

**What:** One `Graphics` object is created in `GameScene.create()`. Every frame in the update loop, it is cleared and all enemy health bars are redrawn in a single pass.

**When to use:** Any system that must render per-entity indicators for 30+ entities simultaneously. The single graphics object means one WebGL draw call regardless of entity count.

**Trade-offs:**
- Pro: O(1) draw calls — scales to 100+ enemies without degradation
- Pro: No per-entity object lifecycle management (no create/destroy per enemy)
- Con: Full redraw every frame even if no enemies moved
- Con: Cannot animate individual bars independently (no per-bar tweens)

**This is what the game already does correctly:**

```javascript
// GameScene.create()
this.enemyHPBars = this.add.graphics().setDepth(50);

// GameScene.update() — called every frame
drawEnemyHealthBars() {
  this.enemyHPBars.clear();  // Single clear
  this.enemies.getChildren().forEach(e => {
    if (!e.active) return;
    const ratio = e.getData('hp') / e.getData('maxHP');
    // Draw background + fill + shield pips in one pass
    this.enemyHPBars.fillRect(e.x - 25, e.y - 45, 50 * ratio, 5);
  });
}
```

**Confidence:** HIGH — this is the established Phaser pattern for bulk-rendering indicators. Verified in official Phaser health bar examples.

---

### Pattern 2: Shared aoeGraphics for Weapon Effects

**What:** `WeaponManager` owns a single `aoeGraphics` object. Each frame: clear once, then each active weapon calls `weapon.drawEffects(graphics, time)` to render into it. This batches all continuous weapon visuals (beams, vortexes, auras) into one draw call.

**When to use:** Continuously-rendered weapon effects that change every frame (lasers, AoE rings, orbital paths).

**Trade-offs:**
- Pro: All weapon continuous effects = one draw call total
- Pro: New weapon can add visuals by implementing `drawEffects()` with no changes to WeaponManager
- Con: All effects share same blend mode (no per-weapon ADD blend without flush)
- Con: Effects order is draw-order within one frame, not depth-sortable

**This is what the game already does correctly:**

```javascript
// WeaponManager.update()
update(time, delta) {
  this.aoeGraphics.clear();          // One clear
  for (const [id, weapon] of this.weapons) {
    weapon.update(time, delta);
    weapon.drawEffects(this.aoeGraphics, time);  // Each weapon draws into shared object
  }
}
```

**Extension pattern for TwinLaser impact flares:**

```javascript
// TwinLaser.drawEffects() — add impact flare without new objects
drawEffects(graphics, time) {
  // ... existing beam drawing ...
  // Impact flare at contact points
  this.scene.enemies.getChildren().forEach(e => {
    if (!e.active) return;
    if (this._inBeam(o.x, o.y, e.x, e.y, aimCos, aimSin, halfW)) {
      const flareSize = 8 + 6 * Math.sin(time * 0.02);
      graphics.fillStyle(0xffffff, 0.9);
      graphics.fillCircle(e.x, e.y, flareSize);
      // Drain visualization: colored rings showing damage tick
      graphics.lineStyle(2, 0x00ccff, 0.5);
      graphics.strokeCircle(e.x, e.y, flareSize * 2);
    }
  });
}
```

**Confidence:** HIGH — verified in existing TwinLaser.js implementation.

---

### Pattern 3: Tween-Destroy Pattern for Floating Text

**What:** For infrequent events (damage numbers, pickups, status words), spawn a text object, animate it with a tween, destroy in `onComplete`. Do NOT pool these — they're infrequent enough that GC impact is negligible compared to code complexity.

**When to use:** Events that happen at most ~5-10 times per second. Shield hits, XP pickups, status popups.

**Trade-offs:**
- Pro: Zero ongoing state — no pool management
- Pro: Each text is independently tweened (move up, fade out)
- Con: GC pressure if called 60x/second (not an issue at current event rates)
- Con: If called excessively (e.g., TwinLaser tick hits), must throttle at call site

**The existing pattern is correct for the use case:**

```javascript
showFloatingText(x, y, text, color) {
  const t = this.add.text(x, y, text, { fontSize: '32px', color, ... })
    .setOrigin(0.5).setDepth(200);
  this.tweens.add({
    targets: t,
    y: y - 60,
    alpha: 0,
    duration: 1000,
    onComplete: () => t.destroy(),  // Clean self-destruct
  });
}
```

**TwinLaser throttle requirement:** TwinLaser fires every 100ms. If it shows floating text on every hit tick, that's 10 texts/second per enemy-in-beam — this will cause visible degradation. Floating text must be throttled (show only on kill, or max 1/500ms per enemy).

**Confidence:** HIGH — pattern verified in GameScene.js and consistent with Phaser community recommendations.

---

### Pattern 4: Per-Drop Graphics with Tweens (Ground Drops)

**What:** Each ground drop owns its own `Graphics` object drawn once on creation plus a text label. Tweens run on the Graphics object for pulse/spin animation. On collect/expire, objects are destroyed.

**When to use:** Items where individual animated behavior is required and count is low (max 12 drops).

**Trade-offs:**
- Pro: Each drop animates independently (pulse, spin, fade)
- Pro: Simple to add per-type behavior (bomb drama = drop owns its effects)
- Con: Max 12 Graphics objects + 12 Text objects + multiple tweens = manageable but not zero cost
- Con: Each Graphics object is a separate WebGL path — 12 objects = up to 12 draw calls

**The existing implementation is correct for 12 items. The bottleneck is the text labels, not the shapes.**

**Icon replacement pattern (switching text to sprites):**

```javascript
// Instead of: const label = scene.add.text(x, y - 24, cfg.label, ...)
// Use: sprite from atlas
const icon = scene.add.image(x, y, 'drops-atlas', cfg.iconFrame)
  .setScale(0.5).setDepth(9);
// Same tweens apply to image as to graphics
```

**This requires creating a sprite atlas with the 6 drop icons.** Sprites batch-render when from the same atlas (one draw call for all 12 drops instead of 12), making this a meaningful mobile performance improvement.

**Confidence:** MEDIUM — the icon approach is established Phaser practice. Atlas batching confirmed by Phaser docs (same base texture = batched). Implementation requires asset creation.

---

### Pattern 5: HUD as Single-Scene Fixed-Position Objects

**What:** All HUD elements (health bar, shield bar, XP bar, boss bar, score, wave number) live in the same `GameScene` as the gameplay. They use `setScrollFactor(0)` to stay fixed to the viewport, and high depth values (99-101) to render above gameplay.

**When to use:** Mobile portrait games where UI is always visible and does not need to be independently paused/toggled.

**Trade-offs vs Separate UIScene:**
- Pro: No inter-scene communication overhead — HUD reads `scene.hp`, `scene.score` directly
- Pro: HUD participates in scene pause (`upgradePaused`) automatically
- Pro: Simpler architecture — no EventEmitter bridge required
- Con: HUD and gameplay share the same scene lifecycle (can't sleep gameplay while keeping HUD)
- Con: Harder to reuse HUD across scenes (ResultsScene needs its own layout)

**Verdict: Single-scene HUD is correct for this game.** The game has one active scene at a time, the HUD always maps 1:1 to GameScene state, and the upgrade pause mechanism (`upgradePaused` flag gates the update loop) works cleanly within one scene. A separate UIScene would add cross-scene communication complexity with no concrete benefit for this game's architecture.

**Confidence:** MEDIUM — Phaser docs say both approaches are valid. Single-scene is correct here because the HUD is tightly coupled to GameScene state and the upgrade pause mechanism already handles modal UX within the scene.

---

### Pattern 6: Procedural Graphics for Unique Game-Feel Elements

**What:** XP orbs, shield pulse glows, HUD bars are drawn with `Graphics.fillCircle()` / `fillRoundedRect()` every frame rather than using sprite assets. This enables dynamic coloring (health gradient) and animation (pulse alpha via `sin(time)`) without texture swaps.

**When to use:** Elements that need dynamic color, glow effects, or per-frame parameter variation that sprites cannot express cheaply.

**Trade-offs:**
- Pro: No texture assets required — fully code-driven, easy to iterate
- Pro: Dynamic color changes are free (no texture swaps = no batch flush)
- Con: Graphics calls are more expensive per-primitive than batched sprites
- Con: Complex shapes (many circles) add CPU path-building overhead

**Performance ceiling for mobile:** The current XP orb system draws 3 circles per orb (outer glow, mid, core) + 1 white dot. At 30 orbs on screen: 120 circle draw calls per frame into one Graphics object. This is within mobile budget. At 80+ orbs, consider reducing to 2-layer glow.

**Confidence:** MEDIUM — based on existing code analysis + Phaser performance guides noting blend modes and complex path counts as mobile cost drivers.

---

## Data Flow

### Visual Feedback Trigger Flow

```
Game Event
    ↓
GameScene (detects event in update/collision)
    ↓ direct method call
System/Manager (owns the visual)
    ↓ draws into
Graphics / Text / Tween
    ↓ rendered by
Phaser WebGL renderer (batched by texture)
```

### Enemy Kill → Visual Cascade

```
GameSceneCollisions.onBulletHitEnemy()
    ↓ hp <= 0
    ├── explosions.play(x, y)           → sprite animation (Explosions system)
    ├── audio.playEnemyExplosion()       → Web Audio
    ├── xpManager.spawnOrb(x, y, xp)    → adds to orbs[] array
    ├── groundDrops.trySpawnDrop(x, y)  → maybe creates Graphics + tween
    ├── scene.killStreak++              → triggers statBar.update() next frame
    └── waveManager.onEnemyRemoved()    → wave completion check
```

### Player Damage → Visual Cascade

```
scene.damagePlayer()
    ├── Shield hit:
    │   ├── audio.playShieldHit()
    │   ├── cameras.main.shake(180, 0.004)
    │   ├── showFloatingText('BLOCKED!', '#44ffff')  → tween-destroy text
    │   └── [shield break] → white flash Graphics + showFloatingText('SHIELD DOWN!')
    └── HP damage:
        ├── audio.playPlayerHit()
        ├── cameras.main.shake(180, 0.004)
        └── vignette red flash → Graphics + alpha tween → destroy
```

### Upgrade Card Flow

```
xpManager.addXP() → threshold crossed
    ↓
upgradeManager.triggerCardSelection()
    ↓
upgradePaused = true + physics.pause() + time.paused = true
    ↓
UpgradeCardUI.show(cards)             → containers slide in from right
    ↓
Player taps card
    ↓
UpgradeCardUI._onCardSelected()
    → upgradeManager.applyUpgrade()   → playerStats.modify()
    → UpgradeCardUI._cleanup()        → destroy all containers
    → upgradeManager.onCardSelected() → upgradePaused = false, physics.resume()
```

### HUD Update Flow (per frame)

```
GameScene.update()
    ↓
hud.update(score, hp)
    ├── scoreText.setText()
    ├── shieldBarFill.clear() → fillRoundedRect()
    ├── shieldGlow.clear() → pulse if recharging
    └── healthBarFill.clear() → fillRoundedRect() with gradient color

hud.updateXPBar(xp, threshold, level)
    └── xpBarFill.clear() → fillRect()

statBar.update()
    └── text.setText() — stat string rebuild
```

---

## Build Order (Dependencies)

Systems must be built in this order because later systems depend on earlier ones:

```
1. Config layer (constants, depths, budgets)
   └── No dependencies

2. HUD (core player status display)
   └── Depends on: GAME constants, scene reference

3. XPManager (orb rendering + level-up)
   └── Depends on: HUD (calls hud.updateXPBar), upgradeManager (calls triggerCardSelection)

4. GroundDropManager (drop icons + bomb drama)
   └── Depends on: XPManager (spawnOrb on bomb kills), audio, explosions

5. WeaponManager + individual weapons (aoeGraphics, drawEffects)
   └── Depends on: bullet pools, playerStats, enemies group

6. FloatingText system (damage indicators, event popups)
   └── Depends on: GameScene add.text / tweens (already available)

7. StatBar (HUD strip)
   └── Depends on: all playerStats being set on scene

8. UpgradeCardUI (card selection modal)
   └── Depends on: upgradeManager, playerStats, physics pause mechanism
```

**Implication for milestone phases:**
- Phase 1 should address HUD layout/icons (no dependencies except constants)
- Phase 2 should address XP orb visuals + ground drop icons (depend on HUD being stable)
- Phase 3 should address weapon visual feedback (TwinLaser polish, impact flares) — depends on weapon architecture being stable
- Phase 4 should address FloatingText throttling and polish — touches everything, do last

---

## Anti-Patterns

### Anti-Pattern 1: Per-Entity Graphics Objects for Enemy HP Bars

**What people do:** Create a `Graphics` object for every enemy when it spawns, store on `enemy.userData.hpBar`, move it with the enemy each frame, destroy on enemy death.

**Why it's wrong:** At 30 enemies = 30 Graphics objects = up to 30 WebGL draw calls per frame just for health bars. Each Graphics object has its own path buffer. On mobile, each extra draw call costs real frame budget.

**Do this instead:** One shared `Graphics` object owned by GameScene, cleared and redrawn each frame in a single pass. Already implemented correctly in the game as `this.enemyHPBars`.

---

### Anti-Pattern 2: Floating Text Without Throttling at High-Frequency Sources

**What people do:** Call `showFloatingText()` on every TwinLaser damage tick (every 100ms), every XP orb collection, every shield hit.

**Why it's wrong:** TwinLaser fires every 100ms. With 3 enemies in beam = 30 text objects created per second. Each create/tween/destroy cycle is GC pressure. Text objects render as individual draw calls (not batched). Screen becomes unreadable noise.

**Do this instead:** Throttle floating text at the call site. For weapons that tick: show text only on kill, or max once per 500ms per enemy. For XP orbs: show text only on level-up, not on each orb collect.

```javascript
// Throttle example — track lastTextTime per enemy
fire(time) {
  // ... damage logic ...
  if (hp <= 0) {
    // Kill = always show
    this.scene.showFloatingText(e.x, e.y, 'DESTROYED', '#ff4444');
  }
  // Do NOT show per-tick damage text for beam weapons
}
```

---

### Anti-Pattern 3: Multiple Graphics Objects for What Should Be One

**What people do:** Create separate `Graphics` objects for bar background, bar fill, and border — three objects per element.

**Why it's wrong:** Three times the draw calls and path buffers. For a 5px tall health bar, the overhead of three Graphics objects dwarfs the rendering cost.

**Do this instead:** One Graphics object draws background, then fill, then optional border in sequence. Already implemented correctly in HUD.js (separate bg/fill objects for static vs animated portions is the one valid exception — bg is drawn once in constructor, fill is updated each frame).

---

### Anti-Pattern 4: DOM-Based HUD in HTML Over the Canvas

**What people do:** Put health bars and HUD elements in HTML div elements positioned over the canvas using CSS `position: absolute`.

**Why it's wrong:** DOM and canvas do not share a coordinate system. Mobile scaling (Phaser FIT scaling to fill the viewport) means the canvas pixel space and DOM pixel space diverge. CSS positions won't track game world coordinates. Also breaks the upgrade pause flow.

**Do this instead:** All HUD in Phaser objects with `setScrollFactor(0)`. This is what the game already does correctly.

---

### Anti-Pattern 5: New Text Object Per Floating Number Without Depth Management

**What people do:** `add.text()` floating numbers at default depth (0), resulting in damage numbers appearing behind enemies and backgrounds.

**Why it's wrong:** Numbers disappear behind sprites. On mobile, text at depth 0 is invisible in combat.

**Do this instead:** Always set floating text to depth 200+ (above enemies at depth ~10, above weapons at depth 15, above HP bars at depth 50). The existing `showFloatingText()` correctly uses depth 200.

---

## Component Boundaries

| Component | What It Owns | What It Reads | What It Never Touches |
|-----------|--------------|---------------|----------------------|
| HUD | shieldBarFill, healthBarFill, xpBarFill, scoreText | scene.hp, scene.playerShield, scene.score | enemies, weapons, physics |
| XPManager | orbs[], _gfx (shared graphics) | scene.player.x/y, scene.playerMagnet | HUD, weapons, drops |
| GroundDropManager | drops[], each drop's gfx + label + tweens | scene.player, scene.xpManager | HUD, weapons |
| WeaponManager | weapons Map, weaponBullets pool, aoeGraphics | scene.playerDamage, scene.playerFireRate, scene.enemies | HUD, XP, drops |
| Individual Weapons | lastFireTime, level state | WeaponManager (via this.manager) | scene state directly |
| enemyHPBars | single shared Graphics | scene.enemies (getData hp/maxHP/shield) | everything else |
| FloatingText | Text object (temporary) | call site provides x, y, text, color | nothing — stateless |
| UpgradeCardUI | containers[], overlay, active flag | upgradeManager.drawCards() results | gameplay systems |

---

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 30 enemies (current) | Single shared Graphics for HP bars — sufficient, no change needed |
| 60 enemies (wave 10+) | Still fine — Graphics clear/redraw is O(n) in draw calls only for the fill rects, not WebGL calls |
| 100+ enemies (extreme escalation) | Consider reducing enemy HP bar visibility distance — only draw bars for enemies within 400px of player |
| 30 drops on screen | Current max is 12 — fine. If raised to 30+, switch drop Graphics to sprite atlas for batching |
| 10 active weapons simultaneously | aoeGraphics shared pattern handles this — 10 weapons = still 1 draw call for all effects |

### Scaling Priorities

1. **First bottleneck (mobile):** Particle/effect creation rate during heavy combat. The bomb drama creates 16 individual Graphics objects. If bombs detonate in sequence, GC pressure spikes. Fix: use a pooled particle system or limit to 1 active bomb drama at a time.

2. **Second bottleneck:** Text object count from floating text. If enemy density increases and more systems call showFloatingText(), the create-tween-destroy cycle accumulates. Fix: implement FloatingTextManager with a pool of pre-created text objects that are repositioned and tweened rather than created fresh.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| GameScene ↔ HUD | Direct method calls (hud.update, hud.showBossHP) | HUD is owned by GameScene, tight coupling is intentional |
| GameScene ↔ XPManager | Direct method calls (xpManager.spawnOrb, addXP) | Orb spawning triggered from collision handler |
| WeaponManager ↔ Individual Weapons | Template method pattern (fire, drawEffects, onLevelChanged) | Weapons never call GameScene directly — always via manager |
| GroundDropManager ↔ PlayerStats | Direct scene property read (scene.playerStats.addPercent) | Boost drop modifies stats; acceptable tight coupling |
| UpgradeCardUI ↔ UpgradeManager | Bidirectional: Manager calls show(), UI calls applyUpgrade() | Circular dependency managed by both holding scene reference |

### Key Depth Assignments

| Layer | Depth Range | Contents |
|-------|-------------|----------|
| Background | 0-2 | ScrollingBackground tiles |
| Gameplay mid | 3-9 | Enemies (4), player (5), drops (8-9) |
| Gameplay overlay | 10-20 | Weapon effects / aoeGraphics (15) |
| HP indicators | 50 | enemyHPBars shared Graphics |
| HUD background | 99 | HUD backdrop rectangles |
| HUD elements | 100-101 | Bars, text, icons |
| Floating text | 200 | showFloatingText results |
| Modal overlays | 300-400 | Upgrade cards (350), flash effects (400) |
| Dev overlay | 500 | Dev mode text |

---

## Sources

- Existing codebase: `src/systems/HUD.js`, `src/systems/XPManager.js`, `src/systems/GroundDropManager.js`, `src/scenes/GameScene.js`, `src/weapons/TwinLaser.js`, `src/systems/WeaponManager.js` — HIGH confidence (direct code analysis)
- Phaser official docs: https://docs.phaser.io/phaser/concepts/scenes — scene parallel launch, UI scene patterns — HIGH confidence
- Phaser official examples: https://phaser.io/examples/v3.85.0/game-objects/graphics/view/health-bars-demo — per-entity vs shared graphics pattern — HIGH confidence
- Phaser optimization guide (2025): https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025 — object pooling, canvas sizing, rendering method selection — MEDIUM confidence
- Phaser community (verified patterns): https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348 — HUD scene launch patterns — MEDIUM confidence
- Phaser WebGL batching: Multiple sources confirm same-atlas sprites batch into 1 draw call; Graphics objects cause per-path overhead; blend modes cause batch flushes — HIGH confidence (multiple sources agree)
- Mobile WebGL performance budget: https://gamedevjs.com/articles/best-practices-of-optimizing-game-performance-with-webgl/ — particle limits, draw call budget — MEDIUM confidence

---

*Architecture research for: Star Assault — mobile horde-survivor UX feedback systems*
*Researched: 2026-02-24*
