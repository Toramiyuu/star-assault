# Pitfalls Research

**Domain:** Mobile horde-survivor game UX polish (Phaser 3 + Web Audio + WebGL, portrait 1080x1920)
**Researched:** 2026-02-24
**Confidence:** HIGH (most pitfalls verified against this codebase's CONCERNS.md + Phaser official docs + community sources)

---

## Critical Pitfalls

### Pitfall 1: Per-Frame Graphics.clear() Redraw for Dynamic Content

**What goes wrong:**
Using a single shared `Graphics` object and calling `.clear()` then redrawing everything every frame is the single most common performance killer in Phaser 3 mobile games. Render time can degrade from under 3ms to over 45ms as the number of drawn elements grows. This game already does this in three hot paths: XP orbs (`XPManager._drawOrb` — 4 fillCircle calls per orb), enemy health bars (`GameScene.drawEnemyHealthBars` — up to 4 fillRect calls per enemy), and the HUD bar fills (`HUD.update` — 2 fillRoundedRect calls per frame regardless of change).

**Why it happens:**
The Graphics API is intuitive for prototyping but is the wrong tool for frequently-updated, moving content. It recalculates triangles every render tick. Developers reach for it because it doesn't require pre-made textures, not realizing the per-frame CPU cost at scale.

**How to avoid:**
- **XP orbs**: Generate a RenderTexture once with the layered glow appearance, then use sprite instances that just reposition each frame. The orb visual is static; only x/y changes.
- **Enemy health bars**: Draw bars only for enemies below full HP; use individual Graphics objects per enemy that travel with the sprite so unchanged HP bars need no redraw.
- **HUD bars**: Track the previous ratio (`_lastShieldRatio`, `_lastHealthRatio`) and skip the `clear()`+redraw cycle when values haven't changed. The shield pulse animation is the only thing requiring continuous redraw — isolate it to `shieldGlow` only, not the fill bar.
- **Budget**: On mobile, budget under 3ms for all custom drawing combined. At 20+ enemies + 15 orbs, the current implementation exceeds this by 10-15x in peak frames.

**Warning signs:**
- Chrome DevTools "Scripting" time above 8ms per frame during mid-game
- FPS drop from 60 to 40-50 specifically when many enemies are on screen
- The game runs fine in early waves but stutters at wave 5+ when orb spawns become frequent

**Phase to address:** HUD Polish phase (any phase touching XP orbs, enemy health bars, or HUD elements)

---

### Pitfall 2: setTimeout Leaking Across Scene Transitions

**What goes wrong:**
`ProceduralMusic` uses raw `setTimeout` for its scheduler loop (`this.timerId = setTimeout(...)`). Unlike `scene.time.addEvent`, native `setTimeout` is not governed by Phaser's Clock and continues running after the scene is stopped or destroyed. When the player loses and transitions to ResultsScene, the music scheduler fires into a dead scene context, creating orphaned Web Audio nodes and potentially causing audio glitches or crashes when starting a new game.

**Why it happens:**
Web Audio oscillators are single-use (they cannot be restarted once started), so scheduling must happen in advance via real time. Developers use `setTimeout` as the natural tool for this, not realizing Phaser's scene lifecycle does not own it.

**How to avoid:**
- Implement `ProceduralMusic.stop()` and call it explicitly in `GameScene.shutdown()` before any scene transition.
- In `stop()`, call `clearTimeout(this.timerId)` and disconnect + close open Audio nodes.
- Consider adding `this.scene.events.once('shutdown', () => this.stop(), this)` in the ProceduralMusic constructor as a safety net.
- General rule: every `setTimeout` in a scene-owned object must have a corresponding `clearTimeout` in the object's destroy/stop method.

**Warning signs:**
- Playing a second game hears echoing or doubled music from the first session
- Browser memory grows between game sessions (visible in DevTools Memory tab)
- Audio glitches or phase artifacts starting from the second game

**Phase to address:** Any phase that adds or modifies audio systems; also a pre-requisite fix before any other audio work

---

### Pitfall 3: Visual Noise Obscures Gameplay Clarity

**What goes wrong:**
Adding polish effects without a visual hierarchy strategy produces a game that *looks* busy but *feels* confusing. In horde-survivor genre, the player needs to read enemy positions, bullet trajectories, XP orbs, and ground drops simultaneously. When hit flashes, particle explosions, screen shake, death nova chains, background zone crossfades, and floating text all fire in the same second, the player loses situational awareness.

**Why it happens:**
Each individual effect is added in isolation and looks good in isolation. The failure is cumulative — developers test one new effect at a time but don't stress-test all effects firing simultaneously during a dense wave.

**How to avoid:**
Apply the greyscale brightness hierarchy rule: backgrounds occupy mid-grey values, gameplay elements (enemies, bullets) occupy a slightly different mid-grey band, and VFX/UI occupy the extremes (very bright or high-contrast). This ensures effects "win" visually when they need to without drowning each other.

Specific rules for this game:
- Screen shake should have a hard cap (e.g., max 8px displacement) and must use diminishing strength, not random duration — prevents nausea on mobile
- Hit flashes on enemies should be a single white-tint frame (~80-100ms), not a sustained glow
- Death nova chain explosions should NOT stack additional screen shake — the chain read is enough feedback
- Limit simultaneous floating text objects to 6-8 maximum; queue overflow discards oldest
- Background zone crossfades should NOT coincide with boss phase transitions — they compete for attention

**Warning signs:**
- During playtesting, player says "I couldn't tell what was happening" or misses a boss attack
- Player doesn't notice when their shield breaks because other effects fire simultaneously
- XP orbs are invisible against the current background zone color (confirmed: green orbs vs. nebula green)

**Phase to address:** Any VFX phase; the orb color fix (green → orange) is the first signal this pitfall is live

---

### Pitfall 4: Closure-Per-Bullet GC Pressure

**What goes wrong:**
Every bullet spawned gets its own `update = function() {...}` closure assigned at spawn time. With pools of 100+80+80 bullets and `runChildUpdate: true`, these closures create GC pressure in the hot path. On mobile devices with limited heap, frequent garbage collection causes micro-stutters that manifest as inconsistent frame timing even when average FPS looks acceptable.

**Why it happens:**
The pattern (`bullet.update = () => { ... }`) is natural JavaScript but creates a new function object per bullet. It was chosen for per-bullet customization (different off-screen margins, different behavior), but this flexibility isn't actually needed — all player bullets share identical update logic.

**How to avoid:**
- Define a single shared update function per bullet category (playerBullet, enemyBullet) as a module-level function and assign it once at pool initialization: `bullet.update = sharedPlayerBulletUpdate`.
- Standardize the off-screen margin across all bullet types (currently varies: 50, 60, GAME.WIDTH+50 vs GAME.WIDTH+60). Pick one value (80px) and use it everywhere.
- For bullets that genuinely need custom behavior (homing, sine-wave paths), use a `bulletBehavior` data field on the bullet and a single update function that switches on that field.

**Warning signs:**
- Chrome DevTools shows frequent short GC pauses (1-2ms) in the timeline during combat
- Performance is worse than expected even with object pooling in place
- Frame time variance is high (20-30ms spikes) despite low average frame time

**Phase to address:** Any phase that modifies weapon behavior or adds new bullet types

---

### Pitfall 5: Text Objects for Dynamic Per-Frame Values

**What goes wrong:**
Using `scene.add.text()` objects that update frequently (floating damage numbers, kill streak counter, score display) causes expensive canvas remeasurement and GPU texture re-uploads on WebGL every time the string changes. Text rendering can consume 15-60ms per update in worst-case scenarios. Floating damage numbers are the highest-risk pattern: each kill potentially spawns a new Text object, tweens it upward, then destroys it.

**Why it happens:**
`scene.add.text()` is the obvious Phaser API for readable text. The performance cost of frequent content changes is not obvious from the API surface.

**How to avoid:**
- Use `scene.add.bitmapText()` for all dynamic in-game text (damage numbers, floating "+XP", kill streak). BitmapText does not re-upload to GPU on content change.
- Pool floating text objects (10-15 pre-allocated BitmapText objects) rather than creating/destroying per kill.
- Keep `scene.add.text()` only for static or infrequently changing UI labels (wave number, level display, menu text).
- Score display in HUD updates every frame — switch it to BitmapText.

**Warning signs:**
- Frame spikes specifically when many enemies die simultaneously (AoE kills)
- Chrome DevTools shows "Canvas 2D" operations in the Scripting flame chart during combat
- Performance drops correlate with floating text appearing on screen, not with enemy count

**Phase to address:** Any phase adding floating feedback text (damage numbers, "+XP", kill streaks)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `Graphics.clear()` + redraw every frame | Easy to implement, no texture prep | 10-45ms render cost per frame with 20+ elements | Never for moving content; only for truly static decorations |
| `setTimeout` in scene-owned audio | Precise scheduling, avoids Phaser Clock limits | Leaks across scene transitions, accumulates orphaned audio nodes | Never; always pair with `clearTimeout` in destroy/stop |
| `new function()` per bullet spawn | Flexible per-bullet behavior | GC pressure, micro-stutters at 60fps on mobile | Never for high-frequency objects (bullets, particles) |
| `scene.add.text()` for damage floats | Simple API, readable code | Expensive GPU re-upload every content change | Only for text that changes less than once per second |
| Shared Graphics object for all enemy health bars | Simplifies layering | Redraws all bars even when most are unchanged | Only if enemy count is capped at ≤5; not viable at 20+ enemies |
| No cleanup in `GameScene.shutdown()` | Saves development time | Orphaned audio schedulers, memory growth across sessions | Never; always implement explicit manager.destroy() calls |

---

## Integration Gotchas

Common mistakes when connecting systems in this specific codebase.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `scene.time.paused = true` (upgrade pause) | Duration-sensitive effects (invulnerability, boost) get extra-long duration because their `delayedCall` timers also freeze | Track invulnerability expiry with `Date.now()` timestamps, not Phaser timer events |
| XPManager + GroundDropManager magnet | Magnet drop iterates `scene.xpManager.orbGroup` (a Phaser physics group that doesn't exist) | Iterate `scene.xpManager.orbs` array directly — it's a plain array of objects with x/y |
| Kill logic in 4 different places | AoE weapon kills (TwinLaser, BlackHole, Bomb) don't award score, streak, or ground drops | Extract `killEnemy(scene, enemy, killerType)` to `CombatUtils.js` before adding more kill sources |
| Web Audio + iOS autoplay policy | AudioContext is created before user gesture, remains suspended silently | Listen for Phaser's `Phaser.Sound.Events.UNLOCKED` before triggering any audio playback |
| PlayerStats + scene god object | New stats require writing to scene directly via `this.scene[key] = val` — no type safety, no discoverability | Any new stat added during polish phases must follow the existing `PlayerStats._apply()` convention; document the convention explicitly |

---

## Performance Traps

Patterns that degrade at the scale this game operates.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-frame `Graphics.clear()` for orbs | FPS drop at wave 5+ when 10+ orbs on screen | RenderTexture sprites instead of Graphics draws | Breaks at ~10 orbs simultaneously |
| Per-frame `Graphics.clear()` for enemy health bars | FPS drop with 20+ enemies on screen | Dirty-flag redraw, or per-enemy Graphics objects | Breaks at ~15 enemies simultaneously |
| HUD `update()` called every frame for static bars | Minor but cumulative — 2-3ms wasted per frame | Dirty-flag: only redraw when ratio changes | Always wasteful; add dirty flag before any other HUD work |
| `scene.add.text()` for floating numbers | Frame spikes on AoE kills | BitmapText pool | Breaks at 5+ simultaneous kills from AoE |
| Object pool exhaustion (bullets) | Bullets silently fail to spawn — gun appears to stop firing | Log pool exhaustion; increase pool size; audit high-fire-rate upgrades | BulletStorm + Spread synergy can exhaust 100-bullet pool in ~3 seconds |
| Death Nova recursive calls | Stack overflow in dense enemy packs with high Death Nova upgrade stacks | Convert to iterative queue in `UpgradeManager.checkDeathNova` | Breaks at ~30% Death Nova chance with 15+ tightly-packed enemies |
| O(n²) cluster finding in BlackHole/WarpStrike | Frame spike when cluster is recalculated | Spatial hash or fixed-region clustering | Acceptable at <30 enemies; breaks at 40+ enemies |

---

## UX Pitfalls

Common user experience mistakes specific to this genre and mobile target.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| XP orb color matches background zone | Player misses orbs, doesn't understand XP mechanic | Orange orbs (confirmed fix needed per PROJECT.md) — orange reads against all 6 zone tints |
| Ground drop text labels instead of icons | Text too small to read on 1080px portrait mobile (confirmed in PROJECT.md) | Visual icons sized 64x64px minimum, universally recognizable shapes |
| HUD stat bar at bottom of screen | Player's thumb obscures stats on mobile portrait; critical HP info invisible during heavy combat | Move to top HUD area (already planned per PROJECT.md) |
| Screen shake on every kill | Accumulates into nauseating vibration during horde waves; reported as accessibility problem across multiple games | Cap cumulative shake displacement at 8px; use diminishing falloff; never stack shake from chain kills |
| Hit flash on enemies too brief or too subtle | Player can't tell if shots are landing, weapon feels unresponsive | 80-100ms white tint flash per hit; audible confirmation; optional number popup |
| Too-small touch targets for HUD elements | Misclicks on power-up selection or level-up cards; frustration on mobile | Minimum 88px tap area for any interactive element (2x Apple's 44pt guideline for game contexts) |
| Upgrade cards show text-heavy descriptions | Takes 3-5 seconds to read during time pressure; breaks game flow | Icon-first design with short (5 word max) subtitle; color-code by upgrade category |
| No pause for tab-switch on mobile | Player receives notification, returns to game already dead | Add `document.visibilitychange` handler that auto-pauses (sets `upgradePaused` or similar flag) |
| Identical color palette for enemy bullets and XP orbs | Player dodges their own XP; confuses hostile from beneficial objects | Enemy bullets: red/orange palette; XP orbs: green/orange; ground drops: distinct silhouettes |
| Boss HP heals to full at Horn Mode with no indicator | Player perceives as bug, not design; breaks trust | Show floating "FULL RESTORE" text + dramatic horn sfx the moment HP resets |

---

## "Looks Done But Isn't" Checklist

Things that appear complete during implementation but are missing critical pieces.

- [ ] **XP orb color change (green → orange):** Color is changed in `XPManager._drawOrb`, but also check `_gfx.lineStyle` for magnet trail (line 124) and the `xpLevelText` color in HUD (currently `#00ff88`) — all three must change together or the theme is inconsistent.
- [ ] **Ground drop icons:** Icon is drawn, but verify it's legible at actual mobile resolution (1080px portrait = icon appears ~60px on a physical phone screen). Test on device, not just browser DevTools.
- [ ] **Shield recharge pulse animation:** Visual is done, but verify the sound (`shieldRechargeSfx`) fires when recharge *completes* (returns to full), not just on start — the feedback timing matters.
- [ ] **Kill streak counter:** Increments on kill, but CONCERNS.md notes AoE kills (TwinLaser, BlackHole, Bomb) don't increment streak. A player using AoE builds gets zero fire rate bonus — the upgrade is effectively broken.
- [ ] **Scene shutdown cleanup:** `ProceduralMusic.stop()` must be explicitly called. Verify by opening Chrome DevTools Memory, starting a game, dying, starting another game, and checking if audio node count grows.
- [ ] **Boss Horn Mode HP reset:** Visual "FULL RESTORE" indicator is missing. Boss HP bar snaps to full with no explanation — this registers as a bug to players.
- [ ] **WarpStrike invulnerability window:** Weapon teleports player into enemy cluster for 200ms with no invulnerability — player takes collision damage every time. Must set `scene.isInvulnerable = true` around the teleport window.
- [ ] **HUD emoji icons (shield, heart):** Emoji rendering varies by mobile OS. iOS renders shield emoji as a colored image; Android may render as outlined only. Replace with sprite-based or Unicode-drawn icons for consistency.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Graphics.clear() performance degradation | MEDIUM | Profile with Chrome DevTools; identify worst offender; convert to RenderTexture sprite; typically 2-4 hours per system |
| setTimeout audio leak after scene transition | LOW | Add `clearTimeout` + `disconnect()` in ProceduralMusic.stop(); test by playing two consecutive games and listening for doubled audio |
| Magnet drop crash | LOW | One-line fix: replace `scene.xpManager.orbGroup.getChildren()` with `scene.xpManager.orbs` iteration |
| Death Nova stack overflow | MEDIUM | Rewrite `checkDeathNova` as iterative BFS with a visited-positions Set; 1-2 hours |
| Bullet pool exhaustion (silent fail) | LOW | Add `console.warn` when `group.get()` returns null; increase pool sizes from 100/80/80 to 150/100/100; audit upgrade combinations |
| Kill logic inconsistency (AoE misses score/streak) | HIGH | Extract `killEnemy()` to CombatUtils.js and route all 4 kill paths through it; requires careful testing of each kill source |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Per-frame Graphics redraw (orbs, health bars, HUD) | HUD Polish / XP Orb Color Fix phase | Chrome DevTools: Scripting time stays under 4ms at wave 7+ with 20 enemies |
| setTimeout audio leak | First audio-touching phase (any SFX/music work) | Play 3 consecutive games; Chrome Memory tab shows stable node count |
| Closure-per-bullet GC pressure | Weapon polish phase | Chrome DevTools Memory: no significant GC pauses during 2-minute combat session |
| Text object for dynamic values | Floating text / damage number phase | Frame time stays under 20ms during AoE kills of 10+ enemies |
| Visual noise / feedback overload | Visual feedback / VFX polish phase | Playtest: player can identify shield break event even during large enemy wave |
| Screen shake accumulation | Camera feedback phase | Test: 30-second horde fight with 3 screen shake upgrades; player should not report nausea |
| Touch target too small | HUD layout / icon phase | Test on physical device; tap targets verified at 88px minimum |
| Kill logic inconsistency (AoE) | Combat systems cleanup phase | Dev test: kill 10 enemies with TwinLaser; confirm score, streak, and drop count matches manual kills |
| Death Nova recursion | Any phase adding kill chain effects | Test: max Death Nova upgrades (5 stacks) in wave with 20+ tightly packed enemies; no stack overflow |
| WarpStrike invulnerability gap | Weapon polish phase | QA: equip WarpStrike, walk into enemy cluster; player should never take damage during 200ms window |

---

## Sources

- Phaser official docs — `Graphics` vs `RenderTexture` rendering model: https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html
- Phaser community — Graphics rendering performance degradation (3ms → 45ms documented case): https://phaser.discourse.group/t/rendering-performance-problem/11069
- Phaser community — BitmapText vs Text performance: https://docs.phaser.io/phaser/concepts/gameobjects/bitmap-text
- Phaser community — setTimeout vs scene.time (setTimeout survives scene.stop): https://phaser.discourse.group/t/scene-time-paused-does-not-work/6734
- Phaser community — Memory leak patterns, scene lifecycle: https://github.com/phaserjs/phaser/issues/5456
- Phaser community — Object pool exhaustion behavior: https://phaser.discourse.group/t/bullet-pools-phaser-3/7502
- Phaser how-I-optimized guide (2025): https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025
- Marc L tips on speeding up Phaser games: https://gist.github.com/MarcL/748f29faecc6e3aa679a385bffbdf6fe
- Bishop Games — Visual clarity and brightness hierarchy in games: https://www.linkedin.com/pulse/mastering-visual-clarity-gaming-bishop-games
- Mobile game design mistakes (14 categories, 2025): https://ilogos.biz/mobile-game-design-mistakes
- Touch target size research (University of Maryland 2023): https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
- Screen shake design analysis: http://www.davetech.co.uk/gamedevscreenshake
- Web Audio autoplay policy — Phaser UNLOCKED event: https://blog.ourcade.co/posts/2020/phaser-3-web-audio-best-practices-games/
- Game feel and feedback timing — sub-100ms response threshold: https://gamedesignskills.com/game-design/game-feel/
- Mobile game VFX optimization: https://starloopstudios.com/mobile-game-vfx-techniques-for-optimizing-performance-and-visuals/
- This codebase: `.planning/codebase/CONCERNS.md` (2026-02-24) — primary source for existing known bugs and performance bottlenecks

---

*Pitfalls research for: Phaser 3 mobile horde-survivor UX polish*
*Researched: 2026-02-24*
