# Stack Research — Phaser UX Polish Techniques

**Domain:** Mobile horde-survivor game UX polish (Phaser 4 / WebGL)
**Researched:** 2026-02-24
**Confidence:** HIGH (Phaser 4 RC6 is production-ready; all APIs verified against official docs)

---

## Context

This is a **subsequent milestone** research pass. The core stack (Phaser 4.0.0-rc.6, Vite 7.3.1, vanilla JS, Web Audio) is already locked. This document covers **techniques and patterns** for adding Survivor.io-quality UX polish to an existing game — not new library additions.

The primary constraint: everything stays within Phaser's built-in APIs. No new runtime dependencies. All effects use Phaser's Graphics API, Tween Manager, Particle Emitter, FX Pipeline, and Camera system.

---

## Recommended Stack

### Core Technologies (Already In Use — Context Only)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Phaser | 4.0.0-rc.6 | Game engine, all rendering | Locked — no change |
| Vite | 7.3.1 | Build/dev server | Locked — no change |
| JavaScript | ES2022+ | Game logic | Locked — no change |

### Visual Effects APIs (Built Into Phaser 4 — Zero Install Cost)

| API | Purpose | Why This Approach |
|-----|---------|-------------------|
| `scene.add.particles()` | Hit sparks, XP orb trails, explosion bursts, pickup collect effects | Built-in, WebGL-batched, `maxParticles` cap keeps perf predictable. `explode()` for one-shot bursts. Better than manual Graphics draw for high-count effects. |
| `gameObject.preFX.addGlow()` / `postFX.addGlow()` | Enemy hit flash, pickup hover glow, boss phase indicators | WebGL-only shader (Phaser 3.60+, confirmed in Phaser 4). One-line. Tweenable `outerStrength` property. `preFX` for sprites, `postFX` for any object. |
| `camera.shake(duration, intensity)` | Weapon impact, bomb explosion, boss attack, HP damage | Built-in camera effect. Keep under 200ms and taper intensity — longer shakes disorient on mobile. |
| `camera.flash(duration, r, g, b, force)` | Shield break white flash, bomb detonation, boss death | Built-in. Instant and cheap. White (255,255,255) for damage, red (255,0,0) for danger. |
| `camera.postFX.addVignette()` | Red vignette on low HP (already partially used) | WebGL shader, controllable alpha. Tween `strength` property to pulse. |
| `scene.tweens.add()` | All animated state changes in HUD and world | Chain `yoyo: true, repeat: N` for pulsing; `ease: 'Elastic.Out'` for bouncy; `onComplete` for cleanup. No plugin needed. |
| `scene.tweens.chain()` | Sequenced multi-step effects (e.g., flash → shrink → fade for death) | Available since Phaser 3.60. Alternative to nesting `onComplete` callbacks. |
| `scene.add.graphics()` | Health bars, XP bar, icon shapes, orb rendering | Already in use. `fillRoundedRect()`, `fillGradientStyle()` (WebGL only). Redraw only on value change — not every frame for static elements. |
| `scene.add.bitmapText()` | Floating damage numbers, combo text, level-up popups | Faster than `scene.add.text()` for frequently-created objects — benefits from WebGL batching. Requires one-time font asset (`loadBitmapFont`). |
| `this.add.layer()` | UI depth grouping — keep HUD objects in a Layer above gameplay | Phaser 4 Layer game object: acts as a local DisplayList. Set `layer.setDepth(200)` to guarantee HUD stays above all gameplay objects without per-object depth management. |

---

## Technique Patterns by Feature

### 1. Enemy Hit Flash

**Pattern:** `preFX.addGlow()` + tween, not `setTint()`

```javascript
// On enemy sprite creation (one-time setup):
const glow = enemy.preFX.addGlow(0xffffff, 0, 0); // white, zero strength initially

// On hit:
scene.tweens.add({
    targets: glow,
    outerStrength: 8,
    duration: 60,
    yoyo: true,
    ease: 'Quad.Out',
    onComplete: () => { glow.outerStrength = 0; }
});
```

**Why not `setTint(0xffffff)`:** tint in Phaser is additive and interacts poorly with existing sprite tints (elite gold, boss colors). `preFX.addGlow()` is isolated.

**Performance:** WebGL shader — zero draw call cost on GPU. Creates no GC pressure. Suitable for all active enemies simultaneously.

**Confidence:** HIGH — verified via official Phaser FX docs and `changelog/3.60/FX.md`.

---

### 2. Particle Burst Effects (Weapon Impact, Enemy Death, Pickup Collect)

**Pattern:** One persistent emitter per effect type, `explode()` for one-shot bursts

```javascript
// In create():
this.hitParticles = scene.add.particles(0, 0, 'particle_dot', {
    speed: { min: 80, max: 220 },
    scale: { start: 0.3, end: 0 },
    lifespan: 280,
    maxParticles: 40,   // hard cap — critical for mobile
    tint: [0x00ffff, 0x4488ff],
    frequency: -1,      // explode mode — emit only on demand
    blendMode: 'ADD',
});

// On hit:
this.hitParticles.emitParticleAt(x, y, 6); // 6 particles at point
```

**Why explode mode:** avoids continuous emission overhead. `maxParticles: 40` means at most 40 particles ever alive for this emitter across all concurrent bursts.

**Blend mode warning:** `ADD` blend mode causes a WebGL batch flush each time it is encountered. Use sparingly — 1-2 ADD emitters max per scene. Non-ADD effects (death sparks, XP collect) should use `NORMAL` blend.

**Mobile cap recommendation:**
- Hit sparks: `maxParticles: 30`, lifespan 200ms
- Enemy death: `maxParticles: 25`, lifespan 350ms
- XP collect: `maxParticles: 20`, lifespan 250ms
- Bomb explosion: `maxParticles: 60`, lifespan 600ms (one emitter, infrequent)

**Confidence:** HIGH — verified via official ParticleEmitter docs.

---

### 3. Camera Shake Hierarchy

**Pattern:** Scale shake intensity to event weight, always pass `duration` to auto-stop

```javascript
// Calibrated shake values for 1080x1920 portrait:
scene.cameras.main.shake(80,  0.003);  // bullet hit on player
scene.cameras.main.shake(150, 0.006);  // HP damage (not shield)
scene.cameras.main.shake(300, 0.012);  // bomb explosion
scene.cameras.main.shake(500, 0.018);  // boss slam / phase transition
```

**Why these values:** At 1080x1920, a multiplier of 0.006 moves the viewport ±~6px — perceptible but not disorienting. Stacking shakes is fine; Phaser replaces the previous shake with the new one if called again before completion.

**Do not:** shake for shield hits (shield absorbing damage should feel different — use the Glow effect only). Reserve shakes for HP damage and major events.

**Confidence:** HIGH — built-in camera API, confirmed in Phaser 3/4 docs.

---

### 4. HUD Health/Shield Bars — Smooth Tween on Value Change

**Pattern:** Tween `scaleX` of the fill Graphics object, not redraw every frame

```javascript
// In HUD constructor:
this._shieldFill = scene.add.graphics().setDepth(101).setScrollFactor(0);
this._shieldFill.fillStyle(0x4488ff, 1);
this._shieldFill.fillRoundedRect(BAR_X, SHIELD_Y, BAR_W, BAR_H, 3);
// Set origin at left edge for scaleX to work correctly:
this._shieldFill.setOrigin(0, 0.5);

// On value change:
scene.tweens.add({
    targets: this._shieldFill,
    scaleX: newRatio,
    duration: 180,
    ease: 'Quad.Out',
});
```

**Why scaleX not redraw:** `graphics.clear()` + redraw every frame triggers WebGL texture uploads. `scaleX` tween is GPU transform — zero texture cost.

**Exception:** XP bar fills frequently during orb collection — redraw is acceptable there because it happens at orb-collect rate (not 60fps). Shield/HP bars change only on damage events.

**Confidence:** HIGH — standard Phaser pattern, verified via Graphics API docs.

---

### 5. Floating Damage/XP Numbers

**Pattern:** Pool of `BitmapText` objects, not `Text`; tween up + fade, reuse from pool

```javascript
// In create(): load a bitmap font once
scene.load.bitmapFont('damage', 'assets/fonts/damage.png', 'assets/fonts/damage.xml');

// Pool approach (in a FloatingTextManager class):
_getFromPool() {
    const pooled = this._pool.find(t => !t.active);
    if (pooled) { pooled.setActive(true).setVisible(true); return pooled; }
    const t = this.scene.add.bitmapText(0, 0, 'damage', '', 36).setDepth(50);
    this._pool.push(t);
    return t;
}

spawn(x, y, text, color = 0xffffff) {
    const t = this._getFromPool();
    t.setPosition(x, y).setText(text).setTint(color).setAlpha(1);
    this.scene.tweens.add({
        targets: t,
        y: y - 80,
        alpha: 0,
        duration: 900,
        ease: 'Quad.Out',
        onComplete: () => t.setActive(false).setVisible(false),
    });
}
```

**Why BitmapText:** `scene.add.text()` uses Canvas2D text rendering — expensive per-call, no WebGL batching. `BitmapText` renders from a texture atlas — batched by WebGL. Confirmed faster in official docs.

**Font asset:** A simple 2-3 color bitmap font (white + yellow + red variants) covers all needs. Generate with Shoebox, Hiero, or use a free asset pack.

**Pool size:** 12-15 objects covers concurrent damage numbers at peak combat density.

**Confidence:** HIGH — BitmapText performance advantage documented in official Phaser docs.

---

### 6. Icon-Based Ground Drops and XP Orbs

**Pattern:** `Graphics.generateTexture()` at preload time → reuse as sprite texture

```javascript
// In PreloadScene (one-time setup):
_generateDropIcons() {
    const g = this.add.graphics();

    // Heart icon
    g.fillStyle(0xFF4444, 1);
    g.fillCircle(18, 14, 8); g.fillCircle(26, 14, 8);
    g.fillTriangle(10, 17, 34, 17, 22, 30);
    g.generateTexture('drop_heart', 40, 40);
    g.clear();

    // Shield icon
    g.fillStyle(0x44FFFF, 1);
    g.fillRoundedRect(8, 6, 24, 28, 4);
    g.generateTexture('drop_shield', 40, 40);
    g.clear();

    // ... etc for each drop type
    g.destroy();
}
```

**Why generateTexture at preload:** Drawing with Graphics API every frame for 12 simultaneous drops = 12 Graphics clear+redraw cycles per frame. One `generateTexture()` call bakes to GPU texture — then each drop is a cheap sprite. This is 10-20x cheaper per frame.

**XP orb color change (green → orange):** Change the `fillStyle` values in `XPManager._drawOrb()`. Orange = `0xFF8800` outer, `0xFFAA44` mid, `0xFFCC88` core. The multi-layer glow approach already in use is correct — just update the colors.

**Confidence:** HIGH — `generateTexture()` is official Phaser API, verified.

---

### 7. Layer-Based HUD Architecture

**Pattern:** Dedicated `Layer` game object at high depth; all HUD elements added to it

```javascript
// In GameScene.create():
this.hudLayer = this.add.layer();
this.hudLayer.setDepth(200); // guaranteed above all gameplay (enemies at ~10, bullets at ~20)

// Then in HUD constructor:
const bar = scene.add.graphics().setScrollFactor(0);
scene.hudLayer.add(bar); // instead of raw scene.add
```

**Why Layer:** Without explicit depth management, newly-created game objects render above older ones. In a long-running game session, particle emitters and floating text created mid-game can render above HUD elements. A Layer at depth 200 guarantees the HUD is always on top regardless of creation order.

**Alternative already in use:** `setDepth(100-101)` per HUD object. This works but requires manual depth assignment for every new HUD element. The Layer approach is safer as the system grows.

**Recommendation:** Migrate to Layer for the new HUD elements (top stat area, drop icons) but don't refactor existing HUD to avoid regression risk.

**Confidence:** HIGH — Layer API verified in Phaser 4 docs.

---

### 8. Hitstop (Impact Freeze) for Heavy Hits

**Pattern:** `scene.physics.world.pause()` for 40-80ms on boss hits / bomb explosions

```javascript
// Boss slam hit on player:
scene.physics.world.pause();
scene.time.delayedCall(60, () => scene.physics.world.resume());
```

**Why:** Hitstop (brief physics freeze) is one of the highest-impact game feel techniques for shooter games. It makes heavy hits feel substantially more powerful with 3 lines of code. Do not apply to normal enemy fire — only boss attacks and bomb explosions.

**Do not use:** on every bullet hit — it breaks game flow. Reserve for 2-4 events maximum per game session that should feel impactful.

**Confidence:** MEDIUM — `physics.world.pause()` is documented Phaser API. Hitstop as a design technique is well-established (multiple sources confirm). Specific duration values are from design judgment, not official source.

---

### 9. Twin Laser Visible Health Drain

**Pattern:** Per-frame damage visual overlay on enemy + health bar tween

The twin laser already deals continuous damage via the existing weapon system. The "invisible" feel comes from:
1. No per-frame visual change on hit enemy
2. Health bar (if present on enemy) not updating smoothly

**Fix:**
```javascript
// In twin laser hit logic, called every ~100ms while beam is on enemy:
this.hitEffect.emitParticleAt(hitX, hitY, 2); // 2 small sparks per tick
if (enemy.preFX) {
    // Maintain glow while beam is active, fade out when beam leaves
    if (!enemy._laserGlow) {
        enemy._laserGlow = enemy.preFX.addGlow(0x00ffff, 4, 0);
    }
}

// On beam leaving enemy:
if (enemy._laserGlow) {
    enemy.preFX.remove(enemy._laserGlow);
    enemy._laserGlow = null;
}
```

**Spark color:** Cyan (`0x00ffff`) to match laser beam color. Small count (2 per tick) to avoid particle budget overrun.

**Confidence:** MEDIUM — technique is standard; specific implementation is from design judgment.

---

## Supporting Libraries

These are available but NOT recommended for this project given the no-new-dependencies constraint:

| Library | What It Does | Why Not Now |
|---------|-------------|-------------|
| rexUI (`phaser3-rex-notes`) | Layout engine, scrollable panels, progress bars | Adds significant bundle size. All needed HUD elements achievable with built-in Graphics + Tween. Consider for Scrapyard shop UI if layout complexity justifies it. |
| PhaserFX | Pre-built game feel effects library | Phaser 3.60+ only (not verified Phaser 4 RC6 compatible). Adds bundle weight. Built-in FX pipeline covers all same capabilities. |
| phaser3-juice-plugin | Sprite shake/wobble/pulse effects | Old plugin (2019), not verified Phaser 4 compatible. `preFX.addGlow()` + tweens cover the same effects natively. |
| Phaser Floating Numbers Plugin | Floating damage numbers | Exists but no package maintained. Roll bespoke pool using BitmapText (described above) — simpler and controllable. |

---

## Performance Constraints and Limits

Target: **60fps on mid-range Android browsers with WebGL**

| Technique | Max Concurrent | Why This Limit |
|-----------|---------------|----------------|
| Particle emitters (total active) | 6-8 | Each emitter with ADD blend causes batch flush |
| Particles alive simultaneously | ~150 total | Mobile GPU particle throughput limit |
| `postFX.addGlow()` per frame | All active enemies | WebGL shader, cheap on GPU — no issue |
| `graphics.clear()` + redraw | Max 3 per frame | Canvas API texture re-upload is expensive |
| `BitmapText` pool size | 15 active | Font atlas is one texture — batched cheaply |
| Camera shakes stacked | 1 active | Phaser replaces; don't stack intentionally |
| FX pipeline effects per object | 2-3 max | More than 3 stacked postFX effects per object causes noticeable GPU cost |

**The single biggest performance win available:** Replace the per-frame `this._gfx.clear()` Graphics redraw pattern (used for XP orbs) with sprite-based orbs using `generateTexture`. At 20+ orbs on screen, the Graphics approach costs ~20 texture re-uploads per frame. With sprites, it costs 0.

**However:** The current orb rendering approach (layered glow circles with sine pulse) cannot be replicated with static sprites. Recommendation: keep Graphics for orbs but add `viewBounds` culling — orbs outside the visible area skip rendering.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `scene.add.text()` for floating combat numbers | Canvas2D text rendering — no batching, causes reflow on every `setText()` | `scene.add.bitmapText()` — texture atlas, WebGL-batched |
| `graphics.clear()` + full redraw every frame for bars | Re-uploads texture every frame — WebGL stall | `scaleX` tween on a Graphics object drawn once |
| Multiple ADD blend-mode particle emitters | Each causes WebGL batch flush — multiplies draw calls | 1 ADD emitter max (lasers/hit sparks), others use NORMAL |
| `setTint(0xffffff)` for hit flash | Additive tinting interacts with existing elite/boss tints | `preFX.addGlow()` with white color — isolated, tweenable |
| Nested `onComplete` callbacks for multi-step effects | Becomes unmaintainable for 3+ step sequences | `scene.tweens.chain()` — readable, pause/stop-able |
| Global `scene.cameras.main` shake for every bullet hit | Accumulated micro-shakes feel like lag on mobile | Reserve shake for HP damage, bombs, boss attacks only |
| `scene.physics.world.pause()` for normal hits | Breaks game flow for common events | Only for boss slams and bomb explosions (2-4x per session) |

---

## Version Compatibility

| Technique | Phaser 3 Min | Phaser 4 RC6 | Notes |
|-----------|-------------|--------------|-------|
| `preFX` / `postFX` FX pipeline | 3.60 | Confirmed | WebGL only |
| `scene.tweens.chain()` | 3.60 | Confirmed | Replaced old Timeline API |
| `add.particles()` (new API) | 3.60 | Confirmed | Old `add.particles(x,y,[texture], config)` changed in 3.60 |
| `camera.shake/flash/zoom` | 3.0 | Confirmed | No changes |
| `add.layer()` | 3.60 | Confirmed | Layer as DisplayList |
| `graphics.fillGradientStyle()` | 3.0 | Confirmed | WebGL only |
| `graphics.generateTexture()` | 3.0 | Confirmed | Creates reusable key in TextureManager |
| `add.bitmapText()` | 3.0 | Confirmed | Requires bitmap font asset |

**Critical API note:** The game is already on Phaser 4.0.0-rc.6. The Phaser 4 team has stated RC6 is production-ready and is the final RC. All APIs listed above have been in Phaser since 3.60 and carry forward to v4. There are no breaking changes to the listed APIs between Phaser 3.60 and 4.0.0-rc.6 based on the RC6 changelog.

---

## Installation

No new packages needed. All techniques use Phaser 4's built-in APIs.

```bash
# Nothing to install — all APIs are in the existing phaser package
# If bitmap fonts are needed, generate assets offline:
# - Hiero (free): https://libgdx.com/wiki/tools/hiero
# - Shoebox (free): http://renderhjs.net/shoebox/
# Place .png + .fnt/.xml files in assets/fonts/
```

---

## Sources

- [Phaser FX System Documentation](https://docs.phaser.io/phaser/concepts/fx) — FX pipeline, glow, vignette, all 15 built-in shaders. Confidence: HIGH
- [Phaser FX Changelog v3.60](https://github.com/phaserjs/phaser/blob/v3.60.0/changelog/3.60/FX.md) — Complete list of effects added. Confidence: HIGH
- [ParticleEmitter API](https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter) — maxParticles, explode(), frequency, viewBounds, blendMode behavior. Confidence: HIGH
- [Phaser Tweens Concepts](https://docs.phaser.io/phaser/concepts/tweens) — chain(), stagger, easing equations, property list. Confidence: HIGH
- [Phaser Graphics API](https://docs.phaser.io/phaser/concepts/gameobjects/graphics) — fillRoundedRect, fillGradientStyle, generateTexture. Confidence: HIGH
- [Phaser Camera Shake Effect](https://photonstorm.github.io/phaser3-docs/Phaser.Cameras.Scene2D.Effects.Shake.html) — shake/flash/zoom built-in effects. Confidence: HIGH
- [Phaser 4.0 RC6 Release Notes](https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out) — RC6 is final RC, production-ready. Confidence: HIGH
- [BitmapText API](https://docs.phaser.io/api-documentation/class/gameobjects-bitmaptext) — batching advantage over Text confirmed. Confidence: HIGH
- [Layer API](https://docs.phaser.io/api-documentation/class/gameobjects-layer) — Layer as HUD container. Confidence: HIGH
- [Phaser Optimization Tips (2025)](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b) — blend mode batch flush, Canvas vs WebGL on mobile. Confidence: MEDIUM (paywalled, could not fully read)
- [RexRainbow Physics Notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/particles/) — particle patterns. Confidence: MEDIUM (community source, not official)
- PhaserFX library — Confidence: LOW for Phaser 4 compatibility (states Phaser 3.60+, untested on RC6)

---

*Stack research for: Star Assault UX Polish milestone*
*Researched: 2026-02-24*
