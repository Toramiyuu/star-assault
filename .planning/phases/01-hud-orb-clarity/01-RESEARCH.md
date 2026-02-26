# Phase 1: HUD Foundations + XP Orb Clarity - Research

**Researched:** 2026-02-26
**Domain:** Phaser 4 Graphics API, tween animation, HUD architecture refactoring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Orb Color Palette**
- Base color: neon orange in the 0xFF6600 range — energetic and high-contrast against all six background zones
- Retain the existing 3-layer glow structure (outer glow, mid ring, bright core); recolor all layers to orange
- Keep white center dot — provides depth and "hot light" feel
- Magnet trail switches from green line to orange line to match orbs
- XP level bar fill color updates to orange to match orbs (same XP system, visual consistency)
- Orbs get a subtle idle pulse: outer glow layer opacity fades in/out at ~0.8s period (no scale change — stays within footprint)

**HUD Bar Animation**
- On value change (drop or gain): quick ease-out tween of ~150ms — responsive but readable
- No lag bar — direct tween to new value only
- Dirty-flag approach on rapid hits: if multiple damage events arrive before tween completes, jump to final value (no queued animation debt)
- Same tween duration and easing for shield bar and HP bar (~150ms ease-out)
- Same animation behavior on gain (pickup, upgrade) as on loss — no asymmetry
- Existing pulse effects (low-HP red pulse, shield-recharge blue pulse) are adjusted for feel — see Claude's Discretion

**Color Consistency Reach**
- Upgrade card XP accent: update to orange in this phase (upgrade cards shown during level-up pause should reflect the new orange XP palette)
- Kill streak counter, HUD border/frame, wave announcement text: see Claude's Discretion

### Claude's Discretion
- Existing low-HP red pulse and shield-recharge blue pulse: adjust duration/intensity if they feel off, leave them if they're working. No specific direction — use judgment.
- Kill streak counter accent color: match orange if it reads naturally, leave white/yellow if it doesn't.
- HUD frame/border accent: add a thin orange accent if it unifies the design; skip if it competes with shield/HP bar colors.
- Wave announcement text color: adjust to orange if it looks out of place once orbs are orange; leave as-is if it's fine.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VISC-01 | Player can distinguish XP orbs from nebula backgrounds because orbs are orange/gold (not green) | Color change in XPManager._drawOrb() — 3 fillStyle calls + 1 lineStyle call identified; idle pulse math pattern identified |
| VISC-03 | Bottom stat bar (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) is removed from the gameplay HUD | StatBar class identified with 3 touch points in GameScene.js: import, construction (line 87), update call (line 462); streakText must be migrated or dropped |
</phase_requirements>

---

## Summary

Phase 1 is a pure visual refactoring — no new systems, no new data, no new game logic. It touches three files substantively (XPManager.js, HUD.js, StatBar.js/GameScene.js) and one file lightly (UpgradeCardUI.js). The entire codebase already uses Phaser 4's `scene.tweens.add()` pattern extensively and uses `Phaser.Display.Color` utilities, so there is no new API surface to learn.

The XP orb color change is straightforward: `XPManager._drawOrb()` has exactly 4 color references (3 `fillStyle` calls with `0x00ff88`, 1 `lineStyle` with `0x00ff88` for the magnet trail in `update()`). The idle pulse is already partially implemented — the `Math.sin(time * 0.006)` pulse already modulates the outer glow alpha. Switching to a slower 0.8s period means changing the multiplier from `0.006` (about 1.0s period at 60fps) to approximately `0.0079` (0.8s period). Additionally, the mid ring currently uses the same pulse multiplier — the CONTEXT.md locks the outer glow for the breathe effect, so the mid ring can pulse slightly too (they share the same math today).

The HUD bar animation requires architectural change: currently `HUD.update()` calls `shieldBarFill.clear()` and redraws from scratch every frame. The plan calls for a dirty-flag guard so the Graphics only clears/redraws when the ratio changes, plus a `scaleX` tween on the fill Graphics object when a change is detected. The key insight is that `scaleX` tweening on a Phaser Graphics object works (confirmed by existing usage in `AAXBossEffects.js` and `AAXBossHornMode.js`), but requires setting the Graphics pivot point correctly since Graphics draws from its local origin. The current bar draws at an absolute screen position, not at the object's origin — this means a `scaleX` tween on the Graphics object itself would scale from the wrong anchor. The correct pattern is either (a) use a Rectangle game object instead of Graphics for the fill (which has natural pivot support), or (b) keep Graphics but use `setX`/`setOrigin` so the pivot is at the left edge of the bar. Option (b) fits the existing code pattern better.

The StatBar removal has a critical coupling to investigate: `StatBar.streakText` (the kill streak counter displayed top-right) is embedded inside the StatBar class. When StatBar is removed, the streak counter must either be moved to the HUD class or dropped. Given CONTEXT.md puts this at Claude's discretion, the research recommendation is to migrate the streak counter to HUD.js (it's simple `scene.add.text` logic) and then delete StatBar.js entirely.

**Primary recommendation:** Implement in two discrete plan files — Plan 01-01 (orb color + idle pulse + color consistency) and Plan 01-02 (stat bar removal + streak counter migration + HUD fill bar dirty-flag tween) — exactly as the phase already defines.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 4.0.0-rc.6 | Game framework — Graphics, Tweens, Scene | Already installed and in use throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Phaser.Tweens | (built-in) | Animate numeric properties on Game Objects | All animation in this phase uses tweens.add() |
| Phaser.Display.Color | (built-in) | Color math utilities | UpgradeCardUI already uses HexStringToColor |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Graphics.clear()+redraw | Rectangle GameObject for fill bar | Rectangle has built-in pivot, easier scaleX tween; Graphics keeps existing visual code |
| Graphics scaleX pivot fix | CropImage/Mask on a Rectangle | More complex setup; no benefit over pivot fix |

**Installation:** No new packages required. All tooling is existing Phaser 4 + Vite.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── systems/
│   ├── XPManager.js         # _drawOrb() + magnet trail — color change here
│   └── HUD.js               # fill bar tweening + streak counter new home
└── ui/
    ├── StatBar.js            # DELETE after migration
    └── UpgradeCardUI.js      # statText color accent only (#00FF88 -> #FF8800)
```

### Pattern 1: Orb Color Swap + Pulse Period Tuning
**What:** Replace all `0x00ff88` references in XPManager with orange equivalents. Tune pulse multiplier.
**When to use:** Any Graphics-drawn object that needs a color-only change
**Example:**
```javascript
// BEFORE (XPManager._drawOrb):
_drawOrb(gfx, orb, time) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.006 + orb.x * 0.01);
    gfx.fillStyle(0x00ff88, 0.15 * pulse);   // outer glow
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 2.5);
    gfx.fillStyle(0x00ff88, 0.4 * pulse);    // mid glow
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 1.5);
    gfx.fillStyle(0x88ffcc, 0.9);             // core (greenish)
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS);
    gfx.fillStyle(0xffffff, 0.8);             // white dot
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 0.35);
}

// AFTER (orange, ~0.8s breathe):
// 0.8s period = 2*PI / (60fps * period_seconds) ≈ 2*PI/48 ≈ 0.0131 radians/frame
// At time in ms: period_ms = 800, angular_freq = 2*PI/800 ≈ 0.00785
_drawOrb(gfx, orb, time) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.00785 + orb.x * 0.01);
    gfx.fillStyle(0xFF6600, 0.15 * pulse);   // outer glow — breathes
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 2.5);
    gfx.fillStyle(0xFF8800, 0.4);            // mid ring — steady
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 1.5);
    gfx.fillStyle(0xFFAA44, 0.95);           // core — warm orange
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS);
    gfx.fillStyle(0xffffff, 0.85);           // white center dot
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 0.35);
}
```
**Notes on pulse period:** `time` in Phaser's `update(time, delta)` is milliseconds since scene start. Angular frequency for 0.8s period = `2 * Math.PI / 800 ≈ 0.00785`. The original `0.006` gives ~1047ms (~1s) period.

**Magnet trail color change:**
```javascript
// BEFORE (update() in XPManager):
this._gfx.lineStyle(2, 0x00ff88, trailAlpha);

// AFTER:
this._gfx.lineStyle(2, 0xFF6600, trailAlpha);
```

### Pattern 2: HUD XP Bar Color Update (Static Graphics Redraw)
**What:** The XP bar background has a static border drawn in the constructor with `0x00ff88`. Changing it requires destroying and recreating the static graphics, or redrawing it.
**When to use:** Any static Graphics drawn once in constructor that needs color change
**Example:**
```javascript
// In HUD constructor — xpBarBg border line (line 89-90):
// BEFORE:
this.xpBarBg.lineStyle(1, 0x00ff88, 0.5);
this.xpBarBg.strokeRect(xpBarX, xpBarY - xpBarH / 2, xpBarW, xpBarH);

// AFTER:
this.xpBarBg.lineStyle(1, 0xFF6600, 0.5);
this.xpBarBg.strokeRect(xpBarX, xpBarY - xpBarH / 2, xpBarW, xpBarH);

// xpLevelText color (line 76):
// BEFORE: color: '#00ff88'
// AFTER:  color: '#FF8800'

// updateXPBar fill (line 220):
// BEFORE: this.xpBarFill.fillStyle(0x00ff88, 1);
// AFTER:  this.xpBarFill.fillStyle(0xFF6600, 1);
```

### Pattern 3: Dirty-Flag Fill Bar with scaleX Tween
**What:** Replace every-frame clear+redraw in HUD.update() with a change-detection guard plus a tween on a Rectangle game object.
**When to use:** Any fill bar that doesn't need to change every frame and needs smooth animation
**Key insight:** Use a `Phaser.GameObjects.Rectangle` for the fill instead of Graphics, because Rectangle has natural `width` and `x`/`originX` properties that tween correctly. Then the tween animates `width` directly.

**Current pattern (bad — redraws every frame):**
```javascript
// HUD.update() — currently clears and redraws shield and health every frame
this.shieldBarFill.clear();
if (shieldRatio > 0) {
    this.shieldBarFill.fillStyle(0x4488ff, 1);
    this.shieldBarFill.fillRoundedRect(...);
}
```

**Alternative approach — use setSize on Rectangle:**
Since Graphics.fillRoundedRect() is used (not plain fillRect), switching to a Rectangle loses the rounded corners. The simplest approach that preserves rounded corners: keep using Graphics for the fill, but tween a numeric proxy value (`this._shieldRatio`) that the next draw reads. Use `tweens.killTweensOf` to cancel in-flight tweens before starting a new one (the dirty-flag tween cancel pattern).

```javascript
// In HUD constructor:
this._shieldRatioCurrent = 1;  // tweened display value
this._healthRatioCurrent = 1;  // tweened display value
this._shieldRatioTarget = 1;   // actual target
this._healthRatioTarget = 1;   // actual target
this._shieldTween = null;
this._healthTween = null;

// In HUD.update():
const shieldRatioNew = shieldMax > 0 ? Math.max(0, shieldCur / shieldMax) : 0;
if (shieldRatioNew !== this._shieldRatioTarget) {
    this._shieldRatioTarget = shieldRatioNew;
    if (this._shieldTween) { this._shieldTween.stop(); }
    this._shieldTween = this.scene.tweens.add({
        targets: this,
        _shieldRatioCurrent: shieldRatioNew,
        duration: 150,
        ease: 'Power2.easeOut',
        onComplete: () => { this._shieldTween = null; }
    });
}
// Redraw using this._shieldRatioCurrent (which is animating)
this.shieldBarFill.clear();
if (this._shieldRatioCurrent > 0) {
    this.shieldBarFill.fillStyle(0x4488ff, 1);
    this.shieldBarFill.fillRoundedRect(
        BAR_X + 1, SHIELD_Y - BAR_H / 2 + 1,
        (BAR_W - 2) * this._shieldRatioCurrent, BAR_H - 2,
        CORNER_R
    );
}
```
**Why this works:** The Graphics object still clears and redraws every frame (same cost as before), but the numeric value being drawn animates smoothly. `tweens.add()` can target any object with numeric properties — the `this` HUD instance qualifies. `tweens.killTweensOf` / `.stop()` cancels in-flight tweens before starting a new one.

**Note on `tweens.add()` targeting a non-GameObject:** Phaser 4's tween system can target any plain object with numeric properties. This is the same pattern used in many Phaser games for animating logical values. Confirmed by existing use in `GroundDropManager.js` where `tweens.killTweensOf(drop.gfx)` is called — the tween system stores references to targeted objects.

### Pattern 4: StatBar Removal + Kill Streak Migration
**What:** StatBar has two independent concerns: (1) the 8-stat text strip (remove entirely), (2) the kill streak counter top-right (migrate to HUD).
**When to use:** When deleting a class that owns UI elements needed elsewhere

**Migration plan:**
1. In `HUD.constructor()`: add `streakText` (copy from `StatBar.constructor`)
2. In `HUD.js`: add `updateStreak(streak)` method (copy logic from `StatBar.update()`)
3. In `GameScene.update()`: call `this.hud.updateStreak(this.killStreak || 0)` instead of `this.statBar.update()`
4. Remove `import { StatBar }` from GameScene.js
5. Remove `this.statBar = new StatBar(this)` from `GameScene.create()`
6. Remove `this.statBar.update()` from `GameScene.update()`
7. Delete `src/ui/StatBar.js`

**StreakText current location (StatBar.js lines 21-28):**
```javascript
// Top-right corner — move this block to HUD.constructor()
this.streakText = scene.add.text(GAME.WIDTH - 40, 10, '', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
}).setOrigin(1, 0).setDepth(101).setScrollFactor(0);
```

### Pattern 5: UpgradeCardUI Accent Color Update
**What:** Two color references to `#00FF88` in UpgradeCardUI need updating to orange.
**Locations:**
- Line 179: `color: '#00FF88'` (stat text for current level display)
- Line 204: `color: isLevelUp ? '#ffcc00' : '#00ff88'` (level dot "NEW" text)
```javascript
// BEFORE line 179:
color: '#00FF88',
// AFTER:
color: '#FF8800',

// BEFORE line 204:
color: isLevelUp ? '#ffcc00' : '#00ff88',
// AFTER:
color: isLevelUp ? '#ffcc00' : '#FF8800',
```

### Anti-Patterns to Avoid
- **Tweening Graphics directly on non-origin-based properties:** Do not try to tween `width` on a Graphics object — it has no `width` property that Phaser's tween system tracks. Tween a numeric proxy on the owning object instead.
- **Forgetting to kill in-flight tweens before starting a new one:** If `damagePlayer` fires twice in quick succession, two shield tweens running simultaneously will fight each other. Always call `this._shieldTween?.stop()` before starting a new tween.
- **Redrawing static Graphics in update():** The XP bar background and its border are drawn once in the constructor — correct approach. Do not move them to update().
- **Leaving StatBar import after class deletion:** JS module systems will throw at runtime. Remove both the import line and all 3 references in GameScene.js.
- **Breaking the kill streak display:** StatBar.streakText is the ONLY kill streak display in the game. If it disappears without migration, kills provide no feedback. Confirm streak counter is live in HUD before deleting StatBar.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth bar animation | Manual lerp in update() every frame | `scene.tweens.add()` with proxy value | Phaser tweens handle timing, easing, and cancellation; manual lerp accumulates floating-point drift |
| Tween cancellation | Boolean flag + conditional | `this._shieldTween?.stop()` | Phaser tracks tween state internally; stop() is the canonical cancel |
| Color from hex string | Manual bitshift parsing | `Phaser.Display.Color.HexStringToColor()` | Already used in UpgradeCardUI.js; handles alpha, edge cases |

**Key insight:** Phaser 4's tween system is flexible enough to target plain objects (not just GameObjects). This is the correct tool for animating fill ratios while keeping Graphics-based rendering.

---

## Common Pitfalls

### Pitfall 1: Phaser 4 Graphics origin is always (0, 0) — not the center
**What goes wrong:** If you add a tween targeting `scaleX` on a Graphics object that draws a bar at absolute screen position (e.g., `BAR_X = 60`), the scale happens around x=0 (screen left edge), not around the bar's left edge. The bar will appear to slide left as it animates.
**Why it happens:** Phaser Graphics objects don't support `setOrigin()`. Their scale pivot is always the object's position property, which defaults to (0, 0).
**How to avoid:** Use the proxy-value pattern (Pattern 3 above) — tween a numeric ratio, redraw from that ratio. Alternatively, use a `Phaser.GameObjects.Rectangle` with `setOrigin(0, 0.5)` and tween its `width` directly.
**Warning signs:** Bar appears to shrink toward the left during animation rather than collapsing in place.

### Pitfall 2: HUD.update() is called every frame — pulse animations accumulate tween debt
**What goes wrong:** If you add a `tweens.add()` call inside `HUD.update()` without a dirty flag, a new tween is created every frame (60/s). Within seconds you have thousands of in-flight tweens all targeting `_shieldRatioCurrent`.
**Why it happens:** `HUD.update()` runs unconditionally every game loop tick from `GameScene.update()`.
**How to avoid:** Only call `tweens.add()` inside `HUD.update()` when `shieldRatioNew !== this._shieldRatioTarget` (value actually changed). See Pattern 3.
**Warning signs:** Game slows dramatically within seconds of receiving damage; browser memory climbs.

### Pitfall 3: Nebula Zone color conflict with orange orbs
**What goes wrong:** Nebula Zone (`baseTint: 0x662244`, `layerTint: 0xFF6699`) has pinkish-red hues that could visually merge with orange orbs.
**Why it happens:** Warm colors at same brightness blend together at a distance.
**How to avoid:** The user already decided 0xFF6600 as the base — this is sufficiently distinct from 0xFF6699 (more saturated orange vs pink-red). The white center dot and the 3-layer glow structure ensure the orb reads as a point of light rather than a background element. No mitigation needed beyond the decided palette.
**Warning signs:** Playtest in Nebula Zone specifically (wave 4-5) — if orbs become hard to track, consider brightening the core slightly.

### Pitfall 4: HUD.update() still receives shield/HP pulse logic — don't remove it when refactoring
**What goes wrong:** When adding the dirty-flag tween system, the existing `shieldGlow` pulse (lines 142-152 of HUD.js) runs every frame unconditionally and is separate from the fill bar. Do not accidentally remove it during the refactor.
**Why it happens:** The shield fill bar and the shield glow pulse are two separate Graphics objects updated independently. The fill bar gets the dirty-flag treatment; the glow pulse stays as-is (or gets tuning per Claude's Discretion).
**How to avoid:** Keep `shieldGlow.clear()` + pulse logic untouched unless explicitly tuning it. The tween refactor touches only `shieldBarFill` and `healthBarFill`.

### Pitfall 5: Static XP bar border is drawn at constructor time with old color
**What goes wrong:** Changing `fillStyle` in `updateXPBar()` to orange correctly updates the fill, but the border drawn in the constructor (`this.xpBarBg.lineStyle(1, 0x00ff88, 0.5)`) remains green because it's drawn once and never redrawn.
**Why it happens:** Phaser Graphics objects retain their previously drawn content until `clear()` is called. The border was drawn in the constructor and `xpBarBg` is never cleared after that.
**How to avoid:** Change the border color in the constructor code at the same time as the fill color. Both are in HUD.js — lines 89-90 (border) and 220 (fill).

---

## Code Examples

### Complete Color Mapping (green to orange)

All locations to change, by file:

**XPManager.js** — `_drawOrb()` and `update()`:
```javascript
// _drawOrb: outer glow
0x00ff88 -> 0xFF6600   // fillStyle, alpha 0.15*pulse
// _drawOrb: mid glow
0x00ff88 -> 0xFF8800   // fillStyle, alpha 0.4 (remove pulse from mid ring)
// _drawOrb: core
0x88ffcc -> 0xFFAA44   // warm amber core
// _drawOrb: white dot — keep 0xffffff (no change)
// update(): magnet trail lineStyle
0x00ff88 -> 0xFF6600
```

**HUD.js** — constructor and `updateXPBar()`:
```javascript
// Constructor line 76: xpLevelText color
'#00ff88' -> '#FF8800'
// Constructor line 89: xpBarBg border lineStyle
0x00ff88 -> 0xFF6600
// updateXPBar() line 220: xpBarFill fillStyle
0x00ff88 -> 0xFF6600
```

**UpgradeCardUI.js** — `_createCard()`:
```javascript
// Line 179: stat text color
'#00FF88' -> '#FF8800'
// Line 204: level dots / NEW text
'#00ff88' -> '#FF8800'
```

### Tween Proxy Pattern (complete, self-contained)
```javascript
// In HUD constructor — add these properties:
this._shieldRatioCurrent = 1;
this._healthRatioCurrent = 1;
this._shieldRatioTarget  = 1;
this._healthRatioTarget  = 1;
this._shieldTween = null;
this._healthTween = null;

// Replace shield fill section in update():
const shieldRatioNew = shieldMax > 0 ? Math.max(0, shieldCur / shieldMax) : 0;
if (shieldRatioNew !== this._shieldRatioTarget) {
    this._shieldRatioTarget = shieldRatioNew;
    if (this._shieldTween) { this._shieldTween.stop(); this._shieldTween = null; }
    this._shieldTween = this.scene.tweens.add({
        targets: this,
        _shieldRatioCurrent: shieldRatioNew,
        duration: 150,
        ease: 'Power2.easeOut',
        onComplete: () => { this._shieldTween = null; }
    });
}
// Draw using _shieldRatioCurrent:
this.shieldBarFill.clear();
if (this._shieldRatioCurrent > 0) {
    this.shieldBarFill.fillStyle(0x4488ff, 1);
    this.shieldBarFill.fillRoundedRect(
        BAR_X + 1, SHIELD_Y - BAR_H / 2 + 1,
        (BAR_W - 2) * this._shieldRatioCurrent, BAR_H - 2,
        CORNER_R
    );
}
// Apply same pattern for healthRatio / healthBarFill
```

### Verifying Phaser 4 Tween Targets Plain Objects
```javascript
// Existing usage in GroundDropManager.js (line 462) confirms Phaser 4 tracks non-GameObject targets:
this.scene.tweens.killTweensOf(drop.gfx);

// Existing usage in AAXBossEffects.js confirms scaleX tween works on GameObjects:
boss.scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, duration: 300 });

// Combined: tweening a plain-object numeric property is valid Phaser 4 usage
this.scene.tweens.add({ targets: this, _shieldRatioCurrent: 0.5, duration: 150 });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sprite-based XP orbs | Graphics-drawn green circles | Session prior to this phase | Visual regression in nebula zones — green on pink/green background |
| No fill bar animation | Instant clear+redraw every frame | Pre-existing | No smooth feedback on damage |
| StatBar shows raw stats mid-combat | Remove stat bar (this phase) | Phase 1 | Removes visual noise from bottom of screen |

**Deprecated/outdated:**
- StatBar class: confirmed anti-feature; the bottom strip showing DMG/RATE/SPD/etc. during combat is explicitly called out in REQUIREMENTS.md Out of Scope section ("Raw stat display during combat belongs in results/pause only")

---

## Open Questions

1. **Should the XP bar background border be re-drawn by clearing/redrawing xpBarBg, or by just changing the constructor code?**
   - What we know: `xpBarBg` is a Graphics drawn once in the constructor with `fillRect` + `strokeRect`. It is never cleared after that point. There is no `updateXPBar` call that touches the background.
   - What's unclear: The simplest fix is just changing the hex literal in the constructor — no runtime cost. But if the game is reloaded mid-session and HUD is reconstructed, the old object is destroyed and a new one drawn with the new code.
   - Recommendation: Just change the constructor literal. Simple, correct.

2. **Will the kill streak counter conflict with the HUD score text after migration?**
   - What we know: `streakText` is positioned at `GAME.WIDTH - 40, 10` (top-right, y=10). The score text is at `GAME.WIDTH - 40, 40` (top-right, y=40). HUD is constructed first, then StatBar was added. After migration, streakText lives in HUD.
   - What's unclear: At score text depth 100 and streak text depth 101, they should stack fine. But a long streak label like "x25 UNSTOPPABLE" at 32px will overlap with the score.
   - Recommendation: Accept the overlap — it existed before (StatBar was depth 101, same as score at depth 100). This is pre-existing and out of scope for Phase 1.

---

## Validation Architecture

Nyquist validation is enabled. This phase is a Phaser 4 browser game — there is no test framework installed in the project (no jest.config, no vitest.config, no pytest.ini, no test directories). The only dev dependency is Puppeteer (present in node_modules but no test scripts configured). Automated unit testing of rendering code requires a headless browser.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured — Puppeteer present but no test runner scripts defined |
| Config file | None — see Wave 0 gaps |
| Quick run command | `npm run dev` (manual browser verification only) |
| Full suite command | None — not configured |
| Estimated runtime | N/A — manual verification |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VISC-01 | XP orbs are orange against all background zones | manual-only | Open game in dev mode, press N to advance waves, verify orbs at each zone | N/A |
| VISC-03 | Bottom stat strip is gone from live HUD | manual-only | Open game in dev mode, verify no stat strip at screen bottom during wave | N/A |

**Why manual-only:** Both requirements are visual rendering outcomes in a browser canvas. They cannot be verified by reading source code alone — they require pixel-level observation of a running Phaser scene. Puppeteer could theoretically screenshot the canvas and pixel-check, but that would require significant Wave 0 infrastructure work that is not proportionate to the scope of this phase.

### Nyquist Sampling Rate
- **Minimum sample interval:** After each plan task completes → open `npm run dev`, play for 30 seconds, visually verify the changed behavior
- **Full suite trigger:** Before marking Phase 1 complete → test all 6 background zones (advance through waves 1-14 using N key in dev mode)
- **Phase-complete gate:** Both VISC-01 and VISC-03 visually confirmed in browser before `/gsd:verify-work`
- **Estimated feedback latency per task:** ~2 minutes (Vite hot reload is instant; manual visual check takes 1-2 min)

### Wave 0 Gaps (must be created before implementation)
None — no test framework infrastructure needs to be created. Verification is manual browser testing with the existing dev server (`npm run dev`) and dev keys (N=next wave, I=god mode, B=boss, K=kill all).

Dev verification checklist for executor:
- [ ] Start `npm run dev`, navigate to game, press dev to enable god mode (I key)
- [ ] VISC-01: Advance through waves 1-14 using N key, verify orbs are orange/gold at each background zone (especially Nebula Zone wave 4-5 and Void Rift wave 12-13)
- [ ] VISC-01: Verify magnet trail is orange (move player near orb cluster, watch lines)
- [ ] VISC-01: Verify XP level bar and LV text are orange
- [ ] VISC-01: Verify upgrade card stat text is orange (press U to force level-up)
- [ ] VISC-03: Verify no stat strip at screen bottom during wave play
- [ ] VISC-03: Verify kill streak counter still appears top-right when killing enemies
- [ ] HUD animation: Take HP damage (remove god mode), verify shield/HP bars animate smoothly
- [ ] HUD animation: Verify no performance degradation from rapid hits

---

## Sources

### Primary (HIGH confidence)
- Source code inspection — `src/systems/XPManager.js`: all 4 green color references identified with exact line numbers
- Source code inspection — `src/systems/HUD.js`: full update() architecture analyzed; 3 green references identified; existing pulse logic documented
- Source code inspection — `src/ui/StatBar.js`: complete class analyzed; coupling points to kill streak identified
- Source code inspection — `src/scenes/GameScene.js`: all 3 StatBar touch points identified (import line 26, constructor line 87, update call line 462)
- Source code inspection — `src/ui/UpgradeCardUI.js`: 2 green accent color references identified (lines 179, 204)
- `package.json`: Phaser 4.0.0-rc.6 confirmed installed
- `src/entities/AAXBossEffects.js` + `AAXBossHornMode.js`: confirms `scaleX` tween pattern works in this codebase
- `src/systems/GroundDropManager.js` line 462: confirms `tweens.killTweensOf(obj)` pattern on non-standard objects

### Secondary (MEDIUM confidence)
- Phaser 4 tween system behavior (targeting plain objects): inferred from existing codebase patterns and Phaser 3 documentation parity; Phaser 4 rc.6 has not been independently verified via Context7 for this specific API surface, but the existing codebase uses it successfully on Graphics objects and containers.

### Tertiary (LOW confidence)
- Pulse period math (0.00785 for 0.8s): calculated from `2 * Math.PI / 800ms`. Correct mathematically but should be verified by feel in the browser since `time` accumulates from scene start (not reset per wave) — orbs spawned at different times will have different phase offsets, which is the intended "organic" feel.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phaser 4.0.0-rc.6 confirmed installed, all patterns verified in existing codebase
- Architecture: HIGH — All touch points identified by direct source code inspection with exact line numbers
- Pitfalls: HIGH — Derived from direct analysis of the actual code structure, not theoretical

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — Phaser 4 rc.6 is stable for this project; no external dependencies)
