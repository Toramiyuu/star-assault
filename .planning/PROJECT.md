# Star Assault

## What This Is

A mobile portrait (1080x1920) horde-survival shooter built with Phaser 3, featuring roguelite upgrades, procedural music, boss fights, and weekly seeded arena challenges. The player fights waves of enemies, collects XP orbs to level up, chooses upgrade cards, and battles bosses. Think Survivor.io but with a space combat theme.

## Core Value

The game must feel polished and satisfying to play — clear visual feedback on every action, intuitive HUD that communicates game state at a glance, and power-ups/drops that are instantly recognizable without reading text.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Core gameplay loop: player movement, shooting, enemy waves, scoring — existing
- ✓ Roguelite upgrade system: 40 upgrades, synergies, weighted draw, card UI — existing
- ✓ Boss fight system: AAX boss with phases, horn mode, death animation — existing
- ✓ Wave management: 13 wave configs + infinite escalation, 5 enemy types — existing
- ✓ XP orb collection and level-up trigger — existing
- ✓ Ground drops: 6 types with bomb drama sequence — existing
- ✓ Halo-style shield/health system with auto-recharge — existing
- ✓ Procedural music engine: 3 phases (cruise/combat/boss) — existing
- ✓ Background zone system: 6 zones with crossfade transitions — existing
- ✓ Weekly seeded arena system with leaderboards — existing
- ✓ Kill streak system with fire rate bonus — existing
- ✓ Elite enemy system: 8% chance, golden tint, boosted stats — existing
- ✓ Dev tools: god mode, boss skip, wave skip, XP inject — existing

### Active

<!-- Current scope: UX overhaul driven by playtest feedback -->

- [ ] XP orbs changed from green to orange for visibility against nebula backgrounds
- [ ] Ground drop text labels replaced with visual icons (recognizable at a glance)
- [ ] Bottom stat bar redesigned/relocated to top HUD area
- [ ] Twin laser visual feedback dramatically improved (visible health drain, impact effects)
- [ ] Survivor.io-quality UX polish across HUD, power-ups, weapon feedback, level-up UI
- [ ] Near miss + dodge meter system (PRD v4 Section 14)
- [ ] Scrapyard between-wave shop (PRD v4 Section 10)
- [ ] Full life steal + vampire core system (PRD v4 Section 3)
- [ ] Boss taunts (PRD v4 Section J)

### Out of Scope

- Multiplayer / co-op — complexity too high, single-player focus
- IAP / monetization — gameplay-first, no paywall
- Backend services — all local, seeded RNG for determinism
- Native mobile build — browser-based, responsive scaling via Phaser

## Context

- **Tech:** Phaser 4.0.0-rc.6 (ES modules), Vite 7.3.1, pure JavaScript, Web Audio API for procedural SFX/music
- **Target:** Mobile browsers in portrait orientation, WebGL with Canvas fallback
- **Playtesting approach:** User tests on `localhost:5181/?dev=1`, provides verbal feedback, iterate
- **Reference game:** Survivor.io — the gold standard for UX in this genre (power-up visuals, HUD layout, weapon feedback, level-up UI)
- **PRD:** `star-assault-expansion-prd-v4.md` is authoritative spec for all gameplay systems
- **Pattern:** GameScene is central hub with ~12 manager/system objects, config-driven design, seeded RNG throughout
- **Assets:** Mix of loaded sprites and procedurally drawn graphics (XP orbs, drop icons, HUD elements)

## Constraints

- **Tech stack**: Phaser 3/4 + Vite + vanilla JS — no framework changes
- **Resolution**: 1080x1920 portrait, must look good on mobile
- **No test framework**: Verification is manual playtesting via `?dev=1`
- **No external assets CDN**: All assets bundled locally
- **Performance**: Must run 60fps on mobile browsers with dozens of enemies + projectiles on screen
- **Procedural audio**: All SFX are Web Audio oscillators/noise — no audio file dependencies for new sounds

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| XP orbs use Graphics API (not sprites) | Avoids physics group overhead, custom glow rendering | ✓ Good |
| Shield default 1 (was 3) | Player was never dying, no tension | ✓ Good |
| XP thresholds 50/90/140/200 | Was leveling every 3 seconds, too fast | ✓ Good |
| Enemy scales reduced ~20% | Better visual clarity on mobile | ✓ Good |
| Survivor.io as UX reference | User explicitly requested this benchmark | — Pending |
| Orange XP orbs (not green) | Green blends with nebula zone backgrounds | — Pending |
| Icons for ground drops (not text) | Text too small to read on mobile | — Pending |

---
*Last updated: 2026-02-24 after initialization*
