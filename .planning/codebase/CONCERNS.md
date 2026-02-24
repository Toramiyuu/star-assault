# Codebase Concerns

**Analysis Date:** 2026-02-24

## Tech Debt

**Dead Entity Classes:**
- Issue: Five empty stub classes exist from initial scaffolding and are never imported or used anywhere in active code.
- Files: `src/entities/Player.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`, `src/entities/BulletPool.js`, `src/entities/PowerUp.js`
- Impact: Confusing for contributors; suggests an unused OOP architecture that was abandoned for a more procedural style.
- Fix approach: Delete all five files. No imports reference them.

**Scene-as-God-Object Pattern (GameScene):**
- Issue: `GameScene` stores 30+ state properties directly on `this` (hp, shield, killStreak, lifeStealDmgAccum, godMode, aimAngle, etc.) and every manager/system reads and writes these properties via `scene.someProperty`. PlayerStats._apply() writes computed stats directly onto the scene instance.
- Files: `src/scenes/GameScene.js` (lines 44-68), `src/systems/PlayerStats.js` (line 98: `this.scene[key] = val`)
- Impact: Extreme coupling. Every system depends on magic properties on the scene object. Adding a new stat requires knowledge of PlayerStats defaults, caps, the scene property convention, and every consumer. No type safety. Impossible to unit test any system in isolation.
- Fix approach: Create a shared game state object (e.g., `GameState` class) with explicit getters/setters. Inject it into managers instead of passing the entire scene. Start with PlayerStats: make it own the data rather than mutating the scene.

**Duplicated Enemy Kill Logic:**
- Issue: Enemy death handling (XP spawn, score award, explosion, floating text, ground drops, kill streak, death nova) is duplicated in at least 4 places with inconsistent coverage.
- Files:
  - `src/scenes/GameSceneCollisions.js` (lines 110-154) - full kill logic with XP, drops, streak, nebula, death nova
  - `src/systems/GroundDropManager.js` (lines 443-453) - bomb AoE kills: XP orbs but no score, no streak, no death nova, no ground drops
  - `src/systems/WeaponManager.js` (lines 194-203) - damageEnemiesInRadius: XP orbs but no score, no streak, no death nova, no ground drops
  - `src/weapons/TwinLaser.js` (lines 77-87) - XP orbs but no score, no streak, no death nova, no ground drops
- Impact: Enemies killed by AoE weapons, bomb drops, or twin laser do not award score, do not increment kill streak, do not trigger Death Nova chains, and do not spawn ground drops. This is a gameplay inconsistency that players may notice.
- Fix approach: Extract a canonical `killEnemy(scene, enemy, killerType)` function that all kill paths call. Place it in a shared module like `src/systems/CombatUtils.js`.

**Duplicated findBestCluster Algorithm:**
- Issue: `BlackHole.findBestCluster()` and `WarpStrike.findBestCluster()` contain identical O(n^2) implementations.
- Files: `src/weapons/BlackHole.js` (lines 37-67), `src/weapons/WarpStrike.js` (lines 84-113)
- Impact: Code duplication. Both also push boss sprite into the enemies array, which mutates a Phaser group's internal list (potential side effect).
- Fix approach: Move `findBestCluster` into `WeaponSubsystem` base class or into `WeaponManager` as a shared utility.

**Duplicated getClosestEnemy:**
- Issue: `getClosestEnemy` is implemented in both `src/scenes/GameScenePlayer.js` and `src/weapons/WeaponSubsystem.js` with identical logic.
- Files: `src/scenes/GameScenePlayer.js` (lines 119-137), `src/weapons/WeaponSubsystem.js` (lines 53-68)
- Impact: If targeting logic changes (e.g., priority targeting), two places need updating.
- Fix approach: Consolidate into a single function in `WeaponManager` or a shared utility.

**Bullet update() Override Pattern:**
- Issue: Every bullet spawned gets its own `update = function() {...}` closure assigned at spawn time. This happens in 8+ locations (GameScene.fireEnemyBullet, GameScenePlayer.firePlayerBullet, AAXBossAttacks.spawnBullet, EnemyBehaviors, BossManager.fireBullets, WeaponManager.spawnBullet, AAXBoss._fireDiveBurst).
- Files: `src/scenes/GameScene.js` (line 209), `src/scenes/GameScenePlayer.js` (line 78), `src/entities/AAXBossAttacks.js` (line 10), `src/entities/EnemyBehaviors.js` (lines 21, 48), `src/systems/BossManager.js` (line 136), `src/systems/WeaponManager.js` (line 149), `src/entities/AAXBoss.js` (line 356)
- Impact: Creates a new function object per bullet per frame cycle. With pools of 100+80+80 bullets and `runChildUpdate: true`, these closures are created frequently. GC pressure in hot loops. Also, every bullet's bounds-check logic is subtly different (some use 50, others 60, others GAME.WIDTH+50 vs GAME.WIDTH+60).
- Fix approach: Create a single shared update function per bullet type (enemy/player) and assign it once. Use a class or prototype method. Standardize the off-screen margin.

**Two Overlapping Shield Systems:**
- Issue: Both `PowerUpManager` (legacy shield power-up) and the new Halo-style shield recharge system (playerShieldCurrent/playerShield) coexist. `damagePlayer()` checks `playerShieldCurrent` first, then falls through to `powerups.useShield()`. The legacy `shieldActive` flag on the scene is set by PowerUpManager but never read by anything meaningful.
- Files: `src/scenes/GameScene.js` (lines 243-271), `src/systems/PowerUpManager.js` (lines 69-71, 93-101)
- Impact: Confusing dual shield logic. The legacy shield is a one-time-use power-up that persists until hit; the new system has regenerating pips. Players could theoretically have both active simultaneously.
- Fix approach: Decide if legacy shield power-ups are still intended gameplay. If not, remove the shield type from PowerUpManager. If yes, document the interaction order clearly.

## Known Bugs

**Magnet Ground Drop Crashes:**
- Symptoms: Collecting a "magnet" ground drop causes a runtime error because it references `scene.xpManager.orbGroup` which does not exist. XPManager uses a plain `this.orbs` array, not a Phaser physics group.
- Files: `src/systems/GroundDropManager.js` (line 297: `scene.xpManager.orbGroup.getChildren().forEach(...)`)
- Trigger: Kill an enemy, collect the magnet drop.
- Workaround: None. This code path crashes every time a magnet drop is collected.
- Fix: Replace line 297 with iteration over `scene.xpManager.orbs` and set each orb's position directly (they are plain objects with x/y properties, not sprites).

**Death Nova Recursive Stack Overflow Risk:**
- Symptoms: In dense enemy groups, `checkDeathNova()` recursively calls itself when a chain-killed enemy also triggers Death Nova. With high enough enemy density and Death Nova chance, this can stack overflow.
- Files: `src/systems/UpgradeManager.js` (lines 452-479, specifically line 475: `this.checkDeathNova(e.x, e.y)`)
- Trigger: High Death Nova chance (e.g., 30-40%) + large cluster of low-HP enemies.
- Workaround: Current low Death Nova chances (5-15% per level) make this rare.
- Fix: Convert recursion to iterative queue. Track already-processed positions to prevent infinite chains.

**Horn Mode Resets Boss HP to Full:**
- Symptoms: When the boss enters Horn Mode at 25% HP, `_startHornMode()` sets `boss.hp = boss.maxHP`, giving it a full health bar again. This is likely intentional design but could be perceived as a bug by players since there is no visual indication that the boss healed.
- Files: `src/entities/AAXBossHornMode.js` (line 92: `boss.hp = boss.maxHP`)
- Trigger: Boss reaches 25% HP.
- Workaround: None needed if intentional, but add a floating text like "FULL RESTORE" to make it clear.

**WarpStrike Teleports Player Into Danger:**
- Symptoms: WarpStrike teleports the player to a cluster of enemies for 200ms, during which the player can take collision damage from enemies since the weapon does not grant invulnerability during the teleport window.
- Files: `src/weapons/WarpStrike.js` (lines 33-34: `player.x = target.x; player.y = target.y`, line 76: 200ms return delay)
- Trigger: WarpStrike fires automatically.
- Workaround: None.
- Fix: Set `scene.isInvulnerable = true` before teleport and restore after the 200ms return.

## Security Considerations

**localStorage Data Integrity:**
- Risk: Arena data (scores, attempts, leaderboard) stored in localStorage can be trivially modified by players via browser DevTools to fake high scores.
- Files: `src/systems/ArenaManager.js` (lines 37-40: raw JSON parse/stringify)
- Current mitigation: None.
- Recommendations: For a casual single-player game this is acceptable. If leaderboards ever become competitive/shared, move to server-side validation with the seeded RNG as a replay verification mechanism.

**DevMode Accessible in Production:**
- Risk: Dev mode is toggled by passing `dev: true` in scene data. The dev key handlers are always registered on window (keydown/keyup) regardless of devMode flag, but `handleDevKey` guards with `devMode` checks for some keys only (B, N check `!scene.isGameOver` but not `devMode`). The god mode toggle (I key) works regardless.
- Files: `src/scenes/GameScene.js` (lines 184-185: window.addEventListener always runs), `src/scenes/GameSceneDevTools.js` (line 4: no devMode guard on handleDevKey)
- Current mitigation: DevMode defaults to false; keys do nothing unless `devMode` is true (except the handlers are still registered).
- Recommendations: Wrap `window.addEventListener` calls inside `if (this.devMode)` to avoid unnecessary event listeners in production. Consider a build-time flag to strip dev tools entirely.

## Performance Bottlenecks

**Per-Frame Enemy Health Bar Redraw:**
- Problem: `drawEnemyHealthBars()` clears and redraws a single shared Graphics object every frame, iterating all enemies and drawing 2-4 filled rects per enemy (HP bar + shield bar + backgrounds).
- Files: `src/scenes/GameScene.js` (lines 371-409)
- Cause: Graphics.clear() + fillRect per enemy per frame. With 20+ enemies on screen, this is 80+ draw calls on a single graphics layer every frame.
- Improvement path: Only redraw when enemy HP changes. Or use a RenderTexture. Or draw bars only for enemies below full HP. Consider individual graphics objects per enemy that move with the sprite, so unchanged bars are not redrawn.

**Per-Frame XP Orb Redraw:**
- Problem: XPManager redraws all XP orbs every frame using a single Graphics object. Each orb draws 4 filled circles (outer glow, mid glow, core, center dot) plus conditional magnet trail lines.
- Files: `src/systems/XPManager.js` (lines 74-129)
- Cause: Graphics.clear() + 4 fillCircle calls per orb per frame. With 15+ orbs from AoE kills, this is 60+ draw operations per frame.
- Improvement path: Use sprite-based orbs with a pre-rendered texture (RenderTexture or generated canvas) instead of per-frame Graphics drawing. The orb visual is static; only position changes.

**Per-Frame HUD Bar Redraws:**
- Problem: HUD clears and redraws shield bar fill, health bar fill, and shield glow graphics every single frame even when values haven't changed.
- Files: `src/systems/HUD.js` (lines 121-173)
- Cause: `update()` called every frame from GameScene.update().
- Improvement path: Track previous values and only redraw when shield/health ratio actually changes. The shield recharge pulse animation is the only thing requiring continuous updates.

**O(n^2) Cluster Finding:**
- Problem: `findBestCluster()` iterates all enemies for each enemy candidate, making it O(n^2). Called by BlackHole and WarpStrike on their fire timers.
- Files: `src/weapons/BlackHole.js` (lines 37-67), `src/weapons/WarpStrike.js` (lines 84-113)
- Cause: Brute-force nearest-neighbor search.
- Improvement path: For typical enemy counts (<30), this is acceptable. If enemy counts scale up, use spatial hashing or just pick the densest pre-computed region.

**Web Audio Node Creation Per Note:**
- Problem: ProceduralMusic creates and connects new OscillatorNode + BiquadFilterNode + GainNode for every single musical note, every step. At 130 BPM with 16th notes, that is ~8.7 nodes/sec for bass, ~8.7 for lead, plus drum nodes. The AudioContext accumulates disconnected nodes for GC.
- Files: `src/systems/ProceduralMusic.js` (lines 218-237: `_tone()`, lines 239-253: `_kick()`, lines 255-273: `_snare()`)
- Cause: Web Audio nodes are single-use (oscillators can only be started once), so this is somewhat unavoidable. However, filter and gain nodes could be reused.
- Improvement path: Pool gain and filter nodes. Reuse filter nodes by resetting frequency/Q. This is a minor concern since the browser's audio thread handles node cleanup efficiently, but on low-end mobile devices it could contribute to audio glitches.

**AudioManager._noise Creates New Buffer Per Call:**
- Problem: Each SFX noise call (explosions, shield break) creates a brand new AudioBuffer filled with random data.
- Files: `src/systems/AudioManager.js` (lines 151-165)
- Cause: New buffer allocation per sound effect.
- Improvement path: Pre-generate a shared noise buffer (like ProceduralMusic does with `this.noiseBuffer`) and reuse it for all noise-based SFX.

**TwinLaser Double Enemy Iteration:**
- Problem: TwinLaser iterates ALL enemies twice per frame -- once in `fire()` for damage (every 100ms tick) and once in `drawEffects()` for spark rendering (every frame). With two beam origins, that is 4 full enemy list iterations per frame.
- Files: `src/weapons/TwinLaser.js` (lines 58-91 for fire, lines 145-154 for drawEffects)
- Cause: No caching of hit results between fire() and drawEffects().
- Improvement path: Cache the list of hit enemies from `fire()` and reuse it in `drawEffects()`.

## Fragile Areas

**Scene Transition / Cleanup:**
- Files: `src/scenes/GameScene.js` (lines 412-417: `shutdown()`), all manager classes
- Why fragile: `shutdown()` only removes window event listeners. None of the managers (WaveManager, UpgradeManager, XPManager, GroundDropManager, WeaponManager, AudioManager, ProceduralMusic) are explicitly destroyed when transitioning from GameScene to ResultsScene. Phaser's scene.start() destroys the old scene's display list, but:
  - ProceduralMusic's `setTimeout`-based scheduler (line 183: `this.timerId = setTimeout(...)`) will continue running after scene transition since it uses raw `setTimeout`, not `scene.time`.
  - AudioManager's Web Audio context and master gain persist across scene transitions (created once, never cleaned up).
  - Window event listeners for dev keys are cleaned up, but only if `_onDevKeyDown` is truthy.
- Safe modification: Always call `this.proceduralMusic.stop()` in a scene shutdown handler. Add explicit `destroy()` calls for all managers in GameScene's shutdown/destroy lifecycle hook.
- Test coverage: No tests exist.

**delayedCall + scene.time.paused Interaction:**
- Files: `src/systems/UpgradeManager.js` (line 49: `scene.time.paused = true`), `src/ui/UpgradeCardUI.js` (line 315: `scene.time.paused = false`)
- Why fragile: When upgrade cards are shown, `scene.time.paused = true` stops the Phaser time. But `delayedCall` timers created BEFORE the pause (e.g., invulnerability timers, boost duration timers from GroundDropManager) also freeze. When unpaused, they resume -- but their real-world duration was extended by however long the player spent choosing an upgrade. This means invulnerability could last much longer than intended if the player pauses during it.
- Safe modification: Track real-time for duration-sensitive effects using `Date.now()` instead of scene time, or use `scene.time.paused` only for physics and not the timer.
- Test coverage: No tests exist.

**PlayerStats Flat/Percent Modifier Accumulation:**
- Files: `src/systems/PlayerStats.js` (lines 61-87), `src/systems/UpgradeManager.js` (lines 160-178)
- Why fragile: `_removeUpgradeValues` and `_applyUpgradeValues` assume perfect symmetry -- every `addFlat(stat, val)` must have a corresponding `removeFlat(stat, val)` with exactly the same value. Floating point arithmetic means accumulated add/remove cycles may drift. The Supernova cosmic upgrade adds 5.0 percent damage then removes it after 20s, but if the player levels up during those 20s and the timer fires while paused, the removal could fail silently.
- Safe modification: Use named modifier keys (e.g., `modifiers['supernova'] = 5.0`) instead of anonymous accumulation, so modifiers can be precisely added and removed.
- Test coverage: No tests exist.

**Boss Bullet Hit Detection (Manual AABB):**
- Files: `src/entities/AAXBoss.js` (lines 381-401: `_checkBulletHits()`)
- Why fragile: Boss bullet collision is done manually each frame by iterating ALL player bullets and ALL weapon bullets, checking AABB overlap against the boss sprite. This bypasses Phaser's physics overlap system (which is used for regular enemies). If new bullet sources are added, they must be manually added to `_checkBulletHits()`.
- Safe modification: Use Phaser's physics.add.overlap for the boss sprite as well, same as regular enemies. The boss sprite is not in the enemies group, which is why it was done manually.
- Test coverage: No tests exist.

## Scaling Limits

**Bullet Pool Exhaustion:**
- Current capacity: playerBullets: 100, enemyBullets: 80, weaponBullets: 80
- Limit: When pools are exhausted, `group.get()` returns null and bullets silently fail to spawn. With high fire rates (BulletStorm = 10x fire rate), the spread synergy (up to 7 bullets per shot), and boss phases firing 16-bullet scream blasts, the enemy bullet pool can exhaust during intense boss fights.
- Scaling path: Increase pool sizes or implement dynamic pool growth. Add pool exhaustion logging to detect when it occurs.

**Enemy Group Growth:**
- Current capacity: Unbounded Phaser physics group (no maxSize set).
- Limit: With continuous spawning (minAlive enforcement + regular spawn intervals), enemy counts can grow significantly in escalation waves (wave 11+). Each enemy has physics body, sprite, data map, and gets health bar drawn per frame.
- Scaling path: Add a hard cap (e.g., 40 enemies). The 600px off-screen cleanup margin in WaveManager is generous; reduce to 200px.

**Graphics Object Accumulation:**
- Current capacity: Multiple systems create and destroy Graphics objects for transient effects (bomb drama particles, elite spawn flashes, shield break flashes, vignette overlays). Each creates a new `scene.add.graphics()`.
- Limit: Under rapid fire (many kills per second), many transient Graphics objects exist simultaneously, each with tween animations and delayed destruction.
- Scaling path: Pool graphics objects for common effects. Use a single shared graphics object for transient effects.

## Dependencies at Risk

**No Package Lock Concerns (Minimal Dependencies):**
- Risk: Low. This project uses Phaser 3 as its only runtime dependency, loaded via Vite.
- Impact: Phaser version upgrades could break arcade physics API.
- Migration plan: Pin Phaser version in package.json.

## Missing Critical Features

**No Scene Lifecycle Cleanup:**
- Problem: GameScene has no `destroy()` or comprehensive `shutdown()` method. When transitioning to ResultsScene, all managers, graphics objects, tweens, and timers from the game session are abandoned to Phaser's built-in scene destruction. The ProceduralMusic setTimeout scheduler specifically survives scene transitions.
- Blocks: Playing multiple games in a single browser session may accumulate orphaned audio schedulers, causing audio glitches or memory growth.

**No Pause/Resume Support:**
- Problem: There is no pause menu or ability to pause the game mid-play (other than the upgrade card selection pause). No visibility change handler (e.g., when player switches browser tabs).
- Blocks: Mobile players who receive a notification or switch apps lose their game with no way to resume.

**No Error Boundaries:**
- Problem: No try/catch anywhere in the update loop or collision handlers. A single null reference (e.g., accessing destroyed sprite properties) crashes the entire game loop.
- Blocks: Graceful error recovery. The magnet drop bug (see Known Bugs) would crash the game with no recovery.

## Test Coverage Gaps

**No Tests Exist:**
- What's not tested: The entire codebase. There are no test files, no test framework configured, no test scripts in package.json.
- Files: All files under `src/`
- Risk: Every change is a potential regression. The duplicated kill logic, stat modifier accumulation, upgrade application, and boss phase transitions are all untested.
- Priority: High. Critical areas to test first:
  1. `PlayerStats` modifier math (flat + percent + caps)
  2. `UpgradeManager.applyUpgrade` / `_removeUpgradeValues` symmetry
  3. `XPManager.addXP` threshold/level-up logic
  4. `WaveManager.pickEnemyType` weighted random distribution
  5. Kill logic consistency (score, XP, streak, drops)

---

*Concerns audit: 2026-02-24*
