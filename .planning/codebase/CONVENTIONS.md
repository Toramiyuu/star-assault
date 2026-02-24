# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- Scene classes: PascalCase with `Scene` suffix (`GameScene.js`, `MenuScene.js`, `ResultsScene.js`)
- Scene fragment modules: PascalCase with scene prefix (`GameScenePlayer.js`, `GameSceneCollisions.js`, `GameSceneDevTools.js`)
- System/manager classes: PascalCase with `Manager` suffix or descriptive name (`WaveManager.js`, `AudioManager.js`, `HUD.js`, `Explosions.js`)
- Entity classes: PascalCase (`AAXBoss.js`, `Player.js`, `Enemy.js`)
- Entity module files that export functions: PascalCase (`EnemyBehaviors.js`, `AAXBossAttacks.js`, `AAXBossEffects.js`)
- Weapon classes: PascalCase (`MainGun.js`, `SpreadCannon.js`, `OrbitalCannon.js`)
- Config files: camelCase (`constants.js`, `waves.js`, `upgrades.js`, `synergies.js`)
- Utility files: camelCase (`helpers.js`)
- UI components: PascalCase (`UpgradeCardUI.js`, `StatBar.js`)

**Classes:**
- PascalCase, always exported with `export class` (`export class GameScene extends Scene`)
- Manager/system classes take `scene` as first constructor argument, optionally `random` for seeded RNG
- Entity classes take `scene`, `random`, and parent manager reference

**Functions:**
- camelCase for all functions (`createPlayer`, `handleInput`, `fireAimedBullet`, `getClosestEnemy`)
- Exported standalone functions use `export function` (never arrow function exports for top-level)
- Private/internal methods prefixed with underscore (`_apply`, `_drawOrb`, `_createDrop`, `_checkPhase`, `_updateAnimation`)

**Variables:**
- camelCase for all variables and properties (`lastFireTime`, `waveActive`, `shieldDamageCooldown`)
- UPPER_SNAKE_CASE for module-level constants (`GAME`, `PLAYER`, `ENEMIES`, `SHIELD_RECHARGE_COOLDOWN`, `ELITE_CHANCE`)
- Exported config objects use UPPER_SNAKE_CASE (`WAVE_CONFIGS`, `ENEMY_TYPES`, `UPGRADES`, `SYNERGIES`, `RARITY_WEIGHTS`)
- Hex color values use `0x` prefix for Phaser tints (`0xff4444`, `0x00ff88`), `#` prefix in CSS/text style strings (`'#ffffff'`)

**Types/IDs:**
- Enemy types use snake_case strings (`'grunt'`, `'zigzagger'`, `'diver'`, `'formation_leader'`, `'bomber'`)
- Upgrade IDs use short alphanumeric codes: Grey=`G01-G06`, Green=`Gn01-Gn08`, Blue=`B01-B08`, Purple=`P01-P08`, Red=`R01-R06`, Gold=`Au01-Au04`
- Weapon IDs match their upgrade IDs (`B01`, `B02`, `P01`, `R02`, etc.) plus special `MAIN`
- Scene keys are simple strings (`'Boot'`, `'Preload'`, `'Menu'`, `'Game'`, `'Results'`)

## Code Style

**Formatting:**
- No linter or formatter configured (no `.eslintrc`, no `.prettierrc` in project root)
- Indentation: 2 spaces consistently throughout
- Quotes: double quotes for imports (`import { Scene } from "phaser"`), single quotes for most strings (`'grunt'`, `'#ffffff'`)
  - This is inconsistent -- some files use double quotes for strings too. Follow the pattern in the file being edited.
- Semicolons: always used
- Trailing commas: used in multiline objects and arrays
- Max line length: no enforced limit, but generally kept under ~120 chars
- Braces: K&R style (opening brace on same line)

**Module System:**
- ES modules (`"type": "module"` in `package.json`)
- Named exports for everything (`export class`, `export function`, `export const`)
- Default export never used
- File extensions always included in imports (`.js` suffix required): `import { GAME } from '../config/constants.js'`
- Phaser imported as default: `import Phaser from 'phaser'` or destructured: `import { Scene } from 'phaser'`

**Indentation and formatting within classes:**
- Some files use 2-space indent (most), a few older files use 4-space indent (`HUD.js`, `AudioManager.js`, `BootScene.js`, `ResultsScene.js`)
- When editing an existing file, match its existing indentation

## Import Organization

**Order:**
1. Phaser framework imports (`import Phaser from 'phaser'`, `import { Scene } from 'phaser'`)
2. Config imports (`from '../config/constants.js'`, `from '../config/waves.js'`, `from '../config/upgrades.js'`)
3. System/manager imports (`from '../systems/AudioManager.js'`)
4. Entity imports (`from '../entities/AAXBoss.js'`)
5. Scene fragment imports (`from './GameScenePlayer.js'`)
6. UI imports (`from '../ui/UpgradeCardUI.js'`)
7. Weapon imports (`from '../weapons/WeaponSubsystem.js'`)

**Path Aliases:**
- No path aliases. All imports use relative paths with `../` navigation.

## Constructor and Initialization Patterns

**Manager/System classes follow this pattern:**
```javascript
export class SomeManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;  // seeded RNG function
    // Initialize state
    this.someState = 0;
    this.someCollection = [];
  }
}
```

**Scene classes follow Phaser lifecycle:**
```javascript
export class GameScene extends Scene {
  constructor() {
    super("Game");  // Scene key string
  }

  create(data) {
    // Initialize systems, create sprites, setup input
    // data comes from scene.start("Game", { seed, dev })
  }

  update(time, delta) {
    // Game loop -- time is ms since game start, delta is ms since last frame
    if (this.isGameOver) return;
    if (this.upgradePaused) return;
    // Update systems...
  }
}
```

**Weapon subsystem pattern (inheritance):**
```javascript
import { WeaponSubsystem } from './WeaponSubsystem.js';

export class SomeWeapon extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    // Weapon-specific state
  }

  getBaseInterval() { return 2000; }      // Override: ms between fires
  onLevelChanged(level) { /* ... */ }     // Override: react to level-up
  fire(time) { /* ... */ }                // Override: actual firing logic
  drawEffects(graphics, time) { /* ... */ } // Override: continuous visuals
  onCreate() { /* ... */ }                // Override: one-time setup
  onDestroy() { /* ... */ }              // Override: cleanup
}
```

## Scene State Pattern (Shared via `this.scene`)

State is shared across the codebase by setting properties directly on the scene object. `PlayerStats._apply()` writes computed stats as properties on the scene:

```javascript
// In PlayerStats._apply():
this.scene[key] = val;  // e.g., this.scene.playerDamage = 10

// Accessed anywhere via scene reference:
const damage = this.scene.playerDamage || 10;
const speed = this.scene.playerSpeed || 300;
```

**Key scene properties set by PlayerStats:** `playerDamage`, `playerFireRate`, `playerSpeed`, `playerShield`, `playerMaxHP`, `playerMagnet`, `playerCrit`, `playerPierce`, `playerSpread`, `playerCooldown`, `playerBlastArea`, `playerLifeSteal`

**Key scene properties set manually:** `hp`, `score`, `isInvulnerable`, `isGameOver`, `godMode`, `cutscenePlaying`, `upgradePaused`, `touchTarget`, `aimAngle`, `killStreak`, `killStreakBonus`, `playerShieldCurrent`, `shieldRecharging`

## Sprite Data Pattern (setData/getData)

Phaser's `setData`/`getData` is the standard way to attach metadata to game objects (enemies, bullets):

```javascript
// Setting data on enemies at spawn:
enemy.setData("hp", hpValue);
enemy.setData("maxHP", hpValue);
enemy.setData("enemyType", enemyTypeName);
enemy.setData("speed", speed);
enemy.setData("isElite", false);
enemy.setData("shield", shieldPoints);
enemy.setData("maxShield", shieldPoints);
enemy.setData("fireRate", typeDef.fireRate);
enemy.setData("lastFireTime", 0);
enemy.setData("spawnTime", time);
enemy.setData("damaged", false);

// Reading data:
const hp = enemy.getData('hp');
const isElite = enemy.getData("isElite");

// Setting data on bullets:
bullet.setData('damage', damage);
bullet.setData('isCrit', isCrit);
bullet.setData('pierce', pierce);
bullet.setData('pierceCount', 0);
```

## Bullet Pool Pattern

Bullets use Phaser's `physics.add.group` with `maxSize` as an object pool. Bullets are recycled, not created/destroyed:

```javascript
// Get from pool:
const b = scene.enemyBullets.get(enemy.x, enemy.y);
if (!b) return;  // Pool exhausted

// Activate:
b.setActive(true).setVisible(true).setScale(0.15);
b.body.enable = true;
b.setVelocity(vx, vy);
b.body.setSize(b.width * 0.5, b.height * 0.5);

// Attach out-of-bounds cleanup (assigned as instance method):
b.update = function () {
  if (this.y > GAME.HEIGHT + 50 || this.y < -50 ||
      this.x < -50 || this.x > GAME.WIDTH + 50) {
    this.setActive(false).setVisible(false);
    this.body.enable = false;
  }
};

// Deactivate on hit:
b.setActive(false).setVisible(false);
b.body.enable = false;
```

Three bullet pools: `scene.playerBullets` (100), `scene.enemyBullets` (80), `weaponManager.weaponBullets` (80).

## Visual Effect Pattern

All visual effects (floating text, flashes, rings) follow the same create-tween-destroy lifecycle:

```javascript
// Create temporary graphics/text
const element = scene.add.text(x, y, 'TEXT', { ... })
  .setOrigin(0.5)
  .setDepth(200);

// Animate and auto-destroy
scene.tweens.add({
  targets: element,
  y: y - 60,
  alpha: 0,
  duration: 1000,
  onComplete: () => element.destroy(),
});
```

For full-screen overlays (white flash, red vignette):
```javascript
const flash = scene.add.graphics().setDepth(400).setScrollFactor(0);
flash.fillStyle(0xffffff, 0.4);
flash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
scene.tweens.add({
  targets: flash,
  alpha: 0,
  duration: 100,
  onComplete: () => flash.destroy(),
});
```

## Text Style Pattern

All text uses Phaser's text object with consistent style objects:

```javascript
scene.add.text(x, y, 'TEXT', {
  fontFamily: 'Arial',        // Always Arial
  fontSize: '32px',           // Always string with 'px'
  color: '#ffffff',            // CSS hex string
  fontStyle: 'bold',           // Usually bold for game text
  stroke: '#000000',           // Black outline for readability
  strokeThickness: 3,          // 2-6 range typically
}).setOrigin(0.5).setDepth(200);
```

Exception: `StatBar` uses `'Courier New, monospace'` for the stat display strip.

## Seeded Random Pattern

All randomized game logic uses a seeded RNG function (mulberry32) for arena determinism:

```javascript
// Created in GameScene.create():
this.random = createSeededRandom(seed);

// Passed to managers:
this.waveManager = new WaveManager(this, this.random);
this.xpManager = new XPManager(this, this.random);

// Used instead of Math.random():
const roll = this.random();  // Returns 0-1
const isElite = this.random() < ELITE_CHANCE;
```

**Never use `Math.random()` for gameplay logic.** Only use it for purely cosmetic effects (e.g., particle sparkle in `TwinLaser.drawEffects`).

## Error Handling

**Strategy:** Defensive null checks with optional chaining, no try/catch in gameplay code.

**Patterns:**
- Optional chaining for safety: `this.scene.player?.active`, `this.scene.boss?.aaxBoss?.sprite?.active`
- Fallback defaults with `||`: `this.scene.playerDamage || 10`, `enemy.getData('hp') || 0`
- Early returns on invalid state: `if (!bullet.active || !enemy.active) return;`
- Guard clauses at top of methods: `if (this.isGameOver) return;`, `if (!this.active) return;`
- `try/catch` only used in `AudioManager.init()` for Web Audio and `ArenaManager.load()/save()` for localStorage

## Configuration Patterns

**Constants file (`src/config/constants.js`):**
- Exported as named const objects: `GAME`, `PLAYER`, `ENEMIES`, `BOSSES`, `SCORING`, `POWERUPS`
- Contains base numeric values used across the codebase
- Imported destructured: `import { GAME, PLAYER, ENEMIES } from '../config/constants.js'`

**Waves config (`src/config/waves.js`):**
- Static array `WAVE_CONFIGS` for waves 1-15
- `generateEscalationConfig(waveNum)` for waves 16+
- Enemy types defined in `ENEMY_TYPES` with base stats

**Upgrades config (`src/config/upgrades.js`):**
- Array of upgrade objects with `id`, `name`, `rarity`, `type`, `maxLevel`, `levels[]`
- Each level has `label`, `values` (stat deltas), and optional special fields
- `RARITY_WEIGHTS` and `RARITY_COLORS` also exported
- Weapon upgrades reference weaponId matching `WEAPON_CLASSES` keys in WeaponManager

**Synergies config (`src/config/synergies.js`):**
- Array of synergy objects with `pair` (two upgrade IDs), `name`, `bonus`, `description`
- Special wildcard pairs: `['_ANY_RED', '_ANY_GOLD']`

## Module-Level Constants

Constants scoped to a single file are defined at the top of the module as `const`:

```javascript
const ENEMY_BULLET_SCALE = 0.15;
const SHIELD_RECHARGE_COOLDOWN = 4000;
const BAR_W = 220;
const ELITE_CHANCE = 0.08;
```

## Scene Decomposition Pattern

Large scenes are split into functional modules using exported functions that take `scene` as first argument:

```javascript
// GameScenePlayer.js — pure functions, no class
export function createPlayer(scene) { ... }
export function handleInput(scene, delta) { ... }
export function playerDeath(scene) { ... }

// GameSceneCollisions.js
export function setupCollisions(scene) { ... }

// GameSceneDevTools.js
export function handleDevKey(scene, name) { ... }
```

These are imported and called from `GameScene`:
```javascript
import { createPlayer, handleInput } from './GameScenePlayer.js';
// In create(): createPlayer(this);
// In update(): handleInput(this, delta);
```

## Entity Decomposition Pattern (AAX Boss)

The boss entity is split across multiple modules by concern:
- `AAXBoss.js` -- main class, state management, update loop
- `AAXBossAttacks.js` -- attack functions (`fireLasers`, `fireMouthSpread`, etc.)
- `AAXBossEffects.js` -- visual effects (`updateAura`, `announcePhase`)
- `AAXBossHornMode.js` -- horn mode transition and defeat
- `AAXBossHUD.js` -- boss health bar rendering

All satellite modules export functions that take the boss instance as first argument:
```javascript
export function fireLasers(boss) { ... }
export function buildHUD(boss) { ... }
```

## Comments

**When to Comment:**
- Section-divider comments for logical groupings within a file (dash-line separators):
  ```javascript
  // ── Play helpers (Phaser audio) ───────────────────────────────────
  // ── Music ─────────────────────────────────────────────────────────
  // -----------------------------------------------------------------
  //  Spawning
  // -----------------------------------------------------------------
  ```
- Inline comments for non-obvious game logic: `// Never spawn within 100px of player`
- Wave config comments explain each wave's purpose: `// Wave 3: Grunts + Zigzaggers + Divers -- gentler`
- JSDoc-style comments rare, used only in `EnemyBehaviors.js` and `SpreadCannon.js`

**No formal documentation standard.** Use short inline comments to explain "why" not "what."

## Depth Layer Convention

Phaser `setDepth()` values follow this ordering:
- 0-5: Background layers, XP orbs
- 8-9: Ground drops and labels
- 10: Player
- 11-12: Boss aura, boss sprite
- 15: Weapon AoE graphics, enemy spawn flash
- 20: Explosions, weapon satellites
- 50: Enemy HP bars
- 99-101: HUD elements (background, bars, text)
- 200: Floating text, wave announcements
- 300: Overlay UI (upgrade cards, bomb rings)
- 350: Upgrade card contents
- 400: Full-screen flashes, vignettes
- 500: Dev mode text

---

*Convention analysis: 2026-02-24*
