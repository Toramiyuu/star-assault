# Star Assault — Roguelite Upgrade System PRD
**Version:** 2.0 | **Project:** FiGGYZ Daily Arena Week 1 | **For:** Pilot Implementation

---

## Overview

Implement a Vampire Survivors / Death Must Die style roguelite upgrade system into Star Assault. Enemies drop XP orbs on death. The player fills an XP bar. On level-up, the game pauses and the player is presented with **3 upgrade cards** to choose from. Each upgrade belongs to one of 6 rarity tiers. Picking the same upgrade again levels it up (max Level 3). The entire system must use the existing seeded RNG (`this.scene.rng` or however it is currently threaded) so every player gets identical upgrade draws on the same daily seed.

---

## 1. XP & Level-Up System

- Every enemy drops an XP orb on death. Orbs float toward the player within the Magnet radius.
- XP required per level:
  - Waves 1–3: 80 XP per level
  - Waves 4–6: 120 XP per level
  - Waves 7–9: 180 XP per level
  - Boss wave: 250 XP per level
- XP per enemy type:
  - Grunt: 5 XP
  - Zigzagger: 8 XP
  - Diver: 10 XP
  - Formation Leader: 20 XP
  - AAX Boss: 500 XP (on death)
- On level-up: pause the game, show upgrade card UI, player picks one card, game resumes with 1 second of invincibility.

---

## 2. Player Stats

Track all of the following as **plain scene variables** (not Phaser object properties):

| Variable | Default | Description |
|---|---|---|
| `playerDamage` | 10 | Base damage per bullet |
| `playerFireRate` | 1.0 | Shots per second |
| `playerSpeed` | 300 | Movement speed (px/s) |
| `playerShield` | 0 | Hits absorbed before HP damage |
| `playerMaxHP` | 3 | Maximum hit points |
| `playerLuck` | 0 | Shifts rarity weights toward higher tiers |
| `playerMagnet` | 80 | XP orb pickup radius (px) |
| `playerCrit` | 0.05 | Crit chance (0.0–1.0) |
| `playerPierce` | 0 | Enemies bullets pass through |
| `playerSpread` | 1 | Number of simultaneous shots |
| `playerCooldown` | 0 | Cooldown reduction (0.0 = 0%, 0.5 = 50% faster) |
| `playerBlastArea` | 1.0 | AoE radius multiplier |

All weapons and bullets must read from these variables each frame so stat changes take immediate effect.

---

## 3. HUD Stat Bar

Render a compact stat strip permanently at the very bottom of the screen (below the play area, above the safe zone). Show:

```
⚡DMG  🔥RATE  💨SPD  🛡SHLD  ❤HP  🍀LUCK  💥CRIT  🔵PIER  ↗SPRD
```

- Use small monospace font, color `#00FF88` (space green)
- Numbers update live whenever a stat changes
- Shield displays as current shield remaining / max shield (e.g. `2/3`)

---

## 4. Rarity System & Roll Weights

Six rarity tiers. Each tier has a base weight used in the weighted random draw.

| Rarity | Color | Hex | Base Weight | Approx Chance |
|---|---|---|---|---|
| GREY | Common | `#9E9E9E` | 100 | ~55% |
| GREEN | Uncommon | `#4CAF50` | 50 | ~25% |
| BLUE | Rare | `#2196F3` | 20 | ~11% |
| PURPLE | Epic | `#9C27B0` | 8 | ~4% |
| RED | Legendary | `#F44336` | 3 | ~1.5% |
| GOLD | Cosmic | `#FFC107` | 1 | ~0.3% |

**Luck modifier:** For each point of `playerLuck`, apply these bonuses to effective weights:
- Green weight += `playerLuck * 0.5`
- Blue weight += `playerLuck * 0.2`
- Purple weight += `playerLuck * 0.1`
- Red weight += `playerLuck * 0.03`
- Gold weight += `playerLuck * 0.01`

**Restrictions:**
- RED upgrades cannot appear before Wave 3
- GOLD upgrades cannot appear before Wave 5
- The same upgrade cannot appear more than once in the same 3-card draw
- An upgrade already at Level 3 (max) is removed from the pool entirely

**Draw algorithm:**
1. Build the eligible pool (all upgrades not yet at max level, respecting wave restrictions)
2. Calculate total weight
3. Use seeded RNG to draw 3 unique upgrades weighted by their rarity
4. If a drawn upgrade is already owned by the player, mark it as "UPGRADE" (level up) on the card

---

## 5. Full Upgrade Catalogue

Each upgrade has 3 levels. Picking an upgrade you already own levels it up. Max level is 3.

### GREY — Common

| ID | Name | Type | Level 1 | Level 2 | Level 3 | Description |
|---|---|---|---|---|---|---|
| G01 | Thruster Tweak | Passive | +8% Speed | +16% Speed | +25% Speed | Minor engine calibration. Dodge bullets just a bit easier. |
| G02 | Targeting Lens | Passive | +1 DMG | +2 DMG | +4 DMG | Polished optics. Your shots land a little harder. |
| G03 | Reactor Tick | Passive | -5% Cooldown | -10% Cooldown | -15% Cooldown | Small reactor tweak lets weapons recycle slightly faster. |
| G04 | Gravity Coil | Passive | +20px Magnet | +40px Magnet | +60px Magnet | Increased magnetic field pulls XP orbs from further away. |
| G05 | Hull Patch | Utility | Restore 1 HP | Restore 1 HP | Restore 1 HP | Quick field repair. Each pick restores 1 HP up to current max. |
| G06 | Lucky Charm | Passive | +2 Luck | +4 Luck | +7 Luck | Slightly weights the roll pool toward higher rarities. |

### GREEN — Uncommon

| ID | Name | Type | Level 1 | Level 2 | Level 3 | Description |
|---|---|---|---|---|---|---|
| Gn01 | Dual Burner | Weapon Mod | +1 Spread (2 shots) | +1 Spread (3 shots) | +1 Spread (4 shots) | Side nozzles fire additional parallel shots. |
| Gn02 | Overcharged Cell | Passive | +3 DMG | +6 DMG | +10 DMG | Hotter plasma, more kinetic force per round. |
| Gn03 | Combat Stims | Passive | +0.2 Fire Rate | +0.4 Fire Rate | +0.6 Fire Rate | Neural combat protocols increase trigger response. |
| Gn04 | Micro Shield | Defense | +1 Shield | +2 Shield | +3 Shield | Small energy barrier absorbs hits before hull damage. |
| Gn05 | Lucky Stars | Passive | +5% Crit | +10% Crit | +15% Crit | Random targeting glitches somehow result in critical strikes. |
| Gn06 | Ion Refractor | Weapon Mod | +1 Pierce | +2 Pierce | +3 Pierce | Shots now punch through one enemy to hit the next. |
| Gn07 | Warp Boosters | Passive | +15% Speed | +25% Speed | +40% Speed | Experimental engine pods. You feel the difference immediately. |
| Gn08 | Max HP Upgrade | Defense | +1 Max HP | +2 Max HP | +3 Max HP | Reinforced life support. Also heals 1 HP on pickup. |

### BLUE — Rare

| ID | Name | Type | Level 1 | Level 2 | Level 3 | Description |
|---|---|---|---|---|---|---|
| B01 | Spread Cannon | Weapon | 3-shot spread at -10°/0°/+10° | 5-shot spread | 7-shot spread +15% DMG | Replaces single shot with a fanning spread of bolts. |
| B02 | Rear Guard | Weapon | 1 shot backward | 2 shots backward | 3 shots backward +DMG | Auto-turret fires behind you. No more running from Divers. |
| B03 | Plasma Burst | Weapon | AoE burst every 4s | Every 3s | Every 2s +50% radius | Periodic expanding plasma ring damages all nearby enemies. |
| B04 | Seeker Drone | Weapon | 1 homing missile per 5s | 1 per 3s | 2 per 3s | Deploys a mini-drone that targets the nearest enemy. |
| B05 | Chrono Capacitor | Passive | -20% Cooldown | -35% Cooldown | -50% Cooldown | Quantum timing chip. Everything fires faster. |
| B06 | Void Shield | Defense | +2 Shield, recharge 8s | +3 Shield, recharge 6s | +4 Shield, recharge 4s | Void-energy barrier. Recharges mid-wave, not just between waves. |
| B07 | Nebula Rounds | Weapon Mod | Shots leave 1s damage cloud | 2s cloud | 3s cloud +DMG | Bullets leave toxic nebula clouds that deal tick damage. |
| B08 | Targeting AI | Passive | +20% Crit, +5 DMG on crit | +30% Crit, +10 DMG on crit | +40% Crit, +15 DMG on crit | AI-assisted targeting drastically increases precision strikes. |

### PURPLE — Epic

| ID | Name | Type | Level 1 | Level 2 | Level 3 | Description |
|---|---|---|---|---|---|---|
| P01 | Twin Laser Array | Weapon | Dual permanent lasers replace cannon | +30% laser DMG | +60% DMG, beams widen | Replaces your cannon with two continuous laser beams. |
| P02 | Orbital Cannon | Weapon | Rotating satellite fires every 2s | Every 1.5s +DMG | Dual satellite, every 1s | A weapons satellite orbits you, firing independently. |
| P03 | Black Hole Grenade | Weapon | 1 grenade per 8s, pulls enemies | Every 6s, bigger pull | Every 4s, enemies take 50 DMG/s in vortex | Creates a micro black hole that drags enemies toward center. |
| P04 | Quantum Phase | Defense | On hit: 0.5s invincibility | 0.8s invincibility | 1.2s invincibility + speed burst after | Ship briefly phases out of realspace when hit. Built-in parry. |
| P05 | Crit Cascade | Passive | Crits add +5% crit chance for next shot | +10% per crit | +15% per crit, chain resets on miss | Critical hits feed a momentum chain. Land enough and every shot crits. |
| P06 | Dark Matter Core | Passive | +10 DMG, +0.5 Fire Rate | +20 DMG, +1.0 Fire Rate | +35 DMG, +1.5 Fire Rate | Unstable dark matter power source. Raw performance upgrade. |
| P07 | Pulsar Shield | Defense | Shield break releases 20 DMG burst | 40 DMG burst | 80 DMG burst + stun | When shield breaks, releases a damaging energy pulse outward. |
| P08 | Warp Strike | Weapon | Every 10s: teleport to enemy, 100 DMG | Every 7s, 150 DMG | Every 5s, 200 DMG + stun all nearby | You blink to the nearest enemy cluster and detonate. |

### RED — Legendary

| ID | Name | Type | Level 1 | Level 2 | Level 3 | Description |
|---|---|---|---|---|---|---|
| R01 | Event Horizon | Weapon | Permanent black hole on screen edge pulls enemies | Bigger pull radius | Enemies in vortex take 50 DMG/s | A permanent gravitational anomaly warps the battlefield. |
| R02 | Photon Devastator | Weapon | Screen-wide beam every 3s replaces cannon | Every 2.5s +50% DMG | Every 2s, pierces full screen | Screen-wide beam fires periodically. Nothing survives it. |
| R03 | Undying Protocol | Defense | On death: revive with 1 HP (once per run) | Revive with 2 HP | Revive with 3 HP + brief invincibility | Emergency resurrection software. One get-out-of-death-free card. |
| R04 | Bullet Storm | Weapon | Every 12s: 3s of 10× fire rate | Every 10s | Every 8s + damage boost during storm | Systems briefly overload. Absolute carnage for 3 seconds. |
| R05 | Singularity Engine | Passive | All DMG stats ×1.5 | ×2.0 | ×2.5, crits deal ×3 total | Rewires your ship's power matrix. Everything hits harder. |
| R06 | Death Nova | Passive | On kill: 5% chance 80 DMG explosion | 10% chance, 120 DMG | 20% chance, 200 DMG, chaining | Enemies randomly detonate on death, chaining into nearby foes. |

### GOLD — Cosmic

| ID | Name | Type | Effect | Description |
|---|---|---|---|---|
| Au01 | COSMIC REBIRTH | Cosmic | Reset HP to full. Every stat +30%. | The universe resets your ship to peak condition. One time. |
| Au02 | SUPERNOVA FORM | Cosmic | For 20s: invincible + 500% DMG. Never offered again. | You become a star for 20 seconds. Save it for AAX. |
| Au03 | GOD MODE CORE | Cosmic | +5 Max HP, +5 Shield, ×2 all DMG, -50% Cooldown. | Pure cosmic energy reforges your entire ship. The complete package. |
| Au04 | GALACTIC ARSENAL | Cosmic | Unlock ALL weapons simultaneously at base level. | Every weapon system activates at once. Beautiful chaos. |

> **Note:** GOLD upgrades have no Level 2 or 3. They are unique one-time picks. Once taken, they are removed from the pool permanently.

---

## 6. Synergy System

After every upgrade pick, check whether the player now owns both items in any synergy pair. If yes, display a `SYNERGY UNLOCKED: [Name]` banner for 2 seconds and apply the bonus. Synergy bonuses stack on top of the individual upgrades — they do not replace them.

| Combo | Synergy Name | Bonus Effect |
|---|---|---|
| Dual Burner + Spread Cannon | Galaxy Spray | 9-shot spread fills the entire screen width |
| Seeker Drone + Orbital Cannon | Swarm Protocol | Drones and cannon fire in coordinated bursts, targeting same enemy |
| Plasma Burst + Black Hole Grenade | Singularity Pulse | Burst pulls enemies inward then explodes them outward |
| Crit Cascade + Bullet Storm | Nova Strike | During storm, crits guaranteed and cascade resets after each crit |
| Quantum Phase + Warp Strike | Ghost Blade | Warp Strike triggers phase invincibility on arrival |
| Twin Laser Array + Dark Matter Core | Annihilator Beam | Lasers widen, gain 80% bonus DMG, beams chain on kill |
| Death Nova + Event Horizon | Heat Death | Black hole kills cause nova chains — cascade wipes entire waves |
| Any RED + Any GOLD | Transcendence | +15% to all stats as a one-time bonus on acquisition |

---

## 7. Upgrade Card UI

### Layout
- 3 cards displayed horizontally, centered on screen
- Card size: 260px wide × 360px tall
- Cards staggered bounce-in with 80ms delay between each (tween from y+100, scale 0 → 1, ease: Back.Out)
- Dark overlay behind cards: full screen, black at 65% alpha, fades in over 150ms
- Game is paused during card selection

### Card Design
Each card contains (top to bottom):
1. **Rarity banner** — full width strip at top, colored by rarity, showing rarity label (e.g. "⭐ RARE") in white bold
2. **Upgrade name** — large bold white text, centered
3. **Type badge** — small pill/tag below name (e.g. "WEAPON", "PASSIVE", "DEFENSE")
4. **Level indicator** — if the player already owns this upgrade, show current level dots: `●●○` = Level 2, upgrading to 3. If new, show `NEW`
5. **Stats text** — the stat change for the level being applied (e.g. "+3 DMG" or "3-shot spread")
6. **Description** — small body text at bottom describing the upgrade flavor

### Card Colors by Rarity
| Rarity | Border Color | Banner Color |
|---|---|---|
| GREY | `#9E9E9E` | `#757575` |
| GREEN | `#4CAF50` | `#2E7D32` |
| BLUE | `#2196F3` | `#1565C0` |
| PURPLE | `#9C27B0` | `#6A1B9A` |
| RED | `#F44336` | `#B71C1C` |
| GOLD | `#FFC107` | `#F57F17` |

Gold cards additionally have an animated shimmer/pulse on the border (use a Phaser tween on alpha between 0.6 and 1.0, looping, 600ms).

### Card Interaction
- On hover/pointer over: card scales to 1.05, border brightens
- On click/tap: selected card scales to 1.15 briefly, others fade to 0 alpha, then all cards are destroyed
- Apply the upgrade stat changes immediately on selection
- Fire synergy check after applying
- Grant 1 second of player invincibility
- Resume game

---

## 8. Weapon System Architecture

When a weapon-type upgrade is selected, instantiate it as a subsystem on the player. Each weapon subsystem has its own fire timer and operates independently. All weapon subsystems must read `playerDamage`, `playerCrit`, `playerPierce`, and `playerCooldown` on each fire event so stat upgrades apply globally.

Weapon subsystems to implement:
- **Main Gun** (always active) — fires based on `playerSpread` and `playerFireRate`
- **Spread Cannon** (replaces Main Gun spread behavior when acquired) — fan pattern
- **Rear Guard** — backward-firing turret, independent timer
- **Plasma Burst** — AoE ring, independent timer
- **Seeker Drone** — homing missile, independent timer
- **Twin Laser Array** — replaces Main Gun with dual lasers when acquired
- **Orbital Cannon** — orbiting satellite GameObject, fires on its own timer
- **Black Hole Grenade** — spawns a pulling vortex on timer
- **Warp Strike** — teleport + explosion on timer
- **Photon Devastator** — screen-wide beam on timer (replaces Main Gun when acquired)
- **Bullet Storm** — mode that temporarily overrides fire rate to 10×
- **Event Horizon** — permanent vortex object placed at screen edge

---

## 9. Implementation Notes

- Use seeded RNG for all upgrade draws: same seed = same pool every time for fair Arena competition
- All stat variables are plain numbers on the scene, not Phaser object properties
- Shield: track `playerShieldCurrent` (current remaining) and `playerShield` (max). Damage hits shield first. Shield recharges to max between waves and also mid-wave per the Void Shield upgrade timer
- Crit: on any bullet fire, roll `Math.random()` (or seeded equivalent) against `playerCrit`. On crit, apply `×2` damage multiplier (modified further by Targeting AI and Singularity Engine)
- Hull Patch (G05) is the only upgrade that doesn't change permanently — it just heals 1 HP on pick. It resets level after each pick (always shows as "new") so it can be offered and picked repeatedly
- GOLD upgrades: Au01 (Cosmic Rebirth) and Au02 (Supernova Form) are consumed on use and never offered again in that run
- Synergy banner: render as a full-width centered text overlay in gold, scale-in tween, auto-dismiss after 2s
- All XP orb pickup should respect `playerMagnet` radius. Orbs outside radius stay in place; orbs inside radius tween toward player at speed proportional to distance
- Preserve all existing seeded determinism, scoring, collision, and enemy systems
- Do not break the AAX boss battle or wave progression system

---

*Star Assault · FiGGYZ Daily Arena · Upgrade System PRD v2.0*
