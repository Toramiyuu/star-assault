# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Scene-based game architecture using Phaser 3's scene lifecycle, with manager/system composition inside the central GameScene.

**Key Characteristics:**
- Phaser 3 scene graph with 5 sequential scenes (Boot -> Preload -> Menu -> Game -> Results)
- GameScene acts as the central hub, instantiating ~12 manager/system objects in `create()`
- No ECS framework -- entities are Phaser physics sprites with data stored via `sprite.setData()`
- Seeded RNG (mulberry32) passed to all systems for deterministic arena runs
- GameScene decomposed into helper modules (`GameScenePlayer.js`, `GameSceneCollisions.js`, `GameSceneDevTools.js`) that accept `scene` as first parameter
- Config-driven design: wave definitions, enemy types, upgrade tables, and scoring constants live in `src/config/`

## Scene Flow

**BootScene** (`src/scenes/BootScene.js`):
- Purpose: Minimal bootstrap -- sets black background, immediately starts Preload
- Contains: 12 lines, no logic

**PreloadScene** (`src/scenes/PreloadScene.js`):
- Purpose: Load all assets (sprites, audio, backgrounds, UI), process boss sprite sheets
- Contains: Asset loading with progress bar, `_removeWhiteBG()` flood-fill algorithm for checkerboard sprite sheet cleanup
- Transitions to: Menu

**MenuScene** (`src/scenes/MenuScene.js`):
- Purpose: Title screen, arena system (weekly seeded challenges), leaderboard display
- Creates: `ArenaManager` to check play eligibility, get weekly seed
- Passes data: `{ seed, dev: devMode }` to GameScene via `scene.start("Game", data)`

**GameScene** (`src/scenes/GameScene.js`):
- Purpose: Core gameplay -- all combat, upgrades, enemies, weapons, boss fights
- Creates 12+ manager instances in `create()` (see Layers below)
- Update loop: ~35 lines calling subsystem updates in sequence
- Transitions to: Results (on death via `playerDeath()` or victory via `triggerVictory()`)

**ResultsScene** (`src/scenes/ResultsScene.js`):
- Purpose: Score breakdown display with detailed combat/accuracy/bonus stats
- Receives: `{ breakdown, seed, victory }` from GameScene
- Records attempt via `ArenaManager.recordAttempt()`
- Transitions to: Menu

## Layers

**Config Layer:**
- Purpose: Static game data -- constants, wave definitions, upgrade tables, synergy definitions
- Location: `src/config/`
- Contains: `constants.js` (GAME/PLAYER/ENEMIES/BOSSES/SCORING/POWERUPS), `waves.js` (WAVE_CONFIGS + ENEMY_TYPES + escalation generator), `upgrades.js` (40 upgrade definitions + rarity weights), `synergies.js` (8 synergy pair definitions)
- Depends on: Nothing
- Used by: Every system and scene

**Scene Layer:**
- Purpose: Phaser scene lifecycle management and game flow
- Location: `src/scenes/`
- Contains: 5 scene classes + 3 GameScene helper modules
- Depends on: Config, Systems, Entities, UI
- Used by: Phaser scene manager (automatic)

**Systems Layer:**
- Purpose: Game logic managers instantiated by GameScene
- Location: `src/systems/`
- Contains: 13 system classes
- Depends on: Config
- Used by: GameScene (owner), GameScene helper modules

**Entity Layer:**
- Purpose: Game objects (player, enemies, boss) -- mostly functions and sprite management, not OOP classes
- Location: `src/entities/`
- Contains: AAXBoss (5 files), EnemyBehaviors (fire patterns), plus unused stub classes (Player.js, Enemy.js, Boss.js, BulletPool.js, PowerUp.js)
- Depends on: Config, Systems (via scene reference)
- Used by: Systems (WaveManager, BossManager)

**Weapons Layer:**
- Purpose: Individual weapon implementations following the WeaponSubsystem pattern
- Location: `src/weapons/`
- Contains: 13 weapon classes + base class
- Depends on: WeaponSubsystem base class, WeaponManager
- Used by: WeaponManager (registry pattern)

**UI Layer:**
- Purpose: In-game UI components
- Location: `src/ui/`
- Contains: `UpgradeCardUI.js` (upgrade selection cards), `StatBar.js` (bottom HUD stat strip)
- Depends on: Config, UpgradeManager
- Used by: GameScene, UpgradeManager

## System Instantiation (GameScene.create)

All systems are created in `GameScene.create()` in this order:

```javascript
// 1. Roguelite upgrade subsystems
this.playerStats = new PlayerStats(this);        // Stat modifiers (flat + percent + caps)
this.xpManager = new XPManager(this, this.random);   // XP orbs, level-up trigger
this.upgradeManager = new UpgradeManager(this, this.random); // Card draw, upgrade application
this.weaponManager = new WeaponManager(this);    // Weapon registry, bullet pool

// 2. Core systems
this.audio = new AudioManager();                 // SFX + procedural music
this.bg = new ScrollingBackground(this);         // Parallax zones
this.explosions = new Explosions(this);          // Frame-by-frame explosion animations
this.hud = new HUD(this);                       // Shield/health/score/wave/XP/boss bars
this.boss = new BossManager(this, this.random);  // Boss spawning + generic boss logic

// 3. Gameplay systems
this.powerups = new PowerUpManager(this, this.random); // Legacy power-up drops
this.waveManager = new WaveManager(this, this.random); // Wave progression, enemy spawning
this.groundDrops = new GroundDropManager(this, this.random); // Ground item drops

// 4. UI
this.statBar = new StatBar(this);               // Bottom stat strip
```

## Data Flow

**Config -> Gameplay:**

1. `src/config/waves.js` defines `WAVE_CONFIGS` (array of 15 wave objects) and `ENEMY_TYPES` (5 enemy type stat blocks)
2. `WaveManager.getWaveConfig()` reads the config for current wave (or generates escalation config for wave 16+)
3. `WaveManager.spawnEnemy()` creates Phaser sprites from `ENEMY_TYPES`, stores HP/speed/fireRate/shield as sprite data
4. `WaveManager.updateEnemy()` reads sprite data each frame to determine movement, firing, and behavior

**Upgrade -> Stats -> Weapons:**

1. `src/config/upgrades.js` defines 40 `UPGRADES` with rarity, type, and per-level stat values
2. `UpgradeManager.drawCards()` uses weighted random (seeded) to select 3 cards from eligible pool
3. `UpgradeManager.applyUpgrade()` calls `PlayerStats.modify()` which adjusts flat/percent modifiers
4. `PlayerStats._apply()` recalculates all stats: `base * (1 + percent) + flat`, clamped to CAPS
5. Stats are written directly to `scene.playerDamage`, `scene.playerFireRate`, etc.
6. `WeaponManager` reads these scene properties each frame for damage/cooldown calculations
7. `MainGun.getBaseInterval()` reads `scene.playerFireRate`; `WeaponManager.getCooldownMultiplier()` reads `scene.playerCooldown`

**Enemy Kill -> XP -> Level Up -> Upgrade Cards:**

1. `GameSceneCollisions.onBulletHitEnemy()` detects kill, calls `xpManager.spawnOrb()`
2. `XPManager.update()` moves orbs, detects collection, calls `addXP()`
3. `XPManager.addXP()` checks threshold, calls `onLevelUp()` -> `upgradeManager.triggerCardSelection()`
4. `UpgradeManager.triggerCardSelection()` pauses game (`upgradePaused = true`, `physics.pause()`), shows `UpgradeCardUI`
5. Player selects card -> `UpgradeManager.applyUpgrade()` -> `UpgradeManager.onCardSelected()` resumes game

**Damage Flow (Player Hit):**

1. Collision detected (enemy bullet/body hits player) -> `scene.damagePlayer()`
2. Check shield: `playerShieldCurrent > 0` -> absorb, play shield SFX
3. Check PowerUp shield: `powerups.useShield()`
4. Apply HP damage: `this.hp--`
5. Check death: `hp <= 0` -> check `upgradeManager.checkUndying()` -> `playerDeath()` or revive
6. Apply invulnerability frames (2500ms flashing)

**Score Flow:**

1. Kills/powerups/waves -> `ScoreManager` methods accumulate points
2. `ScoreManager.getBreakdown()` computes final score: `(baseScore + survivalBonus) * accuracyMultiplier`
3. Passed to ResultsScene, then `ArenaManager.recordAttempt()` persists to localStorage

## Key Abstractions

**Seeded Random (`src/systems/SeededRandom.js`):**
- Purpose: Deterministic randomness for weekly arena challenges
- Implementation: mulberry32 PRNG seeded from string hash
- Usage: `this.random = createSeededRandom(seed)` in GameScene, passed to WaveManager, XPManager, UpgradeManager, GroundDropManager, BossManager
- Pattern: All randomness (enemy spawns, elite rolls, upgrade draws, drop rolls) uses `this.random()` instead of `Math.random()`

**WeaponSubsystem (`src/weapons/WeaponSubsystem.js`):**
- Purpose: Base class for all weapon types
- Pattern: Template Method -- subclasses override `getBaseInterval()`, `fire()`, `drawEffects()`, `onLevelChanged()`
- Registry: `WeaponManager.weapons` Map keyed by weapon ID (e.g., `'B01'`, `'P01'`, `'MAIN'`)
- Examples: `MainGun`, `SpreadCannon`, `TwinLaser`, `OrbitalCannon`, `BlackHole`, `PhotonDevastator`, `BulletStorm`, etc.
- Bullet spawning: `WeaponSubsystem.spawnBullet()` delegates to `WeaponManager.spawnBullet()` which uses a shared physics group (`weaponBullets`, maxSize 80)

**PlayerStats (`src/systems/PlayerStats.js`):**
- Purpose: Centralized stat system with flat + percent modifiers and caps
- Pattern: `base * (1 + percentMods) + flatMods`, clamped to `CAPS`
- 12 stats: playerDamage, playerFireRate, playerSpeed, playerShield, playerMaxHP, playerMagnet, playerCrit, playerPierce, playerSpread, playerCooldown, playerBlastArea, playerLifeSteal
- Stats written directly to scene: `this.scene[key] = val` -- other systems read `scene.playerDamage` etc.

**Sprite Data Pattern (Enemies):**
- Purpose: Per-entity state without classes
- Pattern: Enemies are Phaser sprites created via `scene.enemies.create()` with data stored via `setData()`
- Data keys: `hp`, `maxHP`, `enemyType`, `speed`, `fireRate`, `lastFireTime`, `shield`, `maxShield`, `isElite`, `damaged`, `bomberState`, `dived`
- Read in update: `enemy.getData('hp')`, `enemy.getData('enemyType')`

**Physics Groups (Object Pools):**
- `scene.playerBullets`: Phaser physics group, maxSize 100, `runChildUpdate: true`
- `scene.enemyBullets`: Phaser physics group, maxSize 80, `runChildUpdate: true`
- `scene.weaponManager.weaponBullets`: Phaser physics group, maxSize 80, `runChildUpdate: true`
- `scene.enemies`: Phaser physics group (no maxSize), `runChildUpdate: false` (manually iterated)
- `scene.powerups.group`: Phaser physics group for legacy power-up drops

**Manual Arrays (Non-Physics):**
- `xpManager.orbs`: Array of plain objects `{ x, y, vx, vy, xp, age, collected }` -- drawn via Graphics API, no physics
- `groundDrops.drops`: Array of objects with Phaser graphics references `{ x, y, type, gfx, label, spawnTime, collected }`
- `boss.activeLasers`: Array of laser beam objects for AAX boss collision detection

## Entry Points

**Application Entry (`src/main.js`):**
- Location: `src/main.js`
- Triggers: Loaded by `index.html` as `<script type="module">`
- Responsibilities: Creates Phaser.Game with config (1080x1920, Arcade physics, FIT scaling), registers all 5 scenes
- Exposes: `window.__GAME__` for debugging

**Game Loop (`GameScene.update`):**
- Location: `src/scenes/GameScene.js` lines 433-472
- Triggers: Called every frame by Phaser
- Responsibilities: Coordinates all subsystem updates in sequence:
  1. Background scroll
  2. Player input + exhaust animation
  3. Aim angle calculation (auto-aim toward closest enemy)
  4. Weapon updates (fires weapons based on intervals)
  5. Wave manager (spawning, enemy AI updates)
  6. Boss updates
  7. Shield recharge
  8. Ground drop collection
  9. Enemy health bar rendering
  10. HUD update
  11. XP orb movement/collection
  12. Stat bar refresh
  13. Kill streak bonus calculation

**Dev Mode Entry:**
- Location: `src/scenes/GameSceneDevTools.js`
- Triggers: Window keydown events (I/B/N/K/U/X)
- Activated by: `?dev=1` URL parameter or `data.dev` in scene start

## Error Handling

**Strategy:** Defensive null checks, no try-catch in game loop

**Patterns:**
- Optional chaining everywhere: `this.sprite?.active`, `player?.active`, `scene.upgradeManager?.rollCrit()`
- Guard returns: `if (this.isGameOver) return;` at top of update/action methods
- Fallback values: `bullet.getData('damage') || scene.playerDamage || 10`
- No error boundaries or crash recovery -- if something fails, the game silently continues

## Cross-Cutting Concerns

**Logging:**
- Console.log/warn used sparingly in boss code: `console.log("[BOSS] HP:", ...)`, `console.warn("[BOSS] DEFEATED ...")`
- No structured logging framework

**Validation:**
- No input validation on config data
- Stats capped in `PlayerStats._apply()` using CAPS object
- Wave configs validated implicitly by WaveManager falling back to escalation generator

**Authentication:**
- None -- single-player game
- Arena system uses localStorage for weekly persistence (no server)

**State Management:**
- All game state lives on the GameScene instance as properties (`this.hp`, `this.score`, `this.isGameOver`, etc.)
- Player stats injected directly onto scene: `scene.playerDamage`, `scene.playerSpeed`, etc.
- `upgradePaused` flag gates the entire update loop when upgrade cards are shown
- `cutscenePlaying` flag gates player input and weapon firing during boss cutscenes

**Game Pause Flow:**
- `upgradePaused = true` -> physics.pause() + time.paused = true
- Resume: `upgradePaused = false` -> physics.resume() + time.paused = false + 1s invulnerability

## AAX Boss Architecture

The AAX boss is the most complex entity, split across 5 files:

- `src/entities/AAXBoss.js` -- Main class: state machine (4 phases + horn mode), spawn, update loop, bullet hit detection, dive attack state machine
- `src/entities/AAXBossAttacks.js` -- Attack functions: `fireLasers()`, `fireMouthSpread()`, `fireSpiralBurst()`, `fireScreamBlast()`
- `src/entities/AAXBossHornMode.js` -- Horn mode transition cutscene, sprite sheet swap, death animation, `defeatBoss()`
- `src/entities/AAXBossHUD.js` -- Boss health bar (900px wide, color-coded by HP ratio)
- `src/entities/AAXBossEffects.js` -- Aura rendering, laser collision detection, phase announcement text

**Boss Phase Progression:**
1. Phase 1 (100-75% HP): Eye lasers only, slow movement
2. Phase 2 (75-50% HP): + Mouth spread, + dive attacks
3. Phase 3 (50-25% HP): + Spiral burst, faster movement/attacks
4. Phase 4 / Horn Mode (25-0% HP): Cutscene transition, full HP reset, all attacks at 1.4x speed, + scream blast

**Boss is NOT a physics body** -- uses manual AABB collision checks in `_checkBulletHits()` and `_checkPlayerCollision()` instead of Phaser overlap.

## Audio Architecture

**Dual audio system:**
1. Phaser audio (loaded .mp3 files) -- used when SFX assets exist
2. Web Audio API fallback -- oscillator tones and noise for SFX when no files loaded
3. `ProceduralMusic` -- Step sequencer with 3 phases (cruise/combat/boss), runs on Web Audio API
   - 16th-note resolution, lookahead scheduling pattern
   - Bass (sawtooth + lowpass filter), Lead (square/sawtooth), Drums (kick/snare/hihat)
   - Crossfade transitions between phases (2s fade)

---

*Architecture analysis: 2026-02-24*
