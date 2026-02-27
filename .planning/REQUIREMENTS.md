# Requirements: Star Assault UX Overhaul

**Defined:** 2026-02-26
**Core Value:** The game must feel polished and satisfying — clear visual feedback on every action, intuitive HUD at a glance, instantly recognizable power-ups without reading text.

## v1 Requirements

Requirements for the UX overhaul milestone. All map to roadmap phases.

### Visual Clarity

- [x] **VISC-01**: Player can distinguish XP orbs from nebula backgrounds because orbs are orange/gold (not green)
- [x] **VISC-02**: Player can identify ground drop type at a glance via visual icon (heart, shield, bomb, magnet, boost, shard) — no text labels
- [x] **VISC-03**: Bottom stat bar (DMG/RATE/SPD/SH/HP/CRIT/PIER/STK) is removed from the gameplay HUD

### Combat Feedback

- [ ] **CMBT-01**: Player sees a brief white flash on an enemy when their bullet lands (hit confirmation within 100ms)
- [ ] **CMBT-02**: Enemy health bars visibly drain in real-time during twin laser beam contact (health drain tug animation)
- [ ] **CMBT-03**: Enemy deaths produce a particle burst (5-8 colored particles) — enemies do not silently disappear
- [x] **CMBT-04**: TwinLaser and bomb kills correctly trigger kill streak, ground drop spawns, and XP orb rewards (AoE kill logic consolidated)

### Polish

- [ ] **POL-01**: Level-up upgrade cards slide in from the bottom of the screen with a bounce easing animation
- [ ] **POL-02**: Floating damage numbers appear on kill and critical hit events (not on every laser tick)
- [ ] **POL-03**: The twin laser shows a sustained glow/highlight on the enemy currently being targeted by the beam

## v2 Requirements

Deferred to future milestones. Not in current roadmap.

### PRD v4 Remaining Chunks

- **PRD-E**: Near miss detection and dodge meter system (PRD Section 14)
- **PRD-G**: Scrapyard between-wave shop with upgrade purchasing (PRD Section 10)
- **PRD-H**: Full life steal + vampire core passive (PRD Section 3)
- **PRD-J**: Boss taunts and voice lines (PRD Section J)

### Nice-to-Have UX

- **UX-A**: Arena/weekly challenge badge displayed in HUD during seeded runs
- **UX-B**: HUD fill bar dirty-flag optimization (performance improvement, not user-visible feature)
- **UX-C**: Zone palette influence on XP orb tint and particle colors per zone

## Out of Scope

| Feature | Reason |
|---------|--------|
| Text labels on ground drops | Confirmed anti-feature — text too small on mobile; icons replace them |
| Damage numbers on every laser tick | Visual noise — throttled to kill/crit events only |
| HUD elements at screen center | Obscures gameplay — all HUD at screen edges |
| Raw stat display during combat (DMG: 45, RATE: 1.2) | Players don't process this mid-combat; belongs in results/pause only |
| Screen shake on every kill | Accumulates to nausea; reserved for HP damage, bombs, and boss attacks only |
| Multiplayer / co-op | Scope too large |
| IAP / monetization | Out of product focus |
| Separate UIScene for HUD | No architectural benefit; single-scene HUD correct for this game |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VISC-01 | Phase 1 — HUD Foundations + XP Orb Clarity | Complete |
| VISC-03 | Phase 1 — HUD Foundations + XP Orb Clarity | Complete |
| VISC-02 | Phase 2 — Ground Drop Icon System | Complete |
| CMBT-01 | Phase 3 — Weapon Visual Feedback | Pending |
| CMBT-02 | Phase 3 — Weapon Visual Feedback | Pending |
| CMBT-03 | Phase 3 — Weapon Visual Feedback | Pending |
| CMBT-04 | Phase 3 — Weapon Visual Feedback | Complete |
| POL-03 | Phase 3 — Weapon Visual Feedback | Pending |
| POL-01 | Phase 4 — Floating Text + Combat Polish | Pending |
| POL-02 | Phase 4 — Floating Text + Combat Polish | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — 01-03 complete: VISC-03 confirmed (gap-01 closure — HUD bar tween proxy fix ships the animation behavior VISC-03 requires)*
