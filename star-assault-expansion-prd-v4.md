# Star Assault — Gameplay Expansion PRD v4.0
**For:** Pilot Implementation | **Supersedes:** gameplay-rework-prd.md v3.0 and all prior upgrade PRDs
**Rule:** All randomness uses seeded RNG. Every player on the same day gets identical enemy behaviour, upgrade draws, drop locations, and elite spawns. One run. One chance. Same for everyone.

---

## Overview

This PRD consolidates and expands everything from previous versions into one complete implementation document. Read this entire file before writing any code. The goal is to transform Star Assault from a traditional space shooter into a Vampire Survivors / Brotato / Death Must Die style horde survival game with deep build identity, punchy moment-to-moment combat, and meaningful decisions every 15–20 seconds.

---

## 1. Enemy Behaviour — Full Homing Overhaul

### All Enemies Chase the Player at All Times

Remove all fixed flight paths. Every enemy steers toward the player's current position every frame.

```javascript
// Applied to all enemy types every frame in WaveManager.updateEnemy()
const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
enemy.body.setVelocity(
  Math.cos(angle) * enemy.speed,
  Math.sin(angle) * enemy.speed
);
```

### Spawn From All 4 Edges

Enemies spawn from random points along all 4 screen edges, 60px outside the visible area. Use seeded RNG to determine spawn edge and position. Never spawn within 100px of the player.

### Spawn Volume — Always Surrounded

There must never be a quiet moment. Enforce a minimum alive count per wave. If alive count drops below minimum, immediately spawn a replacement.

| Wave | Min Alive | Spawn Interval | Notes |
|---|---|---|---|
| 1 | 3 | 3000ms | Grunts only |
| 2 | 5 | 2500ms | Grunts + Zigzaggers |
| 3 | 8 | 2000ms | + Divers |
| 4 | 10 | 1800ms | + Formation Leaders |
| 5 | 12 | 1500ms | + Bombers |
| 6 | 14 | 1200ms | All types |
| 7 | 16 | 1000ms | Formation Leaders in pairs |
| 8 | 18 | 900ms | Elites more frequent |
| 9 | 20 | 700ms | Pre-boss barrage |
| 10 | — | — | AAX Boss + grunt harassment |

### Seamless Wave Transitions

Remove all inter-wave pause screens. Waves transition while enemies keep spawning. A "WAVE [N]" announcement fades in at top of screen for 2 seconds — the game never stops. The only pause before combat is the boss intro cutscene at Wave 10.

### Auto-Aim

The player's ship auto-rotates to face the nearest living enemy every frame. All weapons fire toward that target. If no enemies are alive, fire straight up.

```javascript
// In GameScenePlayer.js update()
const nearest = findNearestEnemy(scene);
if (nearest) {
  const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  player.setRotation(angle + Math.PI / 2); // offset so sprite "up" = angle 0
  scene.aimAngle = angle;
}
```

---

## 2. Enemy Types — Full Roster

### Standard Types (existing, update movement to homing)

| Type | Speed | HP | Behaviour |
|---|---|---|---|
| Grunt | 90 px/s | 10 | Pure homing rammer. No shooting. |
| Zigzagger | 110 px/s | 15 | Homing + sine wave offset (amplitude 60px, 2Hz) |
| Diver | 200 px/s | 18 | Homing, pauses 1s at 300px range, then lunges. Fires 3-shot spread on lunge. |
| Formation Leader | 70 px/s | 30 | Slow homing, fires aimed bursts. Has 2 shield points. Fires in sync with nearby leaders (max 1 other). |

### New Type: Bomber (Wave 5+)

- Speed: 60 px/s, HP: 40, has 2 shield points
- Homing movement toward player
- When within 220px: stops, pulses orange for 1.2s (telegraph), then detonates
- Detonation: 180px AoE, deals 1 damage to player if caught, kills all grunts in radius
- If killed before detonating: drops a Bomb pickup guaranteed
- Tint: `0xFF6600`

### Elite Variant System

Every enemy type has a rare Elite version (seeded RNG, ~8% chance per spawn). Elites:
- 2.5× HP, 1.3× speed
- Distinct visual: larger scale (1.4×), golden tint `0xFFD700`
- **Entry callout:** spawn with a 0.5s warning flash at their spawn point (yellow ring expanding from 0→60px, then enemy appears)
- Drop rate 2× for all ground pickups
- Show a small crown icon above them (rendered via Graphics, small gold triangle)
- Worth 2.5× XP

### Damaged Sprite Swap

When any enemy drops below 50% HP, swap to their damaged sprite variant:
```javascript
if (hp < maxHP * 0.5 && !enemy.getData('damaged')) {
  const key = enemy.texture.key;
  if (scene.textures.exists(key + '_damaged')) {
    enemy.setTexture(key + '_damaged');
    enemy.setData('damaged', true);
  }
}
```

### Enemy Shield Display

Formation Leaders and Bombers spawn with shields. Render above health bar:
- Thin blue bar (8px tall) above the standard health bar
- Each shield pip shown as a cyan segment
- When a shield pip breaks: brief cyan flash + particle burst at enemy position

---

## 3. Player Stats System

All stats tracked as plain scene variables (not Phaser object properties):

| Variable | Default | Cap | Description |
|---|---|---|---|
| `playerDamage` | 10 | — | Base damage per bullet |
| `playerFireRate` | 1.0 | 8.0/s | Shots per second |
| `playerSpeed` | 300 | 700 | Movement speed px/s |
| `playerShield` | 3 | 8 | Max shield charges |
| `playerShieldCurrent` | 3 | = max | Current shield remaining |
| `playerMaxHP` | 5 | 10 | Maximum hit points |
| `playerCurrentHP` | 5 | = max | Current HP |
| `playerMagnet` | 80 | 400 | XP orb pickup radius px |
| `playerCrit` | 0.05 | 0.80 | Crit chance 0.0–1.0 |
| `playerPierce` | 0 | 5 | Enemies bullets pass through |
| `playerSpread` | 1 | 7 | Simultaneous shots |
| `playerCooldown` | 0 | 0.6 | Cooldown reduction 0.0–0.6 |
| `playerBlastArea` | 1.0 | 2.5 | AoE radius multiplier |
| `playerLifeSteal` | 0 | 0.3 | HP restored per 100 DMG dealt (0.0–0.3) |
| `nearMissCount` | 0 | — | Near misses this run |
| `killStreak` | 0 | — | Consecutive kills without taking damage |
| `killStreakBonus` | 0 | 50% | Fire rate bonus from kill streak |

All weapons, bullets, and AoE effects must read from these variables at fire time.

---

## 4. Shield & Health System (Halo-Style)

### Shield Mechanics
- Shield is primary defence. Damage hits shield first, then HP.
- After 4 seconds without taking damage, shield regenerates 1 charge per second until full
- `shieldRechargeTimer` resets to 0 on every damage event
- Shield recharge is visible — pulsing blue glow on the shield bar while recharging

### Health Mechanics
- HP never regenerates passively
- Only recovery: Heart ground drops, Hull Patch upgrade, Cosmic Rebirth gold upgrade, Life Steal
- **Life Steal:** every 100 damage dealt, restore `playerLifeSteal` HP (rounds down, minimum 1 if > 0)

### HUD Bars (top-left, no numbers)
- Shield bar: `#4488FF` blue, 220px wide × 14px tall, y=24, rounded corners 3px
  - Smooth tween when depleting or regenerating
  - Pulsing glow (`alpha` 0.6↔1.0, 800ms loop) while recharging
- Health bar: `#FF4444` red, 220px wide × 14px tall, y=44, rounded corners 3px
  - Smooth tween when depleting
  - Pulses red when ≤ 1 HP remaining
  - Gradient: green at full → yellow at 50% → red at 20% (approximate with colour interpolation)
- Small ❤ icon left of health bar, small 🛡 icon left of shield bar
- On taking damage: camera shake intensity 0.004, duration 180ms + red screen edge vignette for 200ms
- On healing: green particle burst upward from health bar + "+1 HP" floating text in green
- Shield break (hits 0): brief white flash full screen (alpha 0.15, 60ms) + metallic break sound if audio exists

---

## 5. Kill Streak System

Kill enemies consecutively without taking damage to build a streak. The streak feeds a visible fire rate bonus and creates a risk/reward loop around getting hit.

```
killStreak increments on each kill
killStreak resets to 0 on any damage taken
killStreakBonus = Math.min(0.5, killStreak * 0.025) // +2.5% fire rate per kill, max +50%
Effective fire rate = playerFireRate * (1 + killStreakBonus)
```

### Kill Streak HUD Display
- Small streak counter displayed in the top-right corner
- At streak 0: invisible
- At streak 1–9: white text "🔥 x[N]"
- At streak 10+: orange pulsing text "🔥 x[N] ON FIRE"
- At streak 20+: red animated text "🔥 x[N] UNSTOPPABLE"
- On streak break (taking damage): text briefly shows "STREAK BROKEN" in grey, fades out

---

## 6. Build Identity — Theme Bias System

This is the core feature that makes runs feel unique. After the player picks their **first Purple or higher upgrade**, the system identifies a build theme and biases future card draws toward that theme.

### Theme Definitions

| Theme | Triggered By | Biased Toward |
|---|---|---|
| LASER | Twin Laser Array (P01) | P01, B05 (Chrono), B07 (Nebula Rounds), B08 (Targeting AI), P06 (Dark Matter Core) |
| ORBITAL | Orbital Cannon (P02) | P02, B04 (Seeker Drone), Gn01 (Dual Burner), P05 (Crit Cascade) |
| CHAOS | Black Hole Grenade (P03) | P03, R01 (Event Horizon), R06 (Death Nova), R04 (Bullet Storm) |
| SURVIVOR | Quantum Phase (P04) | P04, P07 (Pulsar Shield), R03 (Undying Protocol), Gn04 (Micro Shield) |
| STRIKER | Crit Cascade (P05) | P05, B08 (Targeting AI), R05 (Singularity Engine), Gn05 (Lucky Stars) |
| BERSERKER | Dark Matter Core (P06) | P06, R04 (Bullet Storm), R05 (Singularity Engine), Gn02 (Overcharged Cell) |

### Bias Implementation

Once a theme is active, themed upgrades get their rarity weight multiplied by 2.5× in the draw pool. Non-themed upgrades are unaffected. This doesn't guarantee themed draws — it just makes them significantly more likely.

```javascript
// In UpgradeManager.drawUpgrades()
if (this.activeTheme) {
  const themedIds = THEMES[this.activeTheme].biasedToward;
  if (themedIds.includes(upgrade.id)) {
    effectiveWeight *= 2.5;
  }
}
```

### Theme Announcement
When a theme activates, display a 2-second banner:
- Text: "🔥 BUILD UNLOCKED: [THEME NAME]" 
- Color: Purple `#9C27B0`
- Same scale-in tween as synergy banners

---

## 7. Upgrade Catalogue — Full Table

### Rarity Weights

Base weights: GREY=100, GREEN=50, BLUE=20, PURPLE=8, RED=3, GOLD=1

Level scaling (applied per player level above 3):
```
levelBonus = playerLevel - 3
GREY:   max(10, 100 - levelBonus * 8)
GREEN:  min(80, 50 + levelBonus * 3)
BLUE:   min(60, 20 + levelBonus * 4)
PURPLE: min(40, 8 + levelBonus * 3)
RED:    min(20, 3 + levelBonus * 1.5)
GOLD:   min(8, 1 + levelBonus * 0.5)
```

Wave bonus on top:
- Wave 5+: all non-Grey weights ×1.2
- Wave 8+: all non-Grey weights ×1.5
- Boss wave: all non-Grey weights ×2.0

---

### GREY — Common

| ID | Name | Type | L1 | L2 | L3 |
|---|---|---|---|---|---|
| G01 | Thruster Tweak | Passive | +8% Speed | +16% Speed | +25% Speed |
| G02 | Targeting Lens | Passive | +1 DMG | +2 DMG | +4 DMG |
| G03 | Reactor Tick | Passive | -5% Cooldown | -10% CD | -15% CD |
| G04 | Gravity Coil | Passive | +20px Magnet | +40px Magnet | +60px Magnet |
| G05 | Hull Patch | Utility | Restore 1 HP | Restore 1 HP | Restore 1 HP |
| G06 | Adrenaline Chip | Passive | +2% fire rate per kill streak kill | +4% per kill | +6% per kill |

> G05 Hull Patch: resets to Level 0 after each pick. Can be offered and picked repeatedly. Never offered at full HP.

---

### GREEN — Uncommon

| ID | Name | Type | L1 | L2 | L3 |
|---|---|---|---|---|---|
| Gn01 | Dual Burner | Weapon Mod | +1 Spread (2 shots) | 3 shots | 4 shots |
| Gn02 | Overcharged Cell | Passive | +3 DMG | +6 DMG | +10 DMG |
| Gn03 | Combat Stims | Passive | +0.2 Fire Rate | +0.4 Fire Rate | +0.6 Fire Rate |
| Gn04 | Micro Shield | Defense | +1 Shield max | +2 Shield max | +3 Shield max |
| Gn05 | Lucky Stars | Passive | +5% Crit | +10% Crit | +15% Crit |
| Gn06 | Ion Refractor | Weapon Mod | +1 Pierce | +2 Pierce | +3 Pierce |
| Gn07 | Warp Boosters | Passive | +15% Speed | +25% Speed | +40% Speed |
| Gn08 | Max HP Upgrade | Defense | +1 Max HP (heals 1) | +2 Max HP (heals 1) | +3 Max HP (heals 1) |

---

### BLUE — Rare

| ID | Name | Type | L1 | L2 | L3 |
|---|---|---|---|---|---|
| B01 | Spread Cannon | Weapon | 3-shot fan -10°/0°/+10° | 5-shot fan | 7-shot fan +15% DMG |
| B02 | Rear Guard | Weapon | 1 shot backward | 2 backward | 3 backward +DMG |
| B03 | Plasma Burst | Weapon | AoE ring every 4s | Every 3s | Every 2s +50% radius |
| B04 | Seeker Drone | Weapon | 1 homing missile/5s | 1/3s | 2/3s |
| B05 | Chrono Capacitor | Passive | -20% Cooldown | -35% CD | -50% CD |
| B06 | Void Shield | Defense | +2 Shield, recharge 8s | +3 Shield, 6s | +4 Shield, 4s |
| B07 | Nebula Rounds | Weapon Mod | Shots leave 1s damage cloud | 2s cloud | 3s cloud +DMG |
| B08 | Targeting AI | Passive | +20% Crit, +5 DMG on crit | +30% Crit, +10 on crit | +40% Crit, +15 on crit |
| B09 | Nano Leech | Passive | Life Steal +0.05 (restore 0.05 HP per 100 DMG) | +0.10 | +0.15 |

> B09 Nano Leech is the entry point for life steal builds. Each 100 cumulative damage dealt restores `playerLifeSteal` HP (minimum 1 if stat > 0).

---

### PURPLE — Epic

| ID | Name | Type | L1 | L2 | L3 |
|---|---|---|---|---|---|
| P01 | Twin Laser Array | Weapon | Dual lasers replace main gun | +30% laser DMG | +60% DMG, beams widen |
| P02 | Orbital Cannon | Weapon | Satellite fires every 2s | Every 1.5s +DMG | Dual satellite, every 1s |
| P03 | Black Hole Grenade | Weapon | 1 grenade/8s pulls enemies | Every 6s, bigger | Every 4s, 50 DMG/s in vortex |
| P04 | Quantum Phase | Defense | On hit: 0.5s invincibility | 0.8s invincibility | 1.2s + speed burst after |
| P05 | Crit Cascade | Passive | Crits add +5% crit for next shot | +10% per crit | +15%, resets on miss |
| P06 | Dark Matter Core | Passive | +10 DMG, +0.5 Fire Rate | +20 DMG, +1.0 Rate | +35 DMG, +1.5 Rate |
| P07 | Pulsar Shield | Defense | Shield break: 20 DMG burst outward | 40 DMG burst | 80 DMG + stun |
| P08 | Warp Strike | Weapon | Every 10s: teleport to enemy, 100 DMG | Every 7s, 150 DMG | Every 5s, 200 DMG + stun all |
| P09 | Vampire Core | Passive | Life Steal +0.15, kill streak +1 HP if streak ≥ 10 | +0.20 LS, streak ≥ 8 | +0.30 LS, streak ≥ 5 |

> P09 Vampire Core is the signature life steal upgrade. Makes aggressive kill-streak playstyle self-sustaining.

---

### RED — Legendary

| ID | Name | Type | L1 | L2 | L3 |
|---|---|---|---|---|---|
| R01 | Event Horizon | Weapon | Permanent vortex pulls enemies | Bigger pull radius | Enemies in vortex: 50 DMG/s |
| R02 | Photon Devastator | Weapon | Screen-wide beam every 3s | Every 2.5s +50% DMG | Every 2s, full screen pierce |
| R03 | Undying Protocol | Defense | On death: revive 1 HP (once/run) | Revive 2 HP | Revive 3 HP + invincibility |
| R04 | Bullet Storm | Weapon | Every 12s: 3s of 10× fire rate | Every 10s | Every 8s + DMG boost during |
| R05 | Singularity Engine | Passive | All DMG ×1.5 | ×2.0 | ×2.5, crits deal ×3 total |
| R06 | Death Nova | Passive | Kill: 5% chance 80 DMG explosion | 10% chance, 120 DMG | 20% chance, 200 DMG chaining |

---

### GOLD — Cosmic (one-time, no levels, removed from pool after pick)

| ID | Name | Effect |
|---|---|---|
| Au01 | COSMIC REBIRTH | Reset HP and shield to full. Every stat +30%. |
| Au02 | SUPERNOVA FORM | 20s: invincible + 500% DMG. One time only. |
| Au03 | GOD MODE CORE | +5 Max HP, +5 Shield, ×2 all DMG, -50% Cooldown. |
| Au04 | GALACTIC ARSENAL | Unlock ALL weapon subsystems simultaneously at base level. |

---

## 8. Synergy System

Check for synergies after every upgrade pick. If both items in a pair are owned and synergy not yet activated, apply bonus and show banner.

| Combo | Synergy Name | Bonus |
|---|---|---|
| Dual Burner + Spread Cannon | Galaxy Spray | 9-shot spread fills screen width |
| Seeker Drone + Orbital Cannon | Swarm Protocol | Drone and cannon coordinate fire on same target |
| Plasma Burst + Black Hole Grenade | Singularity Pulse | Burst pulls in then explodes outward |
| Crit Cascade + Bullet Storm | Nova Strike | Crits guaranteed during storm, cascade resets after each |
| Quantum Phase + Warp Strike | Ghost Blade | Warp Strike triggers phase invincibility on arrival |
| Twin Laser + Dark Matter Core | Annihilator Beam | Lasers widen, +80% DMG, chain on kill |
| Death Nova + Event Horizon | Heat Death | Vortex kills cause nova chains |
| Nano Leech + Vampire Core | Blood Pact | Life steal doubled, every elite kill restores 1 full HP |
| Any RED + Any GOLD | Transcendence | +15% to all stats one-time bonus |

---

## 9. Upgrade Card UI

### Layout
- 3 cards stacked **vertically** as wide horizontal banners
- Card size: 920px wide × 260px tall, gap 25px between
- Total stack height: ~830px, centered vertically on screen
- "CHOOSE AN UPGRADE" header above cards (40px bold white, centered)
- Dark overlay: full screen black at 65% alpha, fades in 150ms
- Cards slide in from right with stagger (350ms tween, 100ms delay between, `Back.easeOut`)

### Card Layout (horizontal, left to right)
1. **Left zone (160px):** Large colored circle (radius 45px) with type letter (W/P/D/U/C) in white 42px bold
2. **Center zone:** Upgrade name (30px bold white), stat for current level (24px `#00FF88`), level dots (●●○ = Level 2, NEW if first time)
3. **Right zone (280px):** Description text (18px `#AAAAAA`, word-wrapped)
4. **Top strip:** Full-width rarity banner (28px tall, rarity color), rarity label in white bold

### Rarity Colors
| Rarity | Border | Banner |
|---|---|---|
| GREY | `#9E9E9E` | `#757575` |
| GREEN | `#4CAF50` | `#2E7D32` |
| BLUE | `#2196F3` | `#1565C0` |
| PURPLE | `#9C27B0` | `#6A1B9A` |
| RED | `#F44336` | `#B71C1C` |
| GOLD | `#FFC107` | `#F57F17` |

Gold cards: animated shimmer on border (alpha tween 0.6↔1.0, 600ms loop).

### Heal Card (injected when HP < max)
- 40% chance one of the 3 cards is a HEAL card when player HP < max HP
- Always GREY rarity visually
- Text: "❤️ EMERGENCY REPAIR — Restore 1 HP"
- On select: heals 1 HP, does NOT consume upgrade slot

### Card Interaction
- Hover: scale 1.04, border brightens
- Click/tap: selected card scales 1.12, others fade to 0, all destroyed
- Apply upgrade immediately, check synergies, check theme activation
- Grant 1s player invincibility
- Resume game

---

## 10. Scrapyard — Between-Wave Shop

After every wave (except the boss wave), show a **Scrapyard** screen for 8 seconds before the next wave begins. The player can spend accumulated credits on one consumable item. The screen auto-closes after 8 seconds if no purchase.

### Scrapyard UI
- Full screen dark panel slides up from bottom
- Header: "⚙️ SCRAPYARD — [credits] CREDITS"
- 3 items offered side by side (seeded draw from item table)
- Each item: icon, name, description, credit cost
- Player clicks to buy. Only one purchase per Scrapyard visit.
- Credits earned: 10 per grunt kill, 20 per zigzagger, 25 per diver, 40 per formation leader, 60 per elite, 80 per bomber

### Scrapyard Item Table

| Item | Cost | Effect | Notes |
|---|---|---|---|
| Shield Recharge | 40 | Restore all shield to full instantly | Always available |
| Ammo Dump | 60 | +50% fire rate for next full wave | Timed buff |
| Nuke | 80 | Immediately kill all enemies on screen | Dramatic AoE animation |
| HP Patch | 100 | Restore 1 HP | Only appears if HP < max |
| XP Surge | 50 | +100 XP immediately (may trigger level-up) | |
| Overclock Core | 120 | Permanently +0.3 Fire Rate | Permanent stat |
| Armour Plate | 120 | Permanently +1 Max Shield | Permanent stat |
| Damage Chip | 120 | Permanently +5 DMG | Permanent stat |

---

## 11. Ground Drop System

### Drop Table

| Drop | Visual | Base Chance | Effect |
|---|---|---|---|
| ❤️ Heart | Red pulsing orb 20px, `#FF4444` | 5% | Restore 1 HP. Skip if full HP, re-roll. |
| 🛡 Shield Charge | Cyan hexagon 16px, `#44FFFF` | 8% | +1 Shield immediately |
| 💣 Bomb | Orange glowing circle 18px, `#FF8800` | 5% | AoE 200 DMG in 180px on player contact |
| 🧲 Magnet | Blue spinning ring 16px, `#4488FF` | 4% | Pull ALL XP orbs to player instantly |
| ⚡ Boost | Yellow lightning 14px, `#FFFF00` | 6% | +50% fire rate for 8 seconds |
| 💀 Elite Shard | Purple crystal 14px, `#AA44FF` | 3% (elites only) | +1 to current kill streak, immunity 0.5s |

### Drop Rules
- Elite enemies: 2× all drop rates
- Bomber killed before detonating: guaranteed Bomb drop
- Boss AAX death: guaranteed Heart + Shield Charge + Bomb + large XP cluster
- Max 12 drops on screen simultaneously
- 10s lifetime per drop, fade out over final 2s
- Drops within 60px of player auto-slide toward them, collected at 40px

### Drop Visuals (required)
- All drops minimum 16px diameter with bright saturated colors
- Pulsing/spinning animation on all drops so they stand out
- Small label text above each drop in white 12px
- Magnetic attraction visual when close to player

---

## 12. Bomb Visual Drama (Critical)

When a Bomb drop is collected OR when a Bomber detonates, this sequence must play:

1. **0ms:** Freeze game speed to 20% for 300ms (Phaser `this.time.timeScale = 0.2`)
2. **0ms:** White flash full screen (Graphics rect, alpha 0.4, fades in 50ms)
3. **150ms:** Restore game speed to 100%
4. **150ms:** Large expanding ring graphic from explosion center (radius 0→180px over 400ms, stroke `#FF8800` 4px wide, alpha fades 1→0)
5. **150ms:** Camera shake intensity 0.012, duration 400ms
6. **150ms:** 16 orange/red particles burst outward from center, fade over 600ms
7. **150ms:** "BOOM!" floating text at explosion center (48px bold orange `#FF8800`, scale 0→1.5→1 over 300ms, then float up and fade over 400ms)
8. **150ms:** All enemies in 180px radius: brief knockback velocity away from center, orange tint flash
9. Apply damage to all enemies in radius using `playerDamage * 20` (base 200 at default damage)

---

## 13. XP & Orb System

### XP Values
| Enemy | XP |
|---|---|
| Grunt | 5 |
| Zigzagger | 12 |
| Diver | 15 |
| Formation Leader | 30 |
| Bomber | 20 |
| Any Elite | ×2.5 XP |
| AAX Boss | 500 |

### XP Thresholds Per Level
| Wave Range | XP Per Level |
|---|---|
| 1–3 | 35 |
| 4–6 | 55 |
| 7–9 | 80 |
| 10+ | 110 |

### XP Orb Visual (completely rework from current)
- Size: 14px diameter minimum
- Color: bright green `#00FF88` with white core
- Outer glow: semi-transparent circle behind it (radius 20px, alpha 0.25, same color)
- Spin animation: rotate 360° every 0.8s
- Spawn pop: scale 0→1.4→1 over 180ms
- When within magnet radius and moving toward player:
  - Draw thin line from orb to player (`#00FF88`, alpha 0.15)
  - Orb brightens to white
  - Small particle trail behind it (3 fading dots)

### Magnet Radius Indicator
- Permanent faint dashed circle around player showing magnet range
- Color: `#00FF88` at 12% alpha
- Pulses slightly (scale 1.0→1.05→1.0, 1.5s loop) when an orb enters range

---

## 14. Near Miss System (replaces Luck stat)

### Detection
Every frame, check each active enemy bullet. If a bullet passes within 30px of the player center without triggering a collision hit, fire a Near Miss event.

### Near Miss Event
1. "LUCKY!" text at player position: 28px bold gold `#FFC107`, scale 0→1.2→1 over 200ms, float up 30px and fade over 800ms
2. 6 golden star particles burst from near-miss point, fade over 400ms
3. `nearMissCount++`
4. **Dodge Meter charge:** Near misses charge a Dodge Meter (5 near misses = full charge)

### Dodge Meter
- Rendered as a small golden arc/bar beneath the player ship
- 5 segments, fills up with each near miss
- When full: auto-triggers a **Dodge Burst** — +60% speed for 1.5s + brief white glow on ship + "DODGE BURST!" text
- Resets to 0 after triggering
- Visual: arc segments glow gold as they fill, pulse when full

### Rarity Weight from Near Misses
- Every 3 near misses this run: +3 effective weight to GREEN+
- Accumulated, not reset: more near misses = progressively better rarity odds

---

## 15. Floating Combat Text

Spawn at event position, float upward 40px, fade over 900ms. Use Phaser tweens.

| Event | Text | Color | Size |
|---|---|---|---|
| Damage dealt | `[number]` | White `#FFFFFF` | 20px |
| Critical hit | `CRIT! [number]` | Orange `#FF8C00` | 26px bold |
| Near miss | `LUCKY!` | Gold `#FFC107` | 28px bold |
| Life steal heal | `+♥` | Green `#00FF88` | 20px |
| Kill streak milestone (10, 20, 30) | `🔥 x[N]!` | Orange/Red | 32px bold |
| Shield absorbed hit | `BLOCKED!` | Cyan `#44FFFF` | 22px |
| Shield break | `SHIELD DOWN!` | Red `#FF4444` | 28px bold |
| HP restored | `+1 HP` | Green `#00FF88` | 22px |
| Level up | `LEVEL UP!` | Cyan `#00FFFF` | 36px bold |
| Synergy unlocked | `SYNERGY: [name]` | Gold banner | 32px |
| Build theme | `BUILD: [name]` | Purple banner | 32px |
| Wave transition | `WAVE [N]` | White, top of screen | 40px bold |
| Bomb explosion | `BOOM!` | Orange `#FF8800` | 48px bold |
| Elite spawn warning | `⚠ ELITE` | Gold at spawn point | 24px |
| Boss phase | `PHASE [N]: [name]` | Full banner | 40px bold |

---

## 16. Wave-Dependent Backgrounds

When each new wave starts, call `ScrollingBackground.setTheme(waveNum)`.

| Waves | Zone | Base Tint | Layer Tint | Scroll Speed |
|---|---|---|---|---|
| 1–4 | Deep Space | `0x334466` | `0xFFFFFF` | 1.0 |
| 5–7 | Nebula Zone | `0x553344` | `0xFF8888` | 1.2 |
| 8–9 | Asteroid Belt | `0x223355` | `0x88BBFF` | 1.5 |
| 10 (boss) | Blood Sector | `0x440000` | `0xFF4444` | 0.8 |
| 11–14 | Meteor Storm | `0x112244` | `0x44FFAA` | 2.0 |
| 15 (boss) | Void Rift | `0x330033` | `0xFF44FF` | 0.6 |
| 16+ | Cycle: wave % 3 | — | — | — |

Transition: fade all layers to 0.3 alpha over 250ms → swap tints → fade back to 1.0 over 250ms.

---

## 17. HUD Stat Bar

Bottom of screen, `y = GAME.HEIGHT - 30`. Monospace font, `#00FF88`, 18px.

Display: `⚡[DMG] 🔥[RATE] 💨[SPD] 🛡[SHLD] ❤[HP] 💥[CRIT%] 🔵[PIERCE] 🔥[STREAK]`

- Shield: `playerShieldCurrent / playerShield` (e.g. `2/3`)
- HP: `playerCurrentHP / playerMaxHP`
- Crit: as percentage (e.g. `25%`)
- Streak: current kill streak count
- Updates live every frame

---

## 18. Weapon Subsystem Architecture

All weapons read player stats at fire time. Weapons that replace the main gun register themselves as `mainGunOverride`. Two bullet pools:
- `scene.playerBullets` (max 100): main gun, spread cannon, rear guard
- `scene.weaponManager.weaponBullets` (max 80): orbital, drone, specialty
- Both pools registered for enemy collision in `setupCollisions()`

### Weapons to Implement

| ID | Name | Implementation |
|---|---|---|
| MAIN | Main Gun | Fires at `aimAngle`, reads `playerSpread` and `playerFireRate`. Delegates to B01 if active. |
| B01 | Spread Cannon | Fan pattern around `aimAngle` (3/5/7 shots). Replaces main spread. |
| B02 | Rear Guard | Fires at `aimAngle + Math.PI` (opposite direction). Own timer 800/600/400ms. |
| B03 | Plasma Burst | Expanding ring via Graphics. AoE damage via `getEnemiesInRadius()`. |
| B04 | Seeker Drone | Homing bullet that steers toward nearest enemy each frame. |
| P01 | Twin Laser | Two continuous Graphics beams from player toward `aimAngle`. Damage tick 100ms. |
| P02 | Orbital Cannon | Satellite image orbits player at 120px radius. Fires at nearest enemy. |
| P03 | Black Hole | Vortex at enemy cluster center. Pulls enemy positions toward vortex each frame. |
| P08 | Warp Strike | Teleports player to nearest enemy cluster, AoE explosion. |
| R01 | Event Horizon | Permanent vortex at screen edge. Continuous pull + damage. |
| R02 | Photon Devastator | Full screen-width beam along `aimAngle`. All enemies in path take damage. |
| R04 | Bullet Storm | Mode override: sets `bulletStormActive` → Main Gun fires at 10× rate for 3s. |

### Orbital Cannon Visual Requirements
- Satellite scale: 0.15 (not 0.05)
- Orbit radius: 120px
- Satellite spins as it orbits
- Level 3: 2 satellites, brief trail/afterimage
- Flash at satellite position when firing

### Plasma Burst Visual Requirements
- Large visible expanding ring
- Camera shake on burst (intensity 0.003, 100ms)
- Brief white screen flash (alpha 0.08, 50ms)

---

## 19. AAX Boss — Build Acknowledgement

The boss phase announcement text should acknowledge the player's build if a theme is active:

```javascript
const themeLines = {
  LASER:    ["THOSE LASERS WON'T SAVE YOU", "NICE LASER SHOW. USELESS."],
  ORBITAL:  ["YOUR LITTLE SATELLITES? CUTE.", "ORBIT THIS."],
  CHAOS:    ["YOU LIKE CHAOS? ME TOO.", "LET'S SEE YOUR BLACK HOLES NOW."],
  SURVIVOR: ["YOU CAN'T DODGE FOREVER.", "SHIELDS WON'T HELP YOU."],
  STRIKER:  ["CRIT THIS.", "ALL THOSE CRITS. IMPRESSIVE. NOT ENOUGH."],
  BERSERKER:["STRONG. NOT STRONG ENOUGH.", "YOU HIT HARD. SO DO I."],
};
```

Pick one line randomly (seeded) from the active theme array and insert it into the phase announcement banner as a subtitle line. If no theme active, use default phase names.

---

## 20. Implementation Order

Implement in this exact sequence. Each chunk must be fully working before starting the next.

### Chunk A — Homing Enemies + Auto-Aim + Spawn Volume
Replace all enemy movement with homing. Spawn from 4 edges. Enforce min alive counts. Add auto-aim to player weapons. Seamless wave transitions.

**Test:** Instantly surrounded from all sides. Constant chaos. Game never pauses between waves.

### Chunk B — Kill Streak System
Track streak, apply fire rate bonus, show streak counter HUD. Reset on damage.

**Test:** Kill 10 grunts without taking damage. See "🔥 x10 ON FIRE" counter. Get hit. See "STREAK BROKEN."

### Chunk C — XP Orbs + Health Bars
Rework XP orb visuals. Add magnet pull visuals. Add health bar + shield bar. Remove old HP dots. Camera shake on damage.

**Test:** XP orbs clearly visible. Magnetic pull visible. Health bar reacts to damage with tween + shake.

### Chunk D — Ground Drops
Implement GroundDropManager. All 6 drop types with correct visuals. Bomb drama sequence.

**Test:** Kill many enemies. Drops rain down. Touch a bomb. BOOM sequence plays. Hearts restore HP.

### Chunk E — Near Miss + Dodge Meter
Detect near misses. LUCKY popup. Dodge meter fills. Triggers Dodge Burst at 5 misses.

**Test:** Let bullets barely miss. LUCKY popups appear. Meter fills. Speed burst triggers at 5.

### Chunk F — Upgrade System
Full upgrade catalogue. Rarity weight scaling by level. Card UI vertical layout. Theme bias. Heal card injection. Synergy system.

**Test:** Level up several times. Cards appear vertical. Pick Twin Laser → BUILD: LASER banner → future draws skewed to laser upgrades.

### Chunk G — Scrapyard
Between-wave shop. Credit system. 3 buyable items per wave. Permanent stat items available.

**Test:** After Wave 1 ends, Scrapyard slides up. Credits visible. Can purchase one item. Auto-closes after 8s.

### Chunk H — Life Steal + Vampire Core
Implement `playerLifeSteal` stat. Wire damage dealt tracking. HP restore at 100 DMG thresholds. Nano Leech and Vampire Core upgrades.

**Test:** Pick Nano Leech. Kill many enemies. Notice HP slowly restoring. Pick Vampire Core. Kill streak + life steal = near unkillable.

### Chunk I — Elite Enemies + Bomber
Elite spawn system (8% chance, seeded). Entry flash callout. Crown visual. Bomber homing + telegraph + detonation.

**Test:** Elite spawns with golden ring warning. Bomber approaches, pulses, detonates with AoE. Killing bomber before detonation drops a bomb.

### Chunk J — Background Zones + Floating Text + AAX Taunts
Wave-dependent background themes. Full floating text system. Boss taunts acknowledging player build.

**Test:** Wave 5 shifts background to nebula red. CRIT! numbers appear on crits. AAX says something about your lasers.

---

## 21. What NOT to Change

- Seeded RNG system — all randomness must use existing seed. Same seed = same run for everyone on that day.
- AAX Boss four-phase structure, sprite expressions, eye lasers, mouth attacks
- Wave 10 boss trigger
- FiGGYZ Arena scoring and leaderboard systems
- Collision system architecture (extend, don't replace)

---

*Star Assault · FiGGYZ Daily Arena · Full Gameplay Expansion PRD v4.0*
