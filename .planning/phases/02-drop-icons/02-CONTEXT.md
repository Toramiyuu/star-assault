# Phase 2: Ground Drop Icon System - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing text-label ground drops with distinct icon sprites for each of the six drop types (Heart, Shield, Bomb, Magnet, Boost, EliteShard). Players identify drop type from the icon silhouette alone — no reading required, no ambiguity between types. All icons generated via `generateTexture()` in PreloadScene. Gameplay mechanics of drops (timing, radius, effects) are unchanged.

</domain>

<decisions>
## Implementation Decisions

### Icon visual style
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

### Drop container / framing
- Dark semi-transparent backing circle behind each icon (~60% opacity, slightly larger than the icon)
- Backing circle baked into the same `generateTexture()` call — single sprite per drop
- All 6 drop types use uniform dark backing, **except** EliteShard which gets a purple-tinted backing
- Texture total size: backing circle ~80px diameter containing the 64px icon core

### Collect feedback
- Primary feedback: icon scale burst to ~1.5x over 150ms + white flash at peak scale + fade out over 100ms
- **Remove all floating text on collect** (no "+HP", "+SHIELD", "+STREAK" etc.) — icon flash is sufficient
- No camera shake on collect — shake is reserved for damage events only
- **Bomb exception**: Bomb collect skips the icon scale-burst (the existing bomb drama is the feedback)
- EliteShard and all other drops get the standard scale-burst + white flash + fade

### Idle animation on ground
- Gentle vertical bob: ~8px amplitude, ~1.5s sinusoidal cycle
- **Urgency flicker**: in the final 3s of lifetime (at 7s age), drop starts flickering/flashing at increasing rate to signal expiry
- **Bob stops** when drop enters attract radius and is actively moving toward player — smooth travel, no jitter
- No visual change when entering attract radius — movement is the signal
- **EliteShard only**: small purple/gold sparkle particles float outward while bobbing idle

### Magnet attract behavior
- Only XP orbs are attracted by the Magnet drop — ground drops (Heart, Shield, etc.) are unaffected
- Drops require physical proximity (40px collect radius) to pick up

### Claude's Discretion
- Exact Phaser tween/timer implementation details
- Sparkle particle count and exact spread for EliteShard idle
- Exact bob offset math and flicker frequency curve
- How to wire the flicker in the existing `update()` loop

</decisions>

<specifics>
## Specific Ideas

- "Crystal/gem shard silhouette" for EliteShard — pointed faceted shape to match elite enemy gold tint aesthetic
- Bomb should feel like the Nintendo/classic cartoon bomb: simple black circle, white highlight, fuse with tiny orange lit tip
- Double-chevron >> for Boost directly communicates speed/rate, more readable than a lightning bolt at 64px

</specifics>

<deferred>
## Deferred Ideas

- **Bomb AoE radius too small** — user notes the bomb's kill radius feels too small and it should wipe everyone off the map. This is a gameplay balance/mechanics fix, not an icon visual change. Belongs in a separate gameplay-tuning phase.

</deferred>

---

*Phase: 02-drop-icons*
*Context gathered: 2026-02-27*
