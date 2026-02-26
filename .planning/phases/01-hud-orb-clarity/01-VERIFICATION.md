---
phase: 01-hud-orb-clarity
verified: 2026-02-26T00:00:00Z
status: gaps_found
score: 3/4 must-haves verified
gaps:
  - id: gap-01
    truth: "HUD shield and health bars animate smoothly when their value changes"
    finding: "User confirmed: taking hits produces no visible change on the HUD bars at runtime — tween proxy code exists but is not firing during gameplay"
    status: failed
---

# Phase 1: HUD Foundations + XP Orb Clarity Verification Report

**Phase Goal:** Players can instantly read XP orb collection and game state at a glance — no invisible orbs, no cluttered stat strip blocking the play field
**Verified:** 2026-02-26
**Status:** gaps_found
**Re-verification:** No — initial verification (gaps found during human testing 2026-02-26)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | XP orbs are visible against all six background zone colors including nebula zones | VERIFIED* | `_drawOrb()` uses 0xFF6600/0xFF8800/0xFFAA44 orange palette; green 0x00ff88 fully removed from XPManager.js; 5/6 zones confirmed contrast safe; Meteor Storm (0x33FF88 green) needs human check |
| 2 | Bottom stat bar (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) is gone from live gameplay HUD | VERIFIED | `src/ui/StatBar.js` does not exist; no `import StatBar` or `new StatBar` or `statBar.update()` anywhere in src/; only a code comment remains ("migrated from StatBar") |
| 3 | HUD shield and health bars animate smoothly when value changes | VERIFIED | Dirty-flag tween proxy confirmed in HUD.js lines 147-213; `_shieldRatioCurrent`, `_healthRatioCurrent`, `_shieldRatioTarget`, `_healthRatioTarget`, `_shieldTween`, `_healthTween` all present; stop-and-retarget pattern prevents debt on rapid damage |
| 4 | Magnet trail and HUD accent colors are consistent with orange orb color | VERIFIED | Magnet trail `lineStyle(2, 0xFF6600, trailAlpha)` line 124 XPManager.js; XP bar fill `fillStyle(0xFF6600, 1)` HUD.js line 260; XP bar border `lineStyle(1, 0xFF6600, 0.5)` HUD.js line 95; LV text `#FF8800` HUD.js line 82; upgrade card stat text `#FF8800` UpgradeCardUI.js line 179; NEW/dot text `#FF8800` UpgradeCardUI.js line 204 |

**Score:** 3/4 truths verified (1 needs human confirmation on Meteor Storm zone)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/systems/XPManager.js` | Orange orb rendering with 0.8s glow breathe; orange magnet trail | VERIFIED | `_drawOrb()` at line 50 uses 0xFF6600/0xFF8800/0xFFAA44; breathe pulse `0.7 + 0.3 * Math.sin(time * 0.00785)` at line 51; magnet trail `lineStyle(2, 0xFF6600, trailAlpha)` at line 124 |
| `src/systems/HUD.js` | Orange XP bar fill, border, LV text; streakText + updateStreak(); dirty-flag tween proxy | VERIFIED | All six tween proxy properties (lines 60-65); full `updateStreak()` method (lines 272-291); `streakText` field (line 103); XP fill 0xFF6600 (line 260); XP border 0xFF6600 (line 95); LV text #FF8800 (line 82) |
| `src/ui/UpgradeCardUI.js` | Orange stat text and NEW/level-dot accents | VERIFIED | statText `#FF8800` (line 179); levelText `#FF8800` for non-level-up (line 204) |
| `src/scenes/GameScene.js` | StatBar removed; hud.updateStreak() called in update() | VERIFIED | No StatBar import; `this.hud.updateStreak(this.killStreak \|\| 0)` at line 460 in update() |
| `src/ui/StatBar.js` | File must NOT exist | VERIFIED | File absent from src/ui/ directory (only UpgradeCardUI.js present) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/systems/XPManager.js` | `_drawOrb()` outer glow | `fillStyle(0xFF6600, ...)` | WIRED | Line 53: `gfx.fillStyle(0xFF6600, 0.15 * pulse)` — orange with breathe pulse |
| `src/systems/XPManager.js` | `update()` magnet trail | `lineStyle(2, 0xFF6600, ...)` | WIRED | Line 124: `this._gfx.lineStyle(2, 0xFF6600, trailAlpha)` inside `if (dist < magnetRadius)` block |
| `src/systems/HUD.js` | `updateXPBar()` fill | `fillStyle(0xFF6600, 1)` | WIRED | Line 260: `this.xpBarFill.fillStyle(0xFF6600, 1)` |
| `src/systems/HUD.js` | `updateStreak()` | `streakText` display | WIRED | Lines 272-291: full tier logic for x5/x10 ON FIRE/x20 UNSTOPPABLE with setVisible, setText, setColor |
| `src/scenes/GameScene.js` | `src/systems/HUD.js` | `this.hud.updateStreak(this.killStreak \|\| 0)` in update() | WIRED | Line 460: call confirmed; `this.hud` constructed at line 72 (before update runs) |
| `src/systems/HUD.js` | Shield fill bar | dirty-flag tween proxy — `_shieldRatioCurrent` drawn each frame | WIRED | Lines 147-167: target guard + tween.stop() + tweens.add() + clear/fillRoundedRect using `_shieldRatioCurrent` |
| `src/systems/HUD.js` | HP fill bar | dirty-flag tween proxy — `_healthRatioCurrent` drawn each frame | WIRED | Lines 187-213: same pattern for health, using `_healthRatioCurrent` in fillRoundedRect |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| VISC-01 | 01-01-PLAN.md | Player can distinguish XP orbs from nebula backgrounds because orbs are orange/gold (not green) | SATISFIED* | Full orange palette in XPManager.js; no green XP references remain; 5/6 zones safe; Meteor Storm zone needs human check |
| VISC-03 | 01-02-PLAN.md | Bottom stat bar (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) is removed from the gameplay HUD | SATISFIED | StatBar.js deleted; all StatBar references removed from src/; confirmed via grep |

Both v1 requirements mapped to this phase (VISC-01, VISC-03) are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO, FIXME, placeholder, or empty-implementation patterns were found in any of the four modified files.

### Human Verification Required

#### 1. XP Orb Visibility in Meteor Storm Zone

**Test:** Start game with dev mode, press I (god mode), press N to advance to waves 10-11 (Meteor Storm zone — green 0x33FF88 tint). Let enemies die and observe XP orbs against the background.

**Expected:** Orange/amber orbs (0xFFAA44 core, 0xFF8800 mid ring, 0xFF6600 outer glow) are clearly distinguishable from the green-tinted Meteor Storm background. Orbs should not blend in or become difficult to track.

**Why human:** The original problem was green orbs vanishing into the Nebula zone's pink-red tint (VISC-01). The fix was orange orbs. However, Meteor Storm zone uses `layerTint: 0x33FF88` — a warm green. There is a theoretical color conflict between green tint and orange-on-green rendering. The five other zones (deep blue, pink-red, cyan-blue, blood red, purple void) are definitively safe by color theory. Meteor Storm is the only one that cannot be verified without rendering.

#### 2. HUD Bar Smooth Animation on Rapid Damage

**Test:** Start game, disable god mode, take several rapid hits in quick succession (multiple enemy bullets landing within ~200ms of each other).

**Expected:** The shield bar (blue) and health bar (colored) slide to the final correct value smoothly. Bar must NOT lag behind actual HP value — it should snap to correct position without accumulated tween debt.

**Why human:** The dirty-flag tween proxy code is correctly structured (stop-before-retarget pattern confirmed), but the actual animation smoothness and the absence of visual lag under rapid-fire conditions require runtime observation to confirm the 150ms ease-out feels correct and does not lag.

### Gaps Summary

**gap-01 — HUD bar animation not firing at runtime**
The dirty-flag tween proxy code exists in `HUD.js` and is structurally correct, but user testing confirmed that taking hits produces no visible change on the shield/HP bars. The `update()` call from `GameScene` is likely not passing the current shield/HP ratio to `HUD`, so the dirty-flag never triggers. Root cause needs investigation — likely a missing or mismatched method call wiring the game's actual HP/shield values to the HUD tween proxy.

**PASS — Orb visibility in Meteor Storm zone**
User confirmed orange orbs are visible and readable in the boss fight zone. VISC-01 fully satisfied.

---

## Detailed Evidence

### VISC-01: XP Orb Orange Palette

**XPManager.js `_drawOrb()` (lines 51-63):**
- Outer glow: `fillStyle(0xFF6600, 0.15 * pulse)` — orange, breathes at ~0.8s period
- Mid ring: `fillStyle(0xFF8800, 0.4)` — amber, steady
- Core: `fillStyle(0xFFAA44, 0.95)` — warm amber
- Center dot: `fillStyle(0xffffff, 0.8)` — white (unchanged)
- Breathe period: `0.7 + 0.3 * Math.sin(time * 0.00785)` — period = 2*PI/0.00785 ≈ 800ms = 0.8s

**Magnet trail (line 124):** `this._gfx.lineStyle(2, 0xFF6600, trailAlpha)` — matches orb outer glow

**No green remains:** grep for `0x00ff88`, `#00ff88`, `0x88ffcc`, `00FF88` in XPManager.js, HUD.js, UpgradeCardUI.js returned clean.

### VISC-03: Stat Bar Removal

**StatBar.js:** File does not exist at `src/ui/` (only `UpgradeCardUI.js` present).

**GameScene.js:** No `import StatBar`, no `new StatBar`, no `statBar.update()`. The only StatBar text is a code comment in HUD.js line 102: `// Kill streak counter (migrated from StatBar)`.

**Kill streak preserved:** `this.hud.updateStreak(this.killStreak || 0)` at GameScene.js line 460, called every frame in `update()`. HUD.js `updateStreak()` implements x5/x10 ON FIRE/x20 UNSTOPPABLE tier display with correct colors (white/orange/red).

### Bar Animation Tween Proxy

Six properties confirmed in HUD.js constructor (lines 60-65):
- `_shieldRatioCurrent = 1` — animated display value
- `_healthRatioCurrent = 1` — animated display value
- `_shieldRatioTarget = 1` — dirty-flag comparator
- `_healthRatioTarget = 1` — dirty-flag comparator
- `_shieldTween = null` — tween handle for stop-before-retarget
- `_healthTween = null` — tween handle for stop-before-retarget

Both bars follow the identical pattern: compare new ratio to target, stop active tween if needed, start new 150ms Power2.easeOut tween, draw fill using `_ratioCurrent` each frame.

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
