# Roadmap: Star Assault — UX Overhaul

## Overview

This milestone transforms Star Assault's implemented mechanics into polished, readable gameplay that matches Survivor.io-quality UX. Four phases build on each other: HUD and orb foundations first (the highest-impact active failures), then ground drop icon system, then weapon visual feedback (the densest work), then floating text and card animation polish last. Each phase delivers a verifiable capability improvement and unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: HUD Foundations + XP Orb Clarity** - Orange XP orbs replace invisible green ones; stat bar removed from live HUD; HUD fill bars animate via proxy objects (gap-01 closed) (completed 2026-02-26)
- [ ] **Phase 2: Ground Drop Icon System** - Six drop types get distinct visual icons via generateTexture(); text labels eliminated
- [ ] **Phase 3: Weapon Visual Feedback** - Hit flash, health bar drain tug, death particle bursts, sustained laser glow, AoE kill logic consolidated
- [ ] **Phase 4: Floating Text + Combat Polish** - FloatingTextManager pool, level-up card slide-in animation, damage numbers on kill/crit events

## Phase Details

### Phase 1: HUD Foundations + XP Orb Clarity
**Goal**: Players can instantly read XP orb collection and game state at a glance — no invisible orbs, no cluttered stat strip blocking the play field
**Depends on**: Nothing (first phase)
**Requirements**: VISC-01, VISC-03
**Plans**: 2 plans
**Success Criteria** (what must be TRUE):
  1. XP orbs are visible against all six background zone colors including the nebula zones where green orbs previously vanished
  2. The bottom stat bar (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) is gone from the live gameplay HUD — it does not appear anywhere on screen during a wave
  3. HUD shield and health bars animate smoothly when their value changes (no jump-cut redraws)
  4. The magnet trail color and HUD accent colors are consistent with the new orange orb color — no visual mismatch between systems

Plans:
- [x] 01-01-PLAN.md — Switch XP orb colors to orange/gold (orb glow layers, magnet trail, XP bar, upgrade card accents)
- [x] 01-02-PLAN.md — Remove stat bar, migrate streak counter to HUD, add dirty-flag tween proxy to shield and HP bars
- [x] 01-03-PLAN.md — Gap closure: fix Phaser underscore-property tween bug; proxy objects (_shieldProxy, _healthProxy) make bar animations fire at runtime

### Phase 01.1: HUD Layout Rethink (INSERTED)

**Goal:** Players can read all HUD elements at a glance during combat — bars, icons, and counters are sized and positioned for Survivor.io-quality clarity at actual mobile resolution (1080x1920)
**Depends on:** Phase 1
**Requirements:** VISC-03
**Plans:** 2/2 plans complete
**Success Criteria** (what must be TRUE):
  1. Shield and HP bars are large enough to read at a glance during wave combat — no squinting required at 375px CSS width (typical mobile viewport)
  2. All HUD elements are positioned to avoid obscuring the active play area — no critical game objects hidden behind UI during peak combat moments
  3. The XP bar, kill streak counter, and wave indicator are legible without pausing — size and contrast meet Survivor.io-equivalent readability
  4. HUD layout matches Survivor.io-style conventions: large bars anchored to safe screen edges, minimal clutter in the center play field

Plans:
- [x] 01.1-01-PLAN.md — Extract all layout constants, resize bars to 560x30px, reposition shield/HP to Y=160/200, move XP bar to bottom (Y=1760, 920px wide), replace emoji icons with text labels, add dirty-flag fill guards
- [x] 01.1-02-PLAN.md — Human visual verification at 375px DevTools viewport (checkpoint) — issues found and fixed: bars reduced to 320x18, XP_BAR_Y=1872, backgrounds thinned

### Phase 2: Ground Drop Icon System
**Goal**: Players identify ground drop type at a glance from the icon silhouette alone — no reading required, no ambiguity between types
**Depends on**: Phase 1
**Requirements**: VISC-02
**Plans**: 2 plans
**Success Criteria** (what must be TRUE):
  1. All six drop types (Heart, Shield, Bomb, Magnet, Boost, EliteShard) display a distinct visual icon — no text label appears on any drop
  2. Each icon category is color-coded by function: red for HP (Heart), blue for Shield, orange/yellow for utility (Bomb, Magnet, Boost), purple/gold for EliteShard
  3. Drop icons remain legible at actual mobile resolution — icon silhouettes are distinguishable without zooming
  4. Picking up a drop produces a collect flash that confirms the pick-up happened

Plans:
- [ ] 02-01-PLAN.md — Generate all 6 drop icon textures in PreloadScene.create() via generateTexture() (heart, shield, bomb, magnet, boost, elite_shard)
- [ ] 02-02-PLAN.md — Rewrite GroundDropManager: sprite-based drops, sinusoidal bob, urgency flicker, collect burst, EliteShard sparkles, MAG crash fix, remove floating text on collect

### Phase 3: Weapon Visual Feedback
**Goal**: Every weapon hit, laser contact, and enemy death is visually confirmed — players never doubt whether their weapons are working
**Depends on**: Phase 2
**Requirements**: CMBT-01, CMBT-02, CMBT-03, CMBT-04, POL-03
**Success Criteria** (what must be TRUE):
  1. A white flash appears on an enemy within 100ms of a bullet landing — hit confirmation is visible during normal gameplay at wave 5+
  2. An enemy's health bar visibly drains in real-time while the twin laser beam is in contact — the player can see damage accumulating frame by frame
  3. The twin laser shows a sustained glow highlight on the enemy currently targeted by the beam
  4. Enemies killed by any weapon (including TwinLaser and bombs) produce a particle burst of 5-8 colored particles — no enemy silently disappears
  5. TwinLaser kills and bomb kills correctly increment kill streak, trigger ground drop spawns, and award XP orbs — AoE weapons behave the same as direct-fire weapons
**Plans**: TBD

Plans:
- [ ] 03-01: Extract shared killEnemy() to CombatUtils.js; wire TwinLaser and bomb kills through it to fix kill streak, drops, and XP (prerequisite for rest of phase)
- [ ] 03-02: Implement enemy hit flash via preFX.addGlow() (white, 60ms yoyo tween); add death particle burst (5-8 particles, NORMAL blend mode)
- [ ] 03-03: Add TwinLaser sustained glow on target (preFX.addGlow() while beam contacts); add health bar drain tug animation on enemy HP bars during laser contact

### Phase 4: Floating Text + Combat Polish
**Goal**: Kill events, critical hits, and level-ups are punctuated with satisfying text and animation feedback — the game communicates its rewards clearly
**Depends on**: Phase 3
**Requirements**: POL-01, POL-02
**Success Criteria** (what must be TRUE):
  1. Floating damage numbers appear when an enemy dies or a critical hit lands — no floating numbers appear on routine laser ticks or non-critical hits
  2. Level-up upgrade cards animate in from the bottom of the screen with a bounce easing — cards do not appear instantly/statically
  3. No more than 8 floating text objects are visible simultaneously — excess events are queued or discarded, never creating unreadable stacks
**Plans**: TBD

Plans:
- [ ] 04-01: Build FloatingTextManager with pooled BitmapText (12-15 pre-allocated); validate bitmap font asset pipeline in Vite build first
- [ ] 04-02: Implement level-up card slide-in animation (bottom-up, bounce easing); wire floating text to kill and crit events only

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. HUD Foundations + XP Orb Clarity | 4/4 | Complete    | 2026-02-26 |
| 1.1. HUD Layout Rethink | 2/2 | Complete    | 2026-02-27 |
| 2. Ground Drop Icon System | 0/2 | Not started | - |
| 3. Weapon Visual Feedback | 0/3 | Not started | - |
| 4. Floating Text + Combat Polish | 0/2 | Not started | - |
