# Star Assault — Gameplay Rework PRD v3.0
**For:** Pilot Implementation | **Supersedes:** upgrade-prd.md sections on enemy behaviour, XP, HUD, and Luck

---

## Overview

The core gameplay loop needs to shift from a traditional vertical shooter (enemies fly in formation, player dodges) to a **Vampire Survivors / Death Must Die style horde survival** game. Enemies constantly home in on the player from all directions. The player auto-aims at the nearest enemy. The screen is always full of enemies. Pickups rain from kills. The player is always levelling up, always choosing, always building a stronger loadout. This document defines every change required.

---

## 1. Enemy Behaviour — Homing Overhaul

### Core Change: All Enemies Chase the Player
Remove all fixed flight paths, formation patterns, and downward-only movement. Every enemy type must constantly steer toward the player's current position.

**Homing implementation for all enemy types:**
```
Each frame:
  angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
  enemy.vx = Math.cos(angle) * enemy.speed
  enemy.vy = Math.sin(angle) * enemy.speed
  enemy.body.setVelocity(enemy.vx, enemy.vy)
```

**Per enemy type speeds (px/s):**
| Enemy | Speed | Notes |
|---|---|---|
| Grunt | 90 | Slow, pure homing |
| Zigzagger | 110 | Homing + sine wave offset on top |
| Diver | 200 | Fast direct charge, brief pause then lunge |
| Formation Leader | 70 | Slow, drifts toward player, fires a lot |

**Spawn from all edges:**
Enemies now spawn from ALL 4 screen edges (top, bottom, left, right), not just the top. Spawn position: random point along each edge, outside the screen by 60px.

**Spawn volume — dramatically increase:**
- Wave 1: 3 enemies always alive simultaneously, spawn 1 new every 3s
- Wave 2: 5 alive simultaneously, spawn 1 every 2.5s
- Wave 3: 8 alive simultaneously, spawn 1 every 2s
- Wave 4: 12 alive simultaneously, spawn 1 every 1.5s
- Wave 5+: 15+ alive simultaneously, spawn 1 every 1s
- Pre-boss wave: constant barrage of 20 simultaneously
- Between waves: NO PAUSE. Enemies keep spawning. Waves just change composition and difficulty.

**Key rule: There is never a quiet moment.** If the alive count drops below the wave minimum, immediately spawn replacements. The player should always be surrounded.

### Auto-Aim
The player's ship auto-rotates to face the nearest living enemy. All weapons fire toward the nearest enemy rather than straight up. If no enemy is alive, fire straight up (default).

```
nearestEnemy = find enemy with minimum distance to player
aimAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x)
// Adjust by -90° so "up" = angle 0 for sprite orientation
```

This makes Rear Guard, Spread Cannon etc. all make sense spatially — they fire away from the nearest threat, covering flanks.

---

## 2. Ground Drop System

Enemies now drop items on death. There are 4 types of ground drops in addition to XP orbs.

### Drop Table
| Drop | Visual | Drop Rate | Effect | Duration |
|---|---|---|---|---|
| ❤️ Heart | Red pulsing orb, 20px | 8% per kill | Restore 1 HP (up to max) | Permanent until picked up (10s timeout) |
| 💣 Bomb | Orange glowing circle, 18px | 5% per kill | Instant AoE: 200 DMG to all enemies within 180px | Explodes on player contact |
| 🧲 Magnet | Blue spinning ring, 16px | 4% per kill | Pull ALL XP orbs on screen to player instantly | Instant on pickup |
| 🛡 Shield Orb | Cyan hexagon, 16px | 3% per kill | +1 Shield charge immediately | Instant on pickup |
| ⚡ Boost | Yellow lightning, 14px | 6% per kill | +50% fire rate for 8 seconds | Timed buff |

**Drop rules:**
- Elite enemies (Formation Leaders, Divers): 2× drop rate
- Boss AAX: guaranteed 1 Heart + 1 Bomb + large XP on death
- Drops have a 10 second lifetime before disappearing (fade out over last 2s)
- Heart drops do NOT spawn if player is at full HP (re-roll for another drop type)
- Multiple drops can exist on screen simultaneously (max 12 at once)

### Drop Visual Requirements
- All drops must be clearly visible — minimum 16px diameter, bright saturated colors
- Pulsing/spinning animation on all drops so they stand out from the background
- Small label text above each drop (❤️ HEAL, 💣 BOMB etc.) in white, 12px
- Magnetic attraction: drops within 60px of player auto-slide toward player

---

## 3. XP Orb Visual Rework

The current XP orbs are invisible. Rework entirely:

**New XP orb visual:**
- Size: 14px diameter minimum (was too small)
- Color: bright green `#00FF88` with a white core
- Glow effect: use a Phaser PointLight or a larger semi-transparent circle behind it (radius 20px, alpha 0.3)
- Spin animation: rotate 360° every 0.8s
- Spawn animation: orb pops out with scale 0→1.5→1 over 200ms (feels juicy)

**Magnet visual feedback (critical missing feature):**
When an XP orb is within the player's magnet radius and starts moving toward the player:
- Draw a thin line from the orb to the player (`#00FF88`, alpha 0.2)  
- Orb brightens to full white as it accelerates
- Small particle trail behind orb as it moves
- Play a soft "whoosh" tone (if audio system exists)

**Magnet radius indicator:**
- Draw a faint dashed circle around the player showing the magnet radius
- Color: `#00FF88` at 15% alpha — just barely visible so player understands the mechanic
- Circle pulses slightly when an orb enters range

---

## 4. Luck — Rework to "Near Miss" System

Remove Luck as an abstract stat. Replace with a tangible **Near Miss** system:

**How it works:**
- When a bullet or enemy barely misses the player (passes within 30px but doesn't hit), trigger a **Near Miss** event
- Display a golden "LUCKY!" text popup at the player's position (scale in, fade out, 800ms)
- A small golden star burst particle effect at the near-miss point
- Each Near Miss in a run increments a `nearMissCount` counter
- Near Miss counter feeds into rarity weights: every 3 near misses = +5 effective weight to GREEN+

**Visual clarity:**
- The "LUCKY!" popup must be large enough to read (28px, bold gold `#FFC107`)
- The star burst: 6 small golden particles radiating outward over 400ms
- Near miss detection: check bullet positions each frame — if an enemy bullet passes through the 30px danger zone without collision, trigger the event

**Remove** the `playerLuck` stat from the HUD entirely. Replace the Luck HUD slot with `MISS` showing the near miss count for the run.

---

## 5. Progressive Rarity Scaling by Player Level

The deeper you go, the better the rewards. Rarity weights shift as the player levels up:

```
For each player level above 3:
  levelBonus = (playerLevel - 3)
  effectiveWeights:
    GREY:   max(10, 100 - levelBonus * 8)      // Shrinks, minimum 10
    GREEN:  min(80, 50 + levelBonus * 3)        // Grows slightly
    BLUE:   min(60, 20 + levelBonus * 4)        // Grows steadily
    PURPLE: min(40, 8 + levelBonus * 3)         // Grows meaningfully
    RED:    min(20, 3 + levelBonus * 1.5)       // Grows slowly
    GOLD:   min(8, 1 + levelBonus * 0.5)        // Grows very slowly
```

At player Level 10+, you should feel like you're getting Blues and Purples regularly. Greys should feel rare. This rewards staying alive and levelling up.

Also apply wave-based bonus on top:
- Wave 5+: all non-Grey weights ×1.2
- Wave 8+: all non-Grey weights ×1.5
- Boss wave: all non-Grey weights ×2.0

---

## 6. Health System Visual Rework

### Health Bar (Critical — currently invisible)
Replace the HP number display with a proper visual health bar:

**Placement:** Top-left of screen, y=20, x=20

**Design:**
- Background bar: dark grey `#333333`, 200px wide × 18px tall, rounded corners 4px
- HP fill: gradient from `#00FF00` (full) → `#FFFF00` (50%) → `#FF0000` (20%) using Phaser's `fillGradientStyle` or segment coloring
- White border: 1px around the bar
- ❤️ icon to the left of the bar (20px)
- Text overlay on bar: "3 / 3" in white bold 14px, centered on bar

**On damage:**
- Bar fill tweens down over 300ms (not instant)
- Bar flashes red briefly (tint `#FF0000` for 150ms)
- Screen edge vignette flashes red for 200ms (semi-transparent red border around screen)
- Camera shake: intensity 0.005, duration 200ms

**On heal:**
- Bar fill tweens up over 400ms
- Green particles burst upward from the bar
- "+1 HP" floating text appears above bar in green

**When low HP (≤ 1 HP):**
- Bar pulses red continuously (alpha tween 0.6↔1.0, 500ms loop)
- Subtle red vignette permanently on screen edges
- Heartbeat sound if audio system exists

**On stat upgrade increasing max HP:**
- Bar extends width slightly (e.g. each +1 max HP = +20px wider)
- "+1 MAX HP" floats above bar in bright green
- All extra HP shown as additional empty segments to the right

### Shield Display
Display shield charges as small cyan hexagonal icons to the right of the health bar, one per shield charge. When a shield absorbs a hit, one icon shatters with a particle burst.

---

## 7. Heal as a Card Option

Every level-up card draw must include **HEAL** as a possible option when the player is below max HP.

**Rules:**
- If player HP < max HP: 40% chance one of the 3 cards is a HEAL card
- HEAL card is always GREY rarity visually (common — it's a tactical choice not a power spike)
- HEAL card text: "❤️ EMERGENCY REPAIR — Restore 1 HP"
- If player is at full HP: HEAL card never appears (all 3 are real upgrades)
- HEAL card does NOT consume a level slot — it's a free choice that just heals

---

## 8. Wave Flow — No More Waiting

**Remove all inter-wave pause screens** during active gameplay. The wave system should work as follows:

- Waves transition seamlessly — enemies of the next wave type start spawning as the previous wave winds down
- "WAVE 3" announcement text appears at the top of the screen for 2 seconds then fades — game never stops
- The "waves cleared" pause/summary screen only appears before the Boss wave
- Between all other waves: continuous action

**Wave composition (updated for homing enemies):**
| Wave | Composition | Min Alive | Spawn Rate |
|---|---|---|---|
| 1 | Grunts only | 3 | 1 per 3s |
| 2 | Grunts + Zigzaggers | 5 | 1 per 2.5s |
| 3 | Grunts + Zigzaggers + Divers | 8 | 1 per 2s |
| 4 | All types + Formation Leaders | 12 | 1 per 1.5s |
| 5 | Heavy mix, Formation Leaders in pairs | 14 | 1 per 1.2s |
| 6 | Double spawn rate of everything | 16 | 1 per 1s |
| 7 | Divers swarm + Formation Leaders | 18 | 1 per 0.8s |
| 8 | Everything, Formation Leaders fire more | 20 | 1 per 0.8s |
| 9 | Pre-boss barrage | 20 | 1 per 0.6s |
| 10 | AAX Boss spawns + continuous grunt harassment | — | — |

---

## 9. Floating Combat Text

All significant events should show floating text to make the game feel responsive:

| Event | Text | Color | Size |
|---|---|---|---|
| Damage dealt | The damage number | White | 20px |
| Critical hit | "CRIT! [damage]" | Orange `#FF8C00` | 26px bold |
| Near miss | "LUCKY!" | Gold `#FFC107` | 28px bold |
| Synergy unlocked | "SYNERGY: [name]" | Gold, full width banner | 32px |
| Level up | "LEVEL UP!" | Cyan `#00FFFF` | 36px bold |
| Enemy killed by bomb | "BOOM!" | Orange | 24px |
| Shield absorbed hit | "BLOCKED!" | Cyan | 22px |
| HP restored | "+1 HP" | Green `#00FF88` | 22px |
| Phase transition (boss) | "PHASE [N]: [name]" | Full banner | 40px bold |

All floating text: spawn at event position, float upward 40px, fade out over 1000ms. Use Phaser tweens.

---

## 10. Implementation Priority Order

Implement in this exact order — each chunk must be working before the next:

### Chunk A — Enemy Homing & Spawn Volume (Do First)
1. Replace all enemy movement with homing toward player
2. Spawn from all 4 edges
3. Implement minimum-alive enforcement
4. Remove inter-wave pauses (seamless waves)
5. Add auto-aim to player weapon

**Test:** Run the game. You should be immediately surrounded by enemies from all sides. It should feel chaotic and constant.

### Chunk B — XP Orb Visuals & Magnet Feel
1. Enlarge XP orbs to 14px minimum
2. Add glow and spin animation
3. Add magnetic pull visual (line + particle trail)
4. Add faint magnet radius circle around player

**Test:** Kill enemies. XP orbs should be clearly visible and visibly sucked toward you within the magnet radius.

### Chunk C — Health Bar
1. Implement visual health bar top-left
2. Damage tween + red flash + camera shake
3. Heal tween + green particles
4. Low HP pulse
5. Shield icon display

**Test:** Take damage. It should feel impactful. Heal. The bar should feel responsive.

### Chunk D — Ground Drops
1. Implement drop table (Heart, Bomb, Magnet, Shield Orb, Boost)
2. Drop visuals (pulsing, labeled, clearly visible)
3. Bomb AoE explosion on player contact
4. Magnet instant-pull effect
5. 10-second timeout with fade

**Test:** Kill a lot of enemies. Hearts, bombs, and other drops should rain on the battlefield. Touching a bomb should visually destroy nearby enemies.

### Chunk E — Near Miss System (replaces Luck)
1. Detect near-miss events (enemy bullets passing within 30px)
2. "LUCKY!" popup + star burst particles
3. nearMissCount → weight modifier

### Chunk F — Progressive Rarity & Heal Card
1. Level-based weight scaling formula
2. Wave-based bonus multipliers
3. HEAL card injection into level-up draw when HP < max

### Chunk G — Floating Combat Text
1. Implement floating text system (reuse or create)
2. Wire all events: damage numbers, CRIT, LUCKY, LEVEL UP, BLOCKED, +1 HP

---

## 11. What NOT to Change

- Seeded RNG system — keep entirely intact
- AAX Boss fight — keep all 4 phases, expressions, attacks
- Wave 10 boss trigger
- Existing upgrade catalogue and card UI (from upgrade-prd.md)
- Scoring system
- FiGGYZ Arena integration

---

*Star Assault · FiGGYZ Daily Arena · Gameplay Rework PRD v3.0*
