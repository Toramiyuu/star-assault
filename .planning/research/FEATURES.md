# Features Research: Horde-Survivor UX Conventions

**Research area:** What UX features do polished horde-survivor games (Survivor.io, Vampire Survivors, Brotato, 20 Minutes Till Dawn) use?
**Milestone context:** Subsequent — improving existing game's UX to match Survivor.io polish level

---

## Table Stakes (Must Have — Users Leave Without These)

### XP Orb Visuals
- **Color contrast**: XP orbs must be immediately distinguishable from background. Survivor.io uses bright yellow/gold. Vampire Survivors uses green but with high-contrast glow. Key: the color must NOT appear in backgrounds.
- **Collection animation**: Orbs animate toward the player (magnet-style) when nearby or when magnet pickup collected. The trail/pull effect confirms they're being collected.
- **Pulse/glow**: Orbs pulse slightly to draw attention without being distracting.
- **Sound on collect**: Each orb makes a soft "ding" or "ping" sound — audio confirmation of collection.

### Ground Drop / Power-Up Visuals
- **Icon-first design**: All drops use recognizable icons, NOT text. Survivor.io uses colored icons with distinct silhouettes. Players identify drops by shape+color at a glance.
- **Icon categories by color**: Health = red/pink, Shield = blue, Attack = orange/red, Utility = yellow/gold. Color coding is universal across the genre.
- **Pickup animation**: Drops animate slightly (bob up and down or glow pulse) to indicate they're collectible.
- **Collection flash**: Brief flash or scale-up on collect.
- **Distinct silhouettes**: Each drop type has a unique silhouette so players don't need color to identify them (accessibility).

### HUD Layout (Standard Conventions)
- **Health/Shield at top-left or bottom-left**: Never at center — obscures gameplay.
- **XP bar at top or bottom edge**: Full-width horizontal bar. Thinner than health bar.
- **Level number near XP bar**: Shows current level prominently.
- **Score/Timer at top-center**: Secondary information, smaller.
- **Wave indicator**: Top area, not competing with health.
- **NO stat numbers during gameplay**: Stats (damage, speed, etc.) belong in menus/pause screen, NOT the live HUD. Players don't read them mid-combat.
- **Boss health bar at top**: Full-width, prominent. Appears only during boss fights.

### Weapon Visual Feedback
- **Hit confirmation**: Every hit registers visually — enemy flashes, particle pops, or brief color change.
- **Damage numbers**: Optional but common — floating numbers above enemies showing damage dealt. Often color-coded (white = normal, yellow = crit, red = fire, etc.).
- **Health bar drain**: When an enemy takes sustained damage (laser, DoT), their health bar visibly drains in real-time. This is critical for lasers — without it, players can't tell if the weapon is working.
- **Kill confirmation**: Enemy death has satisfying visual — explosion, dissolve, particle burst. Never just disappearing.
- **Area indicators**: AoE weapons show the range before/during activation.

### Level-Up UI
- **Full-screen pause with overlay**: Gameplay stops. Dark overlay dims the action.
- **2-4 cards presented**: Clear choice, not overwhelming. Cards are large enough to read on mobile.
- **Card anatomy**: Icon (large, top center), name (bold), description (2-3 lines max), current level indicator.
- **Slide-in animation**: Cards animate in from sides or bottom for polish.
- **No timer pressure**: Players should feel safe to read.
- **Heal option injection**: When low HP, one card becomes a heal option (high demand feature).

---

## Differentiators (Star Assault Can Compete Here)

### Laser Weapon Identity
- Most horde-survivors use projectile spam. Star Assault's twin laser is distinctive if the visual feedback sells it.
- **Beam persistence effect**: The laser beam should have thickness variation (wobble) and glow intensity that reacts to damage output.
- **Enemy highlight during beam contact**: The enemy receiving beam damage should have a distinct "being lasered" state — sustained glow, particle stream pointing toward the player.
- **Health drain visualization**: The health bar should drain with a "drain animation" (a secondary shadow bar that follows the real bar with slight delay — the "Tug" pattern used in fighting games).

### Zone-Based Atmosphere
- Zone transitions with color palette shifts are uncommon in the genre — Star Assault's background zone system is a differentiator.
- **Reinforce zone identity**: Each zone's color palette should influence XP orb tint, particle colors, and HUD accent colors slightly.

### Arena / Weekly Challenge
- Most horde-survivors are roguelite only. The seeded weekly arena system is unique.
- **Arena badge in HUD**: Small indicator that you're in a weekly challenge run.

---

## Anti-Features (Deliberately NOT Build)

| Feature | Reason to Skip |
|---------|---------------|
| Bottom stat bar during gameplay | Players don't read stats mid-combat. Clutters HUD. Belongs in pause/results only. |
| Text labels on drops | Too small on mobile. Icons universally superior. |
| Green XP orbs (current) | Blends with nebula backgrounds. Must change. |
| Damage numbers on every hit from laser | Creates visual noise. Show on kill or show as a slow-drain number, not per-tick. |
| HUD elements at center of screen | Obscures gameplay. All HUD must be at edges. |
| Real-time stat display (DMG: 45, RATE: 1.2) | Players don't process this information. Show upgrade choices, not raw numbers. |

---

## Genre Reference: What Survivor.io Does Specifically

### XP Orbs
- Bright **gold/yellow** color with white glow center
- Scattered from enemy kills, cluster around kill location
- Magnet-pulled to player when player has magnet upgrade or moves near
- Soft "tink" sound per orb collected
- No physics — they float/drift toward player

### Ground Drops
- Large (much larger than XP orbs) circular icons
- Icon + glow ring color indicates type:
  - **Red heart** = HP recovery
  - **Blue lightning bolt** = speed boost / energy
  - **Yellow star** = XP bonus
  - **Green cross** = shield
- Bob animation (up/down, ~1Hz)
- Bright glow ring pulses to attract attention
- Flash + scale-up on collect

### HUD Layout (Survivor.io)
```
[Heart icon] ████████████░░ 145/200 HP    [Wave 12]
─────────────────────────────────────────────
                  [gameplay]
─────────────────────────────────────────────
[XP] ██████████████░░░░░░░░ Lv.14         [Time]
```
- Health bar TOP-LEFT with heart icon, shows actual numbers
- XP bar BOTTOM with level number
- Timer top-right
- Score hidden or top-center

### Weapon Feedback
- Every enemy hit: brief white flash on enemy sprite (1-2 frames)
- Bullet hits: small spark/star particle at impact point
- Kill: enemy explodes into 5-8 colored particles matching enemy color
- Laser weapons (Survivor.io "Lightning Emitter" equivalent): sustained glow on target + drain animation on health bar
- Big hits: brief camera pulse (not full shake — just a 1-2px nudge)

### Level-Up Cards (Survivor.io)
- 3 cards presented
- ~60% screen width each (stacked or side-by-side depending on orientation)
- Portrait mode: stacked vertically with small gap
- Card = icon (40% of card height), name, level dots, description
- Slide in from bottom with slight bounce
- Gold border for rare upgrades

---

## Complexity Reference

| Feature | Effort | Impact |
|---------|--------|--------|
| Orange XP orbs | Low (color change) | High (immediate visibility) |
| Ground drop icons | Medium (asset creation + rendering) | High (readability) |
| Health bar drain animation | Medium (secondary bar + tween) | High (laser weapon feedback) |
| Enemy hit flash | Low (tint tween) | High (hit confirmation) |
| Stat bar removal/relocation | Low (layout change) | Medium (cleaner HUD) |
| Floating damage numbers | Medium (pool + BitmapText) | Medium (combat feedback) |
| Boss health bar polish | Low (styling) | Medium (boss tension) |
| Level-up card polish | Medium (animation refinement) | Medium (upgrade satisfaction) |

---

*Research date: 2026-02-26*
*Sources: Genre analysis of Survivor.io, Vampire Survivors, Brotato, 20 Minutes Till Dawn*
