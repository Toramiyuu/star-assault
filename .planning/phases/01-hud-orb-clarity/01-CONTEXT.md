# Phase 1: HUD Foundations + XP Orb Clarity - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Switch XP orbs from invisible green to visible orange/gold, remove the bottom 8-stat strip from the live gameplay HUD, and add smooth scaleX tween animation to the shield and HP fill bars. No new capabilities — this phase makes existing mechanics readable.

</domain>

<decisions>
## Implementation Decisions

### Orb Color Palette
- Base color: neon orange in the 0xFF6600 range — energetic and high-contrast against all six background zones
- Retain the existing 3-layer glow structure (outer glow, mid ring, bright core); recolor all layers to orange
- Keep white center dot — provides depth and "hot light" feel
- Magnet trail switches from green line to orange line to match orbs
- XP level bar fill color updates to orange to match orbs (same XP system, visual consistency)
- Orbs get a subtle idle pulse: outer glow layer opacity fades in/out at ~0.8s period (no scale change — stays within footprint)

### HUD Bar Animation
- On value change (drop or gain): quick ease-out tween of ~150ms — responsive but readable
- No lag bar — direct tween to new value only
- Dirty-flag approach on rapid hits: if multiple damage events arrive before tween completes, jump to final value (no queued animation debt)
- Same tween duration and easing for shield bar and HP bar (~150ms ease-out)
- Same animation behavior on gain (pickup, upgrade) as on loss — no asymmetry
- Existing pulse effects (low-HP red pulse, shield-recharge blue pulse) are adjusted for feel — see Claude's Discretion

### Color Consistency Reach
- Upgrade card XP accent: update to orange in this phase (upgrade cards shown during level-up pause should reflect the new orange XP palette)
- Kill streak counter, HUD border/frame, wave announcement text: see Claude's Discretion

### Claude's Discretion
- Existing low-HP red pulse and shield-recharge blue pulse: adjust duration/intensity if they feel off, leave them if they're working. No specific direction — use judgment.
- Kill streak counter accent color: match orange if it reads naturally, leave white/yellow if it doesn't.
- HUD frame/border accent: add a thin orange accent if it unifies the design; skip if it competes with shield/HP bar colors.
- Wave announcement text color: adjust to orange if it looks out of place once orbs are orange; leave as-is if it's fine.

</decisions>

<specifics>
## Specific Ideas

- Orb color feel: "Survivor.io-style" — punchy, impossible to miss, reads as collectible reward
- The pulse should be a glow breathe, not a size throb — the orb stays the same diameter, just the outer ring dims and brightens

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-hud-orb-clarity*
*Context gathered: 2026-02-26*
