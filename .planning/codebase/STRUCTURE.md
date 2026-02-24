# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
star-assault/
├── assets/                  # All game assets (images, audio, spritesheets)
│   ├── backgrounds/         # Parallax background layers (bg_base, bg_stars, bg_planets)
│   ├── bosses/              # Generic boss sprites (boss_01-03)
│   ├── enemies/             # Enemy sprites + damaged variants + bullets + explosions
│   ├── objects/             # Meteor sprites (meteor_01-06)
│   ├── powerups/            # Legacy power-up item sprites
│   ├── sfx/                 # Sound effects (.mp3) and music loop
│   ├── ships/               # Player ship, exhaust frames, bullets, explosions
│   ├── ui/                  # UI elements (health_dot, pause_btn)
│   ├── boss-aax.png         # AAX boss sprite sheet (3x4 grid, ~640x736 frames)
│   ├── deathanimation.png   # AAX death animation sprite sheet
│   ├── enteringhornmode.png # AAX horn mode entry sprite sheet
│   └── expressions.png      # AAX horn mode expressions sprite sheet
├── scripts/                 # Build/utility scripts
│   └── generate-sfx.js      # SFX generation script (puppeteer-based)
├── src/                     # All source code
│   ├── config/              # Static game configuration data
│   ├── entities/            # Game entity classes and behavior functions
│   ├── scenes/              # Phaser scene classes + helper modules
│   ├── systems/             # Manager/system classes
│   ├── ui/                  # In-game UI components
│   ├── utils/               # Shared utility functions
│   ├── weapons/             # Weapon subsystem implementations
│   └── main.js              # Application entry point
├── index.html               # Single-page HTML shell
├── package.json             # NPM manifest (phaser 4.0.0-rc.6, vite 7.3.1)
├── vite.config.js           # Vite config (relative base, dist output)
└── .nvmrc                   # Node version specification
```

## Directory Purposes

**`src/config/`:**
- Purpose: All static game data -- no logic, only exports of constants/arrays/objects
- Contains: 4 files
- Key files:
  - `constants.js`: `GAME`, `PLAYER`, `ENEMIES`, `BOSSES`, `SCORING`, `POWERUPS` objects
  - `waves.js`: `WAVE_CONFIGS` (15 wave definitions), `ENEMY_TYPES` (5 enemy stat blocks), `generateEscalationConfig()` for infinite waves
  - `upgrades.js`: `UPGRADES` (40 upgrade definitions), `RARITY_WEIGHTS`, `RARITY_COLORS`
  - `synergies.js`: `SYNERGIES` (8 synergy pair definitions with bonuses)

**`src/scenes/`:**
- Purpose: Phaser scene lifecycle classes and GameScene decomposition modules
- Contains: 8 files (5 scene classes + 3 helper modules)
- Key files:
  - `BootScene.js`: Minimal bootstrap (12 lines)
  - `PreloadScene.js`: Asset loading + sprite sheet processing
  - `MenuScene.js`: Title/menu with arena system
  - `GameScene.js`: Core gameplay hub (~473 lines)
  - `ResultsScene.js`: Score breakdown display
  - `GameScenePlayer.js`: Player creation, input handling, exhaust animation, firing, death, victory
  - `GameSceneCollisions.js`: All collision handlers (bullet-enemy, enemy-player, bullet-player)
  - `GameSceneDevTools.js`: Dev mode key handlers (god mode, skip wave, kill all, force level-up)

**`src/systems/`:**
- Purpose: Stateful manager classes instantiated by GameScene
- Contains: 13 files
- Key files:
  - `WaveManager.js`: Wave progression, enemy spawning, enemy AI update per frame (~493 lines)
  - `BossManager.js`: Generic boss spawning/phases + AAX boss delegation
  - `AudioManager.js`: SFX playback (Phaser + Web Audio fallback) + music control
  - `ProceduralMusic.js`: Step sequencer with 3 phase definitions (cruise/combat/boss)
  - `PlayerStats.js`: Stat system with flat/percent modifiers and caps
  - `XPManager.js`: XP orb spawning, magnet collection, level-up trigger
  - `UpgradeManager.js`: Card draw, upgrade application, synergy checking, special mechanics
  - `WeaponManager.js`: Weapon registry, shared bullet pool, damage calculation
  - `GroundDropManager.js`: Ground item drops (heart, shield, bomb, magnet, boost, elite_shard)
  - `HUD.js`: Shield bar, health bar, score, wave text, XP bar, boss HP bar
  - `ScrollingBackground.js`: Parallax scroll with zone-based tint/speed changes
  - `ScoreManager.js`: Score accumulation, accuracy tracking, breakdown generation
  - `ArenaManager.js`: Weekly challenge persistence (localStorage), attempt tracking
  - `Explosions.js`: Frame-by-frame explosion sprite animation
  - `PowerUpManager.js`: Legacy power-up system (rapid fire, spread shot, shield, missile, score multi)
  - `SeededRandom.js`: mulberry32 PRNG with string hash seeding

**`src/entities/`:**
- Purpose: Game object implementations
- Contains: 10 files (5 active AAX boss files + 1 enemy behaviors + 4 unused stubs)
- Key files:
  - `AAXBoss.js`: Main boss class -- 4-phase state machine, dive attacks, collision detection (~456 lines)
  - `AAXBossAttacks.js`: Boss attack functions (lasers, mouth spread, spiral burst, scream blast)
  - `AAXBossHornMode.js`: Horn mode cutscene transition + death sequence
  - `AAXBossHUD.js`: Boss health bar rendering
  - `AAXBossEffects.js`: Aura rendering, laser collision, phase announcements
  - `EnemyBehaviors.js`: Enemy-specific fire patterns (dive spread, aimed bullet, formation burst)
- **Unused stubs** (empty class shells, not imported anywhere):
  - `Player.js`, `Enemy.js`, `Boss.js`, `BulletPool.js`, `PowerUp.js`

**`src/weapons/`:**
- Purpose: Individual weapon implementations extending WeaponSubsystem
- Contains: 14 files (1 base class + 13 weapon implementations)
- Key files:
  - `WeaponSubsystem.js`: Base class with `fire()`, `update()`, `drawEffects()`, `getBaseInterval()` template methods
  - `MainGun.js`: Default player weapon, handles aim angle + spread count
  - `SpreadCannon.js` (B01): Replaces main gun with fan pattern
  - `RearGuard.js` (B02): Fires backward
  - `PlasmaBurst.js` (B03): AoE ring around player
  - `SeekerDrone.js` (B04): Homing missiles
  - `NebulaRounds.js` (B07): Damage clouds on kill
  - `TwinLaser.js` (P01): Continuous dual lasers, overrides main gun
  - `OrbitalCannon.js` (P02): Orbiting satellite turret
  - `BlackHole.js` (P03): Gravity well pulls enemies
  - `WarpStrike.js` (P08): Teleport + AoE detonation
  - `EventHorizon.js` (R01): Permanent gravitational pull
  - `PhotonDevastator.js` (R02): Full-width beam, overrides main gun
  - `BulletStorm.js` (R04): Temporary 10x fire rate burst

**`src/ui/`:**
- Purpose: In-game UI overlay components
- Contains: 2 files
- Key files:
  - `UpgradeCardUI.js`: Upgrade selection card display -- 920x260 cards stacked vertically, slide-in animation, hover/click interactions (~342 lines)
  - `StatBar.js`: Bottom HUD strip showing DMG/RATE/SPD/SH/HP/CRIT/PIER/STK + kill streak counter (top-right)

**`src/utils/`:**
- Purpose: Shared utility functions
- Contains: 1 file
- Key files:
  - `helpers.js`: Currently empty (0 exports)

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell, loads `src/main.js` as ES module
- `src/main.js`: Creates Phaser.Game, registers all scenes, exposes `window.__GAME__`

**Configuration:**
- `vite.config.js`: Vite build config (relative base, dist output, auto-open dev server)
- `package.json`: Dependencies (phaser ^4.0.0-rc.6, vite ^7.3.1, puppeteer ^24.37.5 devDep)
- `src/config/constants.js`: Game dimensions (1080x1920), player/enemy base stats, scoring values
- `src/config/waves.js`: Wave definitions + enemy type stats + infinite escalation generator
- `src/config/upgrades.js`: Full upgrade catalog (40 upgrades across 6 rarities)
- `src/config/synergies.js`: 8 upgrade synergy pair definitions

**Core Logic:**
- `src/scenes/GameScene.js`: Central hub -- system instantiation, update loop, shield recharge, floating text
- `src/scenes/GameScenePlayer.js`: `createPlayer()`, `handleInput()`, `firePlayerBullet()`, `playerDeath()`, `triggerVictory()`, `getClosestEnemy()`
- `src/scenes/GameSceneCollisions.js`: `setupCollisions()`, `onBulletHitEnemy()` (damage, kill, XP, drops, pierce, life steal, death nova), `onEnemyBulletHitPlayer()`, `onEnemyHitPlayer()`
- `src/systems/WaveManager.js`: Enemy spawning, weighted type selection, per-enemy AI update (movement patterns, firing logic, bomber state machine)
- `src/systems/WeaponManager.js`: Weapon registry, `spawnBullet()` with damage/crit/pierce data, `damageEnemiesInRadius()` AoE helper

**Testing:**
- No test files exist in the project

## Naming Conventions

**Files:**
- Scene classes: PascalCase matching class name (`GameScene.js`, `PreloadScene.js`)
- Scene helpers: PascalCase with scene prefix (`GameScenePlayer.js`, `GameSceneCollisions.js`)
- System classes: PascalCase matching class name (`WaveManager.js`, `PlayerStats.js`)
- Weapon classes: PascalCase matching class name (`MainGun.js`, `SpreadCannon.js`)
- Config files: camelCase (`constants.js`, `waves.js`, `upgrades.js`, `synergies.js`)

**Directories:**
- Lowercase plural: `scenes/`, `systems/`, `entities/`, `weapons/`, `config/`, `ui/`, `utils/`

**Exports:**
- Classes: Named exports (`export class GameScene`, `export class WaveManager`)
- Functions: Named exports (`export function createPlayer`, `export function setupCollisions`)
- Config: Named const exports (`export const GAME = {...}`, `export const UPGRADES = [...]`)
- Default exports: None used anywhere

**Asset Keys:**
- Sprites: `player`, `enemy_01` through `enemy_06`, `boss_01` through `boss_03`, `boss-aax`
- Damaged variants: `enemy_01_damaged` through `enemy_06_damaged`
- Bullets: `player_bullet_1` through `player_bullet_6`, `enemy_bullet_1` through `enemy_bullet_4`
- Explosions: `player_explosion_1` through `player_explosion_7`, `enemy_explosion_0` through `enemy_explosion_8`
- Audio: `sfx_shoot`, `sfx_enemy_explosion`, `sfx_player_hit`, `music_loop`, etc.

## Import Graph

**src/main.js** imports:
- `phaser`
- All 5 scene classes from `src/scenes/`

**src/scenes/GameScene.js** imports (heaviest file):
- `src/config/constants.js` (GAME, PLAYER, ENEMIES)
- `src/systems/ScrollingBackground.js`
- `src/systems/HUD.js`
- `src/systems/Explosions.js`
- `src/systems/WaveManager.js`
- `src/systems/PowerUpManager.js`
- `src/systems/ScoreManager.js`
- `src/systems/AudioManager.js`
- `src/systems/BossManager.js`
- `src/systems/SeededRandom.js`
- `src/systems/PlayerStats.js`
- `src/systems/XPManager.js`
- `src/systems/UpgradeManager.js`
- `src/systems/WeaponManager.js`
- `src/systems/GroundDropManager.js`
- `src/scenes/GameScenePlayer.js`
- `src/scenes/GameSceneCollisions.js`
- `src/scenes/GameSceneDevTools.js`
- `src/ui/StatBar.js`

**src/systems/WaveManager.js** imports:
- `src/config/constants.js`
- `src/config/waves.js`
- `src/entities/EnemyBehaviors.js`

**src/systems/WeaponManager.js** imports:
- `src/config/constants.js`
- All 13 weapon classes from `src/weapons/`

**src/systems/UpgradeManager.js** imports:
- `src/config/constants.js`
- `src/config/upgrades.js`
- `src/config/synergies.js`
- `src/ui/UpgradeCardUI.js`

**src/systems/AudioManager.js** imports:
- `src/systems/ProceduralMusic.js`

**src/systems/BossManager.js** imports:
- `src/config/constants.js`
- `src/entities/AAXBoss.js`
- `src/scenes/GameScenePlayer.js` (triggerVictory)

**src/entities/AAXBoss.js** imports:
- `src/config/constants.js`
- `src/entities/AAXBossAttacks.js`
- `src/entities/AAXBossHornMode.js`
- `src/entities/AAXBossHUD.js`
- `src/entities/AAXBossEffects.js`

**Cross-layer dependency rule:** Systems never import other systems directly. They communicate through the shared `scene` reference (e.g., `this.scene.xpManager`, `this.scene.upgradeManager`).

## Where to Add New Code

**New Enemy Type:**
1. Add stat block to `ENEMY_TYPES` in `src/config/waves.js`
2. Add scale constant to `ENEMY_SCALES` in `src/systems/WaveManager.js` (line 10)
3. Add movement/AI behavior as a new `case` in `WaveManager.updateEnemy()` switch statement
4. Add firing behavior function in `src/entities/EnemyBehaviors.js` if it shoots uniquely
5. Add to wave configs in `src/config/waves.js` enemy arrays
6. Add sprite key to `PreloadScene.preload()` in `src/scenes/PreloadScene.js`
7. Add XP value to `XP_PER_ENEMY` in `src/systems/XPManager.js`

**New Weapon:**
1. Create `src/weapons/NewWeapon.js` extending `WeaponSubsystem`
2. Override `getBaseInterval()`, `fire()`, optionally `drawEffects()` and `onLevelChanged()`
3. Register in `WEAPON_CLASSES` map in `src/systems/WeaponManager.js` (line 16)
4. Add upgrade definition to `src/config/upgrades.js` with `type: 'weapon'` and `weaponId: 'XX'`
5. Handle any special mechanics in `UpgradeManager.applyUpgrade()` if needed

**New Upgrade (Passive/Defense):**
1. Add definition to `UPGRADES` array in `src/config/upgrades.js`
2. If it has a `special` field, add handler in `UpgradeManager._applySpecialPassive()` or `_applyDefenseUpgrade()`
3. If it modifies existing stats, use standard `values` object -- `PlayerStats` handles it automatically
4. If it introduces new stats, add default + cap to `PlayerStats` DEFAULTS/CAPS objects

**New Synergy:**
1. Add entry to `SYNERGIES` array in `src/config/synergies.js`
2. If bonus requires special logic (not just stat boosts), add handler in `UpgradeManager._applySynergyBonus()`

**New Ground Drop Type:**
1. Add to `DROPS` object in `src/systems/GroundDropManager.js` (line 4)
2. Add shape drawing in `_drawShape()` method
3. Add collection logic in `_collectDrop()` switch statement

**New Scene:**
1. Create `src/scenes/NewScene.js` extending `Phaser.Scene`
2. Register in scene array in `src/main.js` (line 24)
3. Transition via `this.scene.start('NewSceneName')`

**New System/Manager:**
1. Create `src/systems/NewManager.js`
2. Instantiate in `GameScene.create()` at appropriate point
3. Call `update()` in `GameScene.update()` if it needs per-frame logic
4. Store on `this.newManager` so other systems can access via `scene.newManager`

**New UI Component:**
1. Create `src/ui/NewComponent.js`
2. Instantiate in `GameScene.create()` after systems are ready
3. Call `update()` in `GameScene.update()` if needed

## Special Directories

**`assets/`:**
- Purpose: All game assets loaded by PreloadScene
- Generated: Partially (sfx generated by `scripts/generate-sfx.js`)
- Committed: Yes

**`scripts/`:**
- Purpose: Build/utility scripts
- Contains: `generate-sfx.js` (puppeteer-based SFX generation)
- Generated: No
- Committed: Yes

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `vite build`)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**`.claude/`:**
- Purpose: Claude Code agent configurations and commands
- Generated: No
- Committed: Yes (tracked in git)

**`.planning/`:**
- Purpose: GSD planning documents and codebase analysis
- Generated: Yes (by GSD commands)
- Committed: Varies

## File Size Reference (Largest Source Files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/config/upgrades.js` | 423 | 40 upgrade definitions |
| `src/systems/WaveManager.js` | 493 | Wave/enemy spawning + AI |
| `src/scenes/GameScene.js` | 473 | Core gameplay hub |
| `src/systems/UpgradeManager.js` | 481 | Upgrade logic + synergies |
| `src/systems/GroundDropManager.js` | 479 | Ground drops + bomb drama |
| `src/entities/AAXBoss.js` | 456 | AAX boss state machine |
| `src/ui/UpgradeCardUI.js` | 342 | Upgrade card UI |
| `src/systems/ProceduralMusic.js` | 294 | Step sequencer music |
| `src/scenes/PreloadScene.js` | 259 | Asset loading + sprite processing |
| `src/entities/AAXBossHornMode.js` | 245 | Horn mode + death animation |
| `src/systems/HUD.js` | 232 | Shield/health/score/XP bars |
| `src/config/waves.js` | 232 | 15 wave configs + escalation |
| `src/systems/WeaponManager.js` | 216 | Weapon registry + bullet pool |
| `src/scenes/GameSceneCollisions.js` | 199 | All collision handlers |
| `src/scenes/MenuScene.js` | 185 | Title/arena/leaderboard |
| `src/scenes/GameScenePlayer.js` | 176 | Player creation/input/death |

---

*Structure analysis: 2026-02-24*
