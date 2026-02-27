# Phase 2: Ground Drop Icon System - Research

**Researched:** 2026-02-27
**Domain:** Phaser 4 Graphics / generateTexture / Sprite-based ground drops
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Icon visual style:**
- Chunky pixel-art aesthetic — bold, chunky shapes for arcade readability
- 64px rendered size (larger than current text labels for mobile legibility)
- Each drop has a distinct silhouette + functional color (shape AND color, not color alone)
- Solid filled shapes with no inner detail — maximum contrast at small sizes
- No text labels on any drop

**Per-type icons:**
- **Heart**: heart silhouette, red
- **Shield**: shield/chevron silhouette, blue (same blue as HUD shield: `0x4488ff`) — consistent color language
- **Bomb**: classic cartoon bomb (black circle + fuse with orange/yellow tip), orange/yellow
- **Magnet**: U-shape horseshoe magnet, cyan/teal
- **Boost**: double-chevron (>>) fast-forward arrows, yellow/orange
- **EliteShard**: crystal/gem shard silhouette, purple (`0xAA44FF`) + gold shimmer

**Drop container / framing:**
- Dark semi-transparent backing circle behind each icon (~60% opacity, slightly larger than the icon)
- Backing circle baked into the same `generateTexture()` call — single sprite per drop
- All 6 drop types use uniform dark backing, **except** EliteShard which gets a purple-tinted backing
- Texture total size: backing circle ~80px diameter containing the 64px icon core

**Collect feedback:**
- Primary feedback: icon scale burst to ~1.5x over 150ms + white flash at peak scale + fade out over 100ms
- **Remove all floating text on collect** (no "+HP", "+SHIELD", "+STREAK" etc.) — icon flash is sufficient
- No camera shake on collect — shake is reserved for damage events only
- **Bomb exception**: Bomb collect skips the icon scale-burst (the existing bomb drama is the feedback)
- EliteShard and all other drops get the standard scale-burst + white flash + fade

**Idle animation on ground:**
- Gentle vertical bob: ~8px amplitude, ~1.5s sinusoidal cycle
- **Urgency flicker**: in the final 3s of lifetime (at 7s age), drop starts flickering/flashing at increasing rate to signal expiry
- **Bob stops** when drop enters attract radius and is actively moving toward player — smooth travel, no jitter
- No visual change when entering attract radius — movement is the signal
- **EliteShard only**: small purple/gold sparkle particles float outward while bobbing idle

**Magnet attract behavior:**
- Only XP orbs are attracted by the Magnet drop — ground drops (Heart, Shield, etc.) are unaffected
- Drops require physical proximity (40px collect radius) to pick up

### Claude's Discretion
- Exact Phaser tween/timer implementation details
- Sparkle particle count and exact spread for EliteShard idle
- Exact bob offset math and flicker frequency curve
- How to wire the flicker in the existing `update()` loop

### Deferred Ideas (OUT OF SCOPE)
- **Bomb AoE radius too small** — gameplay balance/mechanics fix, belongs in a separate phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VISC-02 | Player can identify ground drop type at a glance via visual icon (heart, shield, bomb, magnet, boost, shard) — no text labels | generateTexture pattern bakes distinct icon sprites per type into the Texture Manager at boot; sprites replace the current Graphics+text label approach |
</phase_requirements>

---

## Summary

The current `GroundDropManager` draws each drop using a live `Graphics` object and a separate `Text` label. This works but is the wrong architecture for the target goal: six visually distinct, legible icons that players identify from silhouette alone. The correct Phaser pattern is `generateTexture()` — draw each icon once in `PreloadScene.create()`, bake it into the Texture Manager under a string key (e.g., `'drop_heart'`), then instantiate each drop as a `scene.add.image()` or `physics.add.image()` sprite that references that key. This eliminates per-frame Graphics overhead and gives proper sprite-level API for tweens, tinting, and alpha.

The `_drawShape()` method and the per-drop Graphics object are completely replaced. Each drop object in `this.drops[]` goes from `{ gfx, label }` to `{ sprite }`. The text label is deleted. Idle animation uses a sinusoidal bob tracked manually in `update()` (via `drop.baseY + amplitude * Math.sin(...)`) rather than a yoyo tween, because the bob must stop cleanly when attract begins. The urgency flicker is driven by a threshold check on `age` in the same `update()` loop using `setAlpha()`. Collect feedback uses a pair of tweens: scale 1→1.5 then fade alpha 1→0, both chained via `onComplete`.

There is one pre-existing crash bug that this phase must fix as a prerequisite: the `magnet` collect handler calls `scene.xpManager.orbGroup.getChildren()` — but `XPManager` stores orbs as a plain array `this.orbs[]`, not a Phaser Group. This crashes on magnet pickup. The correct fix is to iterate `scene.xpManager.orbs` directly and teleport each orb to the player position.

**Primary recommendation:** Replace `_createDrop()` Graphics approach entirely with `generateTexture()` sprites baked in `PreloadScene.create()`. One texture key per drop type. Drop object stores only `{ sprite, baseY, ... }`. All animation and feedback runs through sprite tween API.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 4 | 4.0.0-rc.6 | Game engine — Graphics, generateTexture, tweens, sprites | Already in project — no new installs |

### Supporting

| Capability | API | Purpose | When to Use |
|------------|-----|---------|-------------|
| `Graphics.generateTexture(key, w, h)` | Phaser built-in | Bake drawn shapes into reusable texture | Once at PreloadScene.create() |
| `scene.make.graphics({ add: false })` | Phaser built-in | Create off-screen Graphics for texture generation | During preload, not added to display list |
| `scene.add.image(x, y, key)` | Phaser built-in | Spawn drop sprite from pre-baked texture | Each drop spawn |
| `scene.tweens.add({ ... })` | Phaser built-in | Collect burst animation, fade-out | On collect |
| `sprite.setAlpha()` | Phaser built-in | Urgency flicker + lifetime fade | In update() loop |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| generateTexture + image sprite | Keep live Graphics object per drop | Live Graphics has higher per-frame cost; no sprite-level tween API for setTint/setAlpha directly on draw calls |
| generateTexture + image sprite | RenderTexture | RenderTexture is for runtime compositing; generateTexture is simpler for static icons |
| Manual sinusoidal bob in update() | Yoyo tween on y | Tween cannot be cleanly paused/resumed mid-cycle without fighting tween state; manual Math.sin() gives precise control to stop bob when attracted |

**Installation:** No new packages required. Phaser 4.0.0-rc.6 already in `package.json`.

---

## Architecture Patterns

### Recommended File Structure Change

```
src/systems/GroundDropManager.js    ← modify (replace _drawShape, _createDrop, add bob logic)
src/scenes/PreloadScene.js          ← add generateTexture calls in create()
```

No new files required. Both changes are isolated.

### Pattern 1: generateTexture in PreloadScene.create()

**What:** Each drop type gets its own texture key baked once at game boot.
**When to use:** Any time a static icon needs to become a reusable sprite texture.

```javascript
// In PreloadScene.create() — called AFTER all assets loaded, BEFORE scene transition
_generateDropTextures() {
  const size = 80; // total texture size including backing circle

  const types = {
    heart:       { draw: this._drawHeart.bind(this),      backing: 0x000000 },
    shield:      { draw: this._drawShield.bind(this),     backing: 0x000000 },
    bomb:        { draw: this._drawBomb.bind(this),       backing: 0x000000 },
    magnet:      { draw: this._drawMagnet.bind(this),     backing: 0x000000 },
    boost:       { draw: this._drawBoost.bind(this),      backing: 0x000000 },
    elite_shard: { draw: this._drawEliteShard.bind(this), backing: 0x220033 },
  };

  for (const [type, cfg] of Object.entries(types)) {
    // Off-screen graphics — not added to display list
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });

    // Backing circle (center of 80x80 canvas = 40, 40)
    gfx.fillStyle(cfg.backing, 0.6);
    gfx.fillCircle(40, 40, 40);

    // Icon (all shapes drawn relative to center 40, 40)
    cfg.draw(gfx);

    // Bake into Texture Manager under key 'drop_heart', etc.
    gfx.generateTexture(`drop_${type}`, size, size);
    gfx.destroy();
  }
}
```

**CRITICAL:** `this.make.graphics({ add: false })` — the `add: false` flag prevents the graphics object from appearing in the scene. Call `gfx.destroy()` after `generateTexture()` to free the canvas.

### Pattern 2: Sprite-based Drop Object

**What:** Drop objects store a sprite instead of a graphics object.

```javascript
// In GroundDropManager._createDrop()
_createDrop(x, y, type) {
  const cfg = DROPS[type];
  if (!cfg) return;

  const sprite = this.scene.add.image(x, y, `drop_${type}`);
  sprite.setDepth(8);
  // Scale sprite so icon renders at ~64px on 1080px-wide canvas
  // Texture is 80px; at scale 1.0 it renders 80px. Fine for 1080 wide mobile.
  sprite.setScale(1.0);

  const drop = {
    x,
    y,
    baseY: y,        // anchor for sinusoidal bob
    type,
    color: cfg.color,
    spawnTime: this.scene.time.now,
    sprite,
    collected: false,
    attracting: false,  // true when within ATTRACT_DIST
  };

  this.drops.push(drop);
}
```

No separate label object. No pulsing/spin tween at creation time.

### Pattern 3: Sinusoidal Bob in update() loop

**What:** Drive vertical bob via `Math.sin()` each frame, stop cleanly when attract begins.
**When to use:** Any animation that must be interruptable without fighting tween state.

```javascript
// In GroundDropManager.update()
const BOB_AMPLITUDE = 8;    // px
const BOB_SPEED     = 0.00418; // rad/ms → 1.5s full cycle (2π / 1500ms)

// Inside the drop loop:
if (!drop.attracting) {
  const bobY = drop.baseY + BOB_AMPLITUDE * Math.sin(time * BOB_SPEED + drop.bobPhase);
  drop.sprite.setPosition(drop.x, bobY);
} else {
  // Smooth travel — no bob jitter
  drop.sprite.setPosition(drop.x, drop.y);
}
```

Give each drop a random `drop.bobPhase = this.random() * Math.PI * 2` so not all drops bob in sync.

### Pattern 4: Urgency Flicker via setAlpha in update()

**What:** In the final 3s (age > 7000ms), oscillate alpha at increasing frequency.
**When to use:** Expiry warning without needing a separate tween lifecycle.

```javascript
// In GroundDropManager.update() — inside the drop loop:
const FLICKER_START = 7000; // ms — when to begin urgency flicker
const FLICKER_RATE_BASE = 0.01;  // slow at start

if (age > FLICKER_START && !drop.attracting) {
  // Frequency ramps up as drop nears expiry
  const urgencyT = (age - FLICKER_START) / (LIFETIME - FLICKER_START); // 0→1
  const freq = FLICKER_RATE_BASE + urgencyT * 0.04; // ramps 0.01→0.05 rad/ms
  const flicker = 0.4 + 0.6 * Math.abs(Math.sin(time * freq));
  drop.sprite.setAlpha(flicker);
} else if (age > LIFETIME - FADE_TIME) {
  // Smooth fade in final 2s
  const remaining = LIFETIME - age;
  drop.sprite.setAlpha(remaining / FADE_TIME);
} else {
  drop.sprite.setAlpha(1);
}
```

### Pattern 5: Collect Burst — Scale + White Flash + Fade

**What:** Tween chain: scale up to 1.5x, peak triggers white flash, then fade out over 100ms.

```javascript
// In GroundDropManager._collectDrop() — after game effect applied, before _destroyDrop:
_playCollectBurst(drop) {
  const sprite = drop.sprite;
  if (!sprite) return;

  // Detach from drop array ownership — tween will destroy it when done
  drop.sprite = null;

  this.scene.tweens.killTweensOf(sprite);

  this.scene.tweens.add({
    targets: sprite,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 150,
    ease: 'Back.easeOut',
    onComplete: () => {
      // White flash: tint to white at peak
      sprite.setTint(0xffffff);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 100,
        onComplete: () => sprite.destroy(),
      });
    },
  });
}
```

The bomb collect case skips this entirely — `_collectDrop` calls `_playBombDrama()` and the bomb sprite is destroyed immediately via `_destroyDrop()`.

### Pattern 6: EliteShard Sparkle Particles

**What:** Small Graphics circles drifting outward from the shard while it bobs. Not using Phaser Particles system — consistent with existing project pattern of manual Graphics objects for simple effects.

```javascript
// Spawn 1 sparkle per N frames while drop is idle (not attracting, not collected)
// In update() loop:
drop.sparkleTimer = (drop.sparkleTimer || 0) + delta;
if (drop.sparkleTimer > 300 && !drop.attracting) { // one sparkle per 300ms
  drop.sparkleTimer = 0;
  const p = this.scene.add.graphics().setDepth(9);
  const angle = this.random() * Math.PI * 2;
  const dist = 20 + this.random() * 20;
  const tx = drop.x + Math.cos(angle) * dist;
  const ty = drop.sprite.y + Math.sin(angle) * dist;
  const color = this.random() > 0.5 ? 0xAA44FF : 0xFFCC00;
  p.fillStyle(color, 0.9);
  p.fillCircle(drop.x, drop.sprite.y, 3);
  this.scene.tweens.add({
    targets: p,
    x: tx,
    y: ty,
    alpha: 0,
    scaleX: 0.3,
    scaleY: 0.3,
    duration: 500 + this.random() * 300,
    ease: 'Quad.easeOut',
    onComplete: () => p.destroy(),
  });
}
```

### Anti-Patterns to Avoid

- **Spinning tween on icon sprites**: The current code adds a `360° angle` spin tween to each drop. The CONTEXT.md specifies bold readable icons with bob only — no spin. Remove the spin tween entirely.
- **Pulsing scale tween on drop creation**: Current code pulses scale 1→1.2 yoyo. Remove — the bob is the idle animation; pulsing causes visual noise.
- **`this.make.graphics()` without `add: false`**: Omitting `add: false` adds the off-screen graphics object to the scene display list, causing a blank object in the render tree. Always pass `{ add: false }` when generating textures.
- **Not destroying the temp graphics after generateTexture**: The graphics canvas stays allocated in memory. Call `.destroy()` on it immediately after `.generateTexture()`.
- **Tweening a Graphics object's `.y`**: Graphics objects do not have proper origin/anchor support for y tweens the way Image sprites do. The switch to sprites is essential for clean tween behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering | Custom canvas 2D API draw calls | Phaser Graphics API + generateTexture | Graphics API handles antialiasing, path fills, and WebGL texture upload |
| Collect feedback timing | Manual setTimeout chains | `scene.tweens.add({ onComplete })` chain | Tween chain respects `timeScale` (for slow-mo bomb drama) and auto-cleans up |
| Sprite lifecycle on collect | Manual destroy in collect handler | `onComplete: () => sprite.destroy()` in fade tween | Ensures sprite lives until animation completes; avoids null-ref if collect called twice |

**Key insight:** The project already uses `scene.tweens.add()` for all animation including bomb drama particles. Collect feedback should use the same pattern — not a separate timer.

---

## Common Pitfalls

### Pitfall 1: MAG Crash — orbGroup does not exist
**What goes wrong:** Collecting the Magnet drop crashes the game with `TypeError: scene.xpManager.orbGroup.getChildren is not a function`.
**Why it happens:** `GroundDropManager._collectDrop` case `'magnet'` calls `scene.xpManager.orbGroup.getChildren()` — but `XPManager` uses a plain array `this.orbs`, not a Phaser Physics Group. `orbGroup` is undefined.
**How to avoid:** In the magnet collect case, iterate `scene.xpManager.orbs` array directly:
```javascript
case 'magnet': {
  if (scene.xpManager) {
    scene.xpManager.orbs.forEach(orb => {
      orb.x = px;
      orb.y = py;
      orb.vx = 0;
      orb.vy = 0;
    });
  }
  break;  // no floating text per CONTEXT.md
}
```
**Warning signs:** Any test that triggers a magnet pickup will crash. Fix this in Wave 1 Task 1 as a prerequisite before any other changes.

### Pitfall 2: generateTexture Origin Mismatch
**What goes wrong:** The texture is 80×80 but the icon appears off-center or clipped.
**Why it happens:** `generateTexture` captures a canvas snapshot starting at (0,0). If shapes are drawn relative to the center of the Graphics object's local space (0,0) rather than relative to canvas top-left (40,40), they will be drawn partially out of frame.
**How to avoid:** When using `this.make.graphics({ x: 0, y: 0, add: false })`, draw all shapes with coordinates relative to (40, 40) for an 80px texture — i.e., the backing circle at `fillCircle(40, 40, 40)` and icon shapes offset by +40 in both axes.
**Warning signs:** Icon appears as a solid circle with nothing inside, or icon is partially cut off at an edge.

### Pitfall 3: Bob and Attract Race Condition
**What goes wrong:** When a drop enters attract radius, the bob animation continues fighting the attraction movement — the sprite jitters.
**Why it happens:** The update loop sets `drop.y` toward player AND then applies bob offset using `drop.baseY`. If `drop.baseY` is not updated when attract starts, the bob offset based on stale `baseY` creates a displacement.
**How to avoid:** Set `drop.attracting = true` when distance < ATTRACT_DIST. In sprite position code, branch: if attracting, set position to `(drop.x, drop.y)` directly with no bob offset applied.
**Warning signs:** Drop vibrates or "snaps" when crossing the attract boundary.

### Pitfall 4: Tween Conflict on Collect During Bob
**What goes wrong:** The scale burst tween conflicts with an in-progress yoyo tween started at spawn time.
**Why it happens:** If there were still a scale-based yoyo tween running on the sprite, the collect scale burst tween would fight it.
**How to avoid:** This phase removes the spawn-time pulsing tween entirely. The collect burst is the only scale tween. Call `scene.tweens.killTweensOf(sprite)` before starting the collect burst as a safety net.
**Warning signs:** Sprite jumps to wrong scale on collect.

### Pitfall 5: Floating Text Still Appears
**What goes wrong:** Floating text ("+HP", "+SHIELD") still appears on collect.
**Why it happens:** CONTEXT.md explicitly removes all floating text on collect — icon flash is the feedback. The existing `_collectDrop` calls `scene.showFloatingText()` for every type.
**How to avoid:** Delete all `scene.showFloatingText()` calls inside `_collectDrop`. The bomb BOOM! text in `_playBombDrama()` is NOT floating text — it stays.
**Warning signs:** Text floats up from drop location after collect.

### Pitfall 6: generateTexture Not Available in `preload()`
**What goes wrong:** Calling `generateTexture()` in `preload()` produces an empty/black texture or fails silently.
**Why it happens:** During `preload()`, the renderer may not be fully initialized. `generateTexture()` must be called in `create()`.
**How to avoid:** Put `_generateDropTextures()` at the start of `PreloadScene.create()`, before `this.scene.start('Menu')`.
**Warning signs:** Drop sprites appear as white or black squares.

---

## Code Examples

### Heart Shape (Graphics API, 80px canvas, icon at center 40,40)

```javascript
// Source: Phaser 4 Graphics API — hand-drawn heart using cubic bezier
_drawHeart(gfx) {
  // Heart drawn at center (40, 40), fits within 64px core
  const cx = 40, cy = 44;
  const size = 26;
  gfx.fillStyle(0xFF2244, 1);
  gfx.beginPath();
  // Two top humps via moveTo + bezier, bottom point
  gfx.moveTo(cx, cy + size * 0.35);
  gfx.lineTo(cx - size * 0.95, cy - size * 0.2);
  // Left arc hump
  // Phaser Graphics uses lineTo for polygon approximation — use multi-point polygon
  // Approximate heart: 12-point polygon for chunky solid shape
  const pts = heartPoints(cx, cy, size);
  gfx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
  gfx.closePath();
  gfx.fillPath();
}

function heartPoints(cx, cy, r) {
  // 16-point polygon approximation of heart silhouette
  return [
    { x: cx,       y: cy + r * 0.9 },   // bottom tip
    { x: cx - r * 0.55, y: cy + r * 0.35 },
    { x: cx - r * 0.95, y: cy },
    { x: cx - r * 0.95, y: cy - r * 0.3 },
    { x: cx - r * 0.7,  y: cy - r * 0.6 },
    { x: cx - r * 0.35, y: cy - r * 0.7 },
    { x: cx,            y: cy - r * 0.45 }, // center top dip
    { x: cx + r * 0.35, y: cy - r * 0.7 },
    { x: cx + r * 0.7,  y: cy - r * 0.6 },
    { x: cx + r * 0.95, y: cy - r * 0.3 },
    { x: cx + r * 0.95, y: cy },
    { x: cx + r * 0.55, y: cy + r * 0.35 },
  ];
}
```

### Shield Shape (chevron/kite silhouette)

```javascript
_drawShield(gfx) {
  const cx = 40, cy = 40;
  gfx.fillStyle(0x4488FF, 1);
  gfx.beginPath();
  // Pentagon/kite: wide top, tapered bottom point
  gfx.moveTo(cx, cy + 30);           // bottom tip
  gfx.lineTo(cx - 24, cy + 4);
  gfx.lineTo(cx - 26, cy - 14);
  gfx.lineTo(cx, cy - 22);           // top center notch (flat top)
  gfx.lineTo(cx + 26, cy - 14);
  gfx.lineTo(cx + 24, cy + 4);
  gfx.closePath();
  gfx.fillPath();
}
```

### Bomb Shape (black circle + fuse stub + orange tip)

```javascript
_drawBomb(gfx) {
  const cx = 40, cy = 44;
  // Main body — black circle
  gfx.fillStyle(0x111111, 1);
  gfx.fillCircle(cx, cy, 22);
  // White highlight spot
  gfx.fillStyle(0xffffff, 0.5);
  gfx.fillCircle(cx - 8, cy - 8, 6);
  // Fuse — thick line upward
  gfx.lineStyle(4, 0x886633, 1);
  gfx.beginPath();
  gfx.moveTo(cx, cy - 22);
  gfx.lineTo(cx + 8, cy - 32);
  gfx.strokePath();
  // Orange lit tip
  gfx.fillStyle(0xFF6600, 1);
  gfx.fillCircle(cx + 8, cy - 33, 4);
  gfx.fillStyle(0xFFDD00, 0.8);
  gfx.fillCircle(cx + 8, cy - 33, 2);
}
```

### Magnet Shape (U-shape horseshoe)

```javascript
_drawMagnet(gfx) {
  const cx = 40, cy = 42;
  const armW = 10, armH = 20, gapW = 16, curveR = 13;
  // Two vertical arms
  gfx.fillStyle(0x00DDCC, 1);
  // Left arm
  gfx.fillRect(cx - gapW - armW, cy - armH, armW, armH + 8);
  // Right arm
  gfx.fillRect(cx + gapW, cy - armH, armW, armH + 8);
  // Arc connecting top (polygon approximation of semicircle)
  gfx.beginPath();
  const arcSteps = 12;
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI - (i / arcSteps) * Math.PI; // π → 0
    const px = cx + (curveR + armW / 2) * Math.cos(a);
    const py = cy - armH + curveR * Math.sin(a) * -1;
    if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
  }
  // Close the arc path as filled region (outer + inner arc)
  gfx.strokePath(); // or fill as rect approximation
  // Simpler: just fill the rounded top as a rect + circle
  gfx.fillRect(cx - gapW - armW, cy - armH - curveR * 2, gapW * 2 + armW * 2, curveR * 2);
  gfx.fillCircle(cx, cy - armH, gapW + armW);
  // Red pole tips on arms
  gfx.fillStyle(0xFF2222, 1);
  gfx.fillRect(cx - gapW - armW, cy - 4, armW, 12);
  gfx.fillStyle(0x2222FF, 1);
  gfx.fillRect(cx + gapW, cy - 4, armW, 12);
}
```

### Boost Shape (double-chevron >>)

```javascript
_drawBoost(gfx) {
  const cx = 40, cy = 40;
  gfx.fillStyle(0xFFCC00, 1);
  // First chevron (left)
  gfx.beginPath();
  gfx.moveTo(cx - 16, cy - 24);
  gfx.lineTo(cx - 4,  cy);
  gfx.lineTo(cx - 16, cy + 24);
  gfx.lineTo(cx - 8,  cy + 24);
  gfx.lineTo(cx + 4,  cy);
  gfx.lineTo(cx - 8,  cy - 24);
  gfx.closePath();
  gfx.fillPath();
  // Second chevron (right)
  gfx.beginPath();
  gfx.moveTo(cx + 2, cy - 24);
  gfx.lineTo(cx + 14, cy);
  gfx.lineTo(cx + 2,  cy + 24);
  gfx.lineTo(cx + 10, cy + 24);
  gfx.lineTo(cx + 22, cy);
  gfx.lineTo(cx + 10, cy - 24);
  gfx.closePath();
  gfx.fillPath();
}
```

### EliteShard Shape (faceted crystal/gem)

```javascript
_drawEliteShard(gfx) {
  const cx = 40, cy = 40;
  // Purple gem body
  gfx.fillStyle(0xAA44FF, 1);
  gfx.beginPath();
  gfx.moveTo(cx, cy - 28);       // top point
  gfx.lineTo(cx + 16, cy - 8);
  gfx.lineTo(cx + 18, cy + 8);
  gfx.lineTo(cx, cy + 28);       // bottom point
  gfx.lineTo(cx - 18, cy + 8);
  gfx.lineTo(cx - 16, cy - 8);
  gfx.closePath();
  gfx.fillPath();
  // Gold inner facet
  gfx.fillStyle(0xFFCC00, 0.6);
  gfx.beginPath();
  gfx.moveTo(cx, cy - 14);
  gfx.lineTo(cx + 8, cy);
  gfx.lineTo(cx, cy + 10);
  gfx.lineTo(cx - 8, cy);
  gfx.closePath();
  gfx.fillPath();
}
```

### Collect Burst + Destroy Pattern

```javascript
// Source: project pattern established in GroundDropManager._playBombDrama()
_playCollectBurst(sprite) {
  if (!sprite) return;
  this.scene.tweens.killTweensOf(sprite);
  this.scene.tweens.add({
    targets: sprite,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 150,
    ease: 'Back.easeOut',
    onComplete: () => {
      sprite.setTint(0xffffff);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 100,
        onComplete: () => sprite.destroy(),
      });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Live Graphics per drop + Text label | generateTexture sprites + icon shapes | This phase | Eliminates per-frame Graphics draw calls for drops; enables sprite tween API |
| Pulsing scale yoyo + spin tween | Sinusoidal bob in update() | This phase | Bob pauses cleanly on attract; no tween lifecycle fights |
| Floating text on collect (+HP, +SHIELD) | Icon scale burst + white flash | This phase | Simpler, faster feedback; removes text-reading requirement |

**Deprecated in this phase:**
- `_drawShape()` method — replaced by per-type draw functions in PreloadScene
- `drop.label` (Text object) — no longer created
- Spin tween and scale-yoyo tween at drop creation — removed

---

## Open Questions

1. **Heart polygon approximation fidelity**
   - What we know: 12-16 point polygon approximation of heart reads clearly at 64px on desktop
   - What's unclear: At actual mobile pixel density (375px physical / 1080 logical), silhouette may look blocky
   - Recommendation: Implement 16-point polygon; verify visually in browser at actual mobile scale (Chrome DevTools device mode, iPhone 12 Pro = 390px width)

2. **setTint(0xffffff) as "white flash" on collect**
   - What we know: `sprite.setTint(0xffffff)` in Phaser 4 multiplies all color channels by 1 — effectively no change from the icon's own colors
   - What's unclear: Whether `setTint(0xffffff)` actually achieves a white flash or if a dedicated white overlay sprite is needed
   - Recommendation: Use `sprite.setTint(0xFFFFFF)` combined with the alpha fade — if not visually distinct enough, add a small white `fillCircle` Graphics flash at the sprite position (matches the project's existing flash pattern from bomb drama and shield break)

3. **EliteShard sparkle performance**
   - What we know: Boss drops multiple ground drops simultaneously; if all are elite shards (unlikely but possible in future), sparkle Graphics objects multiply
   - What's unclear: Whether 1 sparkle per 300ms per shard causes noticeable GC pressure
   - Recommendation: Cap sparkle emitter at 4 active sparkle Graphics per shard at any time; the current pattern of 1 per 300ms should be fine for normal gameplay

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — project has no test framework |
| Config file | none — Wave 0 gap |
| Quick run command | `npm run dev` (manual visual verification in browser) |
| Full suite command | `npm run build` (verifies no compile errors) |
| Estimated runtime | ~3s (build) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VISC-02 | Six drop types render distinct icon sprites (no text labels) | manual-only | `npm run build && npm run preview` — visually verify in browser | ❌ Wave 0 gap |
| VISC-02 | Collect feedback shows scale burst + flash (no floating text) | manual-only | trigger drop pickup in dev mode via I=god + proximity | ❌ Wave 0 gap |
| VISC-02 | Magnet drop collects without crash | manual-only | collect a MAG drop in browser; verify no console error | ❌ Wave 0 gap |

**Justification for manual-only:** Phaser 4 game objects require a running browser canvas to render. The game has no test framework and no headless rendering setup (Puppeteer is installed as a devDependency but no test scripts exist). All VISC-02 behaviors are visual/interactive and cannot be verified via unit tests without significant test infrastructure investment beyond this phase's scope.

### Nyquist Sampling Rate

- **Minimum sample interval:** After every committed task → run: `npm run build` (verify no compile errors)
- **Full suite trigger:** Before closing the phase → open `npm run preview` and visually verify all 6 drop types render and collect correctly
- **Phase-complete gate:** Manual visual check in browser — all 6 icon types visible, no text labels, collect burst fires, magnet pickup does not crash
- **Estimated feedback latency per task:** ~3s (build) + ~30s (manual visual check)

### Wave 0 Gaps (must be created before implementation)

- [ ] No test framework installation needed — build + manual verification is the validation strategy for this phase
- [ ] Checklist for manual QA (included in PLAN.md verification steps):
  - [ ] Heart drop: red heart silhouette, no text
  - [ ] Shield drop: blue shield silhouette, no text
  - [ ] Bomb drop: black bomb + fuse, no text
  - [ ] Magnet drop: cyan U-shape, no text, pickup does not crash
  - [ ] Boost drop: yellow double-chevron, no text
  - [ ] EliteShard drop: purple gem + sparkles, no text
  - [ ] All drops bob vertically, stop bobbing when attracted
  - [ ] Flicker visible in final 3 seconds
  - [ ] Collect burst: scale up → white flash → fade (all except Bomb)
  - [ ] No floating text on any collect

---

## Sources

### Primary (HIGH confidence)
- Phaser 4 rc6 official docs — https://docs.phaser.io/api-documentation/class/gameobjects-graphics — generateTexture signature and Canvas API caveat
- Project source: `src/systems/GroundDropManager.js` — existing drop architecture, MAG crash confirmed
- Project source: `src/systems/XPManager.js` — confirmed `this.orbs[]` array (not physics group); orbGroup does not exist
- Project source: `src/scenes/PreloadScene.js` — confirmed generateTexture not yet used; create() is the correct hook
- Project source: `package.json` — Phaser `^4.0.0-rc.6`, no test framework

### Secondary (MEDIUM confidence)
- Phaser 4 examples — https://phaser.io/examples/v3.85.0/game-objects/graphics/view/generate-texture-to-sprite — `this.make.graphics({ add: false })` pattern with generateTexture confirmed
- Phaser 4 RC6 release notes — https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out — no breaking changes to Graphics or generateTexture in RC6

### Tertiary (LOW confidence)
- Icon shape geometry (heart polygon, shield kite, boost chevron) — derived from Phaser Graphics API capability; exact coordinate values need visual validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phaser generateTexture is the canonical sprite-from-graphics approach; verified in official docs and examples
- Architecture: HIGH — Direct reading of existing GroundDropManager.js; changes are well-understood replacements (Graphics→Image, Text→none, tweens→update() Math.sin)
- MAG crash: HIGH — Bug confirmed by reading both XPManager.js and GroundDropManager.js; `orbGroup` does not exist on XPManager
- Icon geometry: MEDIUM — Phaser Graphics path API is known; exact polygon coordinates for heart/shield/magnet shapes need visual iteration
- Pitfalls: HIGH — Derived from reading actual project source and established Phaser patterns

**Research date:** 2026-02-27
**Valid until:** 2026-04-27 (Phaser 4 RC6 is production-stable; no churn expected in Graphics API)
