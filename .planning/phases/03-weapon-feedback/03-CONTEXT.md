# Phase 3: Weapon Visual Feedback - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual feedback for every combat hit, sustained laser contact, and enemy death — so players always know their weapons are working. Includes Screen Beam fix (additive firing) and boss HP bar positioning fix. Does NOT include new enemy types, new weapons, or UI overhauls (those are separate phases).

</domain>

<decisions>
## Implementation Decisions

### Hit Flash (Bullet / Direct Fire)
- Hard white-out: the whole enemy sprite goes fully white on hit
- Duration: 40–60ms (very short, snappy)
- Gated: each hit resets the flash timer, does not stack — enemy stays white under sustained rapid fire and snaps off when fire stops
- Crit hits: white flash + orange/gold rim to distinguish from normal hits
- Elite enemies (golden tint): red flash instead of white — signals they're tankier
- Shield hits (Formation Leaders, Bombers): cyan/blue flash — signals shield absorbed, not HP damage
- Bosses: same white flash as regular enemies (HP bar communicates damage progress)

### Death Effects
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

### Screen Beam Fix
- Additive: fires alongside primary weapon (does NOT replace it)
- Fire interval scales with fire rate upgrades (more fire rate = Screen Beam fires more often)
- Animated sweep: beam visibly crosses the screen rather than instant hit
- Brief charge-up glow telegraph (~200ms charge flash before beam sweeps)

### TwinLaser Contact Feedback
- Pulsing cyan glow on the enemy currently targeted by the beam
- Smooth real-time HP bar drain as laser ticks damage (player watches HP decrease frame by frame)
- Cyan/white spark particles continuously emit from the contact point while beam is active
- Laser kill drama: beam lingers on enemy ~100ms before full explosion triggers — feels like the enemy got cooked

### Enemy HP Bars
- Always visible from spawn (not hidden at full HP)
- Stays visible until enemy dies (no fade timer)
- Positioned above the enemy sprite
- Shielded enemies (Formation Leaders, Bombers): two-bar system — cyan shield bar above red HP bar; cyan depletes first, then red takes damage
- This matches the cyan hit flash system for shields

### Boss HP Bar Fix
- Current state: boss bar overlaps player shield/health blocks at top of screen (screenshot confirmed)
- Fix: adjust BAR_Y and verify clear separation from player HUD elements — must be verified in-browser, not just by constant value

### Kill Routing (AoE Weapons)
- TwinLaser kills and bomb kills MUST route through the same killEnemy() path as bullet kills
- This fixes: kill streak not incrementing, ground drops not spawning, XP orbs not awarding on AoE kills
- This is a prerequisite for all other Phase 3 visual work (particles and effects need the kill event to fire correctly)

### Claude's Discretion
- Exact Phaser preFX API choice for hit flash (setTintFill vs addGlow vs custom shader)
- Fragment sprite scale and velocity values
- Spark particle count/velocity for TwinLaser contact
- Precise boss BAR_Y value (find one with clear visual separation)
- How to map current enemy type identifiers to craftpix explosion sprite sets

</decisions>

<specifics>
## Specific Ideas

- The craftpix kit has 967 effect-related sprites — the following are confirmed available and unused:
  - `Enemy-spaceship-game-sprites/PNG/Ship_Effects_Sprites/Explosion_001–008.png` (8-frame enemy explosion)
  - `Enemy-spaceship-game-sprites/PNG/Ship_Effects/Ship_Fragment_1–4.png` (debris sprites)
  - Equivalent sets exist for Pirate and UFO ship types
- The game currently uses `enemy_explosion` and `player_explosion` as Phaser animation keys — new effects should not conflict with these
- Boss HP bar issue visible in screenshot: bar and label "ALEX — THE FINAL BOSS" appear to cover the player shield blocks at the top of the screen

</specifics>

<deferred>
## Deferred Ideas

- **New enemy ship variants using craftpix Pirate + UFO sprites** — user explicitly requested "add them now, we have hardly any variation!" — HIGH PRIORITY, dedicated phase after Phase 4
- Possible future use of craftpix boss sprite parts (Boss_01/02/03) as alternate boss designs

</deferred>

---

*Phase: 03-weapon-feedback*
*Context gathered: 2026-02-27*
