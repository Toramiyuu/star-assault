# Star Assault — Game Specification & Build Guide

## Project Overview

**Star Assault** is a vertical-scrolling space shooter built with **Phaser 4** as the first game in the **FiGGYZ Daily Arena** — a weekly rotating game challenge system. Players get one attempt per day (5 days per week) to post their best high score on a seeded, deterministic challenge. At the end of the week, FiGGYZ Points are awarded based on leaderboard position.

This is a **standalone build** that will later be integrated into FiGGYZ World (Vue 3 / Laravel). For now, it runs independently with its own simple leaderboard UI.

---

## Table of Contents

1. [Game Design](#1-game-design)
2. [Asset Inventory (CraftPix)](#2-asset-inventory-craftpix)
3. [Technical Architecture](#3-technical-architecture)
4. [Seeded Determinism System](#4-seeded-determinism-system)
5. [Scoring System](#5-scoring-system)
6. [Weekly Arena System](#6-weekly-arena-system)
7. [Controls & Responsiveness](#7-controls--responsiveness)
8. [Build Milestones](#8-build-milestones)
9. [Claude Code Setup Instructions](#9-claude-code-setup-instructions)
10. [File Structure](#10-file-structure)
11. [Future Integration Notes](#11-future-integration-notes)

---

## 1. Game Design

### Core Loop

- Vertical-scrolling space shooter (portrait orientation)
- **Endless survival** — go as far as you can before you die
- Enemies spawn in waves of increasing difficulty
- Power-ups drop from destroyed enemies
- Boss encounters every 5 waves
- A typical run lasts **3–8 minutes** depending on skill
- **One attempt per day**, best score across the week counts

### Gameplay Flow

1. **Title Screen** → Shows "Daily Challenge #X", current week's leaderboard preview, and "PLAY" button
2. **Countdown** → 3-2-1-GO before gameplay starts
3. **Gameplay** → Endless waves of enemies, player shoots and dodges
4. **Death** → Explosion animation, brief pause
5. **Results Screen** → Final score breakdown, position on leaderboard, "Come back tomorrow for another attempt"
6. **Leaderboard Screen** → Full weekly standings

### Wave Structure

Each wave consists of a defined enemy formation that spawns, attacks, and must be cleared (or survives for a set time) before the next wave begins.

| Wave Range | Difficulty | Enemy Types | Behaviour |
|------------|-----------|-------------|-----------|
| 1–4 | Easy | Basic fighters (2-3 types) | Simple vertical movement, slow fire |
| 5 | **BOSS 1** | Boss Ship 1 | Phase-based attack patterns |
| 6–9 | Medium | Fighters + Flankers | Diagonal movement, faster fire, basic formations |
| 10 | **BOSS 2** | Boss Ship 2 | More phases, adds minion spawns |
| 11–14 | Hard | All enemy types | Complex formations, crossfire patterns |
| 15 | **BOSS 3** | Boss Ship 3 | Full pattern complexity, bullet hell lite |
| 16+ | Escalation | Recycled enemies, +speed, +HP, +fire rate | Endless scaling until player dies |

### Power-Up Types

Power-ups drop from destroyed enemies with a seeded probability. All power-ups are temporary (timed duration).

| Power-Up | Effect | Duration | Visual |
|----------|--------|----------|--------|
| Rapid Fire | Double fire rate | 8 seconds | Blue glow |
| Spread Shot | 3-way firing pattern | 8 seconds | Orange glow |
| Shield | Absorbs 1 hit | Until hit | Bubble around ship |
| Missile Barrage | Homing missiles fire alongside main weapon | 6 seconds | Red glow |
| Score Multiplier | 2x score for duration | 10 seconds | Gold glow |

### Player Ship

- Starts with a single forward-firing weapon
- 3 hit points (lives/health bar)
- Brief invulnerability after taking a hit (2 seconds, flashing)
- No upgrades between runs — every player starts identical
- Movement speed is fixed

### Enemy Behaviour Patterns (Seeded)

All enemy spawn positions, movement paths, and fire timing are derived from the daily seed. This ensures every player faces the exact same challenge.

- **Straight Drop**: Moves top to bottom, fires straight down
- **Sine Wave**: Oscillates horizontally while descending
- **Flanker**: Enters from left or right, sweeps across screen
- **Dive Bomber**: Descends quickly, pulls up, loops back
- **Formation**: Group moves in coordinated pattern

### Boss Behaviour

Each boss has multiple attack phases triggered by HP thresholds:

- **Phase 1** (100%–66% HP): Basic attack pattern
- **Phase 2** (66%–33% HP): Adds new attack, increases speed
- **Phase 3** (33%–0% HP): Full pattern, spawns minions

**CRITICAL IMPLEMENTATION NOTE**: Store boss HP as a scene-level variable, NOT on the Phaser game object directly. Phaser can unexpectedly modify properties on game objects. Use a pattern like:

```javascript
// CORRECT
this.bossHP = 500;

// WRONG — Phaser may overwrite this
boss.hp = 500;
```

---

## 2. Asset Inventory (CraftPix)

All assets come from the **CraftPix Space Shooter Game Kit**: https://craftpix.net/product/space-shooter-game-kit/

Download the full kit and extract into `assets/` in the project root.

### Asset Mapping

| Game Element | CraftPix Asset | Notes |
|-------------|---------------|-------|
| Player Ship | 1 of 3 spacecraft (pick the most "hero" looking one) | Use upgrade variants as visual flair only |
| Enemies (Basic) | Enemy ships (select 6 of 18 for variety) | Map to difficulty tiers |
| Enemies (Elite) | Enemy ships (select 4 with more aggressive designs) | Used in wave 6+ |
| Boss 1 | Boss ship 1 | Animated sprite |
| Boss 2 | Boss ship 2 | Animated sprite |
| Boss 3 | Boss ship 3 | Animated sprite |
| Power-ups | 5 of 10 bonus items | Map to the 5 power-up types |
| Asteroids/Debris | 6 of 13 objects | Background hazards and obstacles |
| Mines | 3 mine variants | Used in wave 11+ as extra hazards |
| Rockets | 3 rocket variants | Player missile power-up visuals |
| Background | 1-2 of 8 vertical backgrounds (1080×1920) | Scrolling starfield |
| UI Elements | Interface kit | Health bar, score display, buttons |

### Asset Formats

- **PNG**: Use for all in-game sprites (Phaser loads PNGs natively)
- **AI (Illustrator)**: Source vectors — can be re-exported at any resolution if needed

### Sprite Sheets

If the CraftPix assets come as individual frames, they need to be assembled into sprite sheets or texture atlases for Phaser. Use a tool like **TexturePacker** or have Claude Code generate a simple atlas JSON.

If assets come as sprite sheets already, note the frame dimensions and configure Phaser's `spritesheet` loader accordingly.

---

## 3. Technical Architecture

### Stack

| Component | Technology |
|-----------|-----------|
| Game Engine | Phaser 4 (latest RC6+) |
| Language | JavaScript (ES modules) |
| Build Tool | Vite |
| Package Manager | npm |
| Deployment (standalone) | Vercel or static hosting |
| Future Integration | Vue 3 component wrapper, Laravel API backend |

### Phaser 4 Configuration

```javascript
const config = {
    type: Phaser.AUTO, // WebGL with Canvas fallback
    width: 1080,
    height: 1920,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Space — no gravity
            debug: false,
        },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultsScene],
};
```

### Key Design Decisions

- **Portrait orientation (1080×1920)**: Matches mobile screens and the CraftPix vertical backgrounds
- **Phaser Scale FIT + CENTER_BOTH**: Scales to fill any screen while maintaining aspect ratio
- **Arcade Physics**: Lightweight, perfect for bullet/collision detection in a shooter
- **No gravity**: Space game — everything moves via velocity

### Scene Architecture

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load minimal assets for loading screen |
| `PreloadScene` | Load all game assets with progress bar |
| `MenuScene` | Title screen, daily challenge info, play button, leaderboard access |
| `GameScene` | Core gameplay — waves, enemies, player, scoring |
| `ResultsScene` | Score breakdown, leaderboard position, share |

---

## 4. Seeded Determinism System

**This is the most critical system in the game.** Every player must face the exact same challenge on the same day.

### How It Works

1. A **weekly seed** is generated (e.g., `"starassault-2026-W09"` for week 9 of 2026)
2. The seed feeds a **seeded pseudo-random number generator (PRNG)**
3. ALL randomness in the game uses this PRNG instead of `Math.random()`
4. Result: identical seed = identical game for every player

### Seeded PRNG Implementation

Use a simple, fast, deterministic PRNG like **mulberry32**:

```javascript
function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Usage
const seedString = "starassault-2026-W09";
const seedNumber = hashString(seedString); // Convert string to number
const random = mulberry32(seedNumber);

// Now use random() everywhere instead of Math.random()
const enemyX = random() * 1080; // Deterministic position
```

### String-to-Number Hash

```javascript
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return hash;
}
```

### What Must Be Seeded

EVERY source of randomness in the game must use the seeded PRNG:

- Enemy spawn positions (X coordinate)
- Enemy spawn timing within waves
- Enemy movement pattern selection
- Enemy fire timing offsets
- Power-up drop decisions (which enemy drops, what type)
- Asteroid/debris spawn positions
- Boss attack pattern variations
- Mine placement (wave 11+)

### What Must NOT Be Seeded

- Player position (controlled by input)
- Player fire timing (controlled by input)
- Visual effects (particles, screen shake — cosmetic only)
- Audio timing

---

## 5. Scoring System

### Score Composition

| Action | Points | Notes |
|--------|--------|-------|
| Basic enemy destroyed | 100 | |
| Elite enemy destroyed | 250 | |
| Boss defeated | 1000 + (wave × 200) | Boss 1 = 2000, Boss 2 = 3000, Boss 3 = 4000 |
| Wave cleared (no damage taken) | 500 bonus | Perfect wave bonus |
| Power-up collected | 50 | |
| Mine dodged/destroyed | 150 | Wave 11+ |
| Accuracy bonus | Score × (hits/shots fired) | Applied at end of run, multiplier between 0.5–1.5 |
| Survival time bonus | 10 points per second alive | Rewards longevity |

### Score Display

- Running score displayed top-right during gameplay
- Score multiplier indicator when active (2x power-up)
- Final score breakdown shown on Results Screen with each component listed

### Anti-Cheat Considerations (Standalone Phase)

For the standalone build, implement basic client-side integrity:

1. **Score sanity check**: Maximum theoretical score per wave is calculable — flag impossibly high scores
2. **Play duration validation**: Record start and end timestamps — a score implying 30 waves but submitted after 10 seconds is invalid
3. **Seed verification**: Score submission must include the seed used — mismatched seeds are rejected
4. **Action replay hash** (optional, Phase 2): Hash of key game events (enemy kills, timestamps) that can be verified server-side

For the standalone version, scores are stored in **localStorage** with basic validation. Server-side validation comes with the Laravel integration.

---

## 6. Weekly Arena System

### Weekly Cycle

```
Week 1: Star Assault (Space Shooter)
Week 2: [Game 2 - TBD]
Week 3: [Game 3 - TBD]
Week 4: [Game 4 - TBD]
Week 5: Star Assault again (cycle repeats)
```

### Attempt System

- Each player gets **1 attempt per day**
- The challenge runs for **5 days** (Monday–Friday)
- Attempt tracking uses localStorage (standalone) / user auth (integrated)
- Once played today, the "PLAY" button is replaced with "Come back tomorrow"
- A player's **highest score** across the week is their leaderboard entry

### Prize Distribution (FiGGYZ Points)

| Position | FiGGYZ Points |
|----------|--------------|
| 1st | 2,000 |
| 2nd | 1,000 |
| 3rd | 500 |
| 4th–10th | 250 |
| 11th–50th | 100 |
| Participated (any score) | 50 |

### Leaderboard Data Structure (localStorage for Standalone)

```javascript
{
    "currentWeek": "2026-W09",
    "gameType": "star-assault",
    "seed": "starassault-2026-W09",
    "attempts": [
        { "day": 1, "score": 45200, "timestamp": "2026-02-23T10:15:00Z" },
        { "day": 2, "score": 62100, "timestamp": "2026-02-24T08:30:00Z" }
    ],
    "highScore": 62100,
    "leaderboard": [
        // In standalone: just the player's own scores
        // In integrated: fetched from Laravel API
    ]
}
```

---

## 7. Controls & Responsiveness

### Mobile (Touch)

- **Move**: Touch and drag anywhere on screen — ship follows finger with slight offset (finger doesn't cover ship)
- **Fire**: Auto-fire is always on (no fire button needed)
- **Pause**: Tap pause icon in top-left corner

### Desktop (Mouse + Keyboard)

- **Move**: Mouse movement controls ship position (ship follows cursor), OR arrow keys / WASD
- **Fire**: Auto-fire always on, OR hold spacebar / left mouse button
- **Pause**: Escape key or P

### Input Detection

```javascript
// Detect input type on first interaction
this.input.on('pointerdown', () => { this.inputMode = 'touch'; });
this.input.keyboard.on('keydown', () => { this.inputMode = 'keyboard'; });
```

### Responsive Scaling

The game canvas is 1080×1920 (9:16 portrait). Phaser's Scale Manager handles fitting this to any screen:

- **Mobile portrait**: Fills screen naturally
- **Mobile landscape**: Letterboxed with bars on sides
- **Desktop**: Centered with background behind the game area
- **Tablet**: Scales up proportionally

The game area is surrounded by a dark space background that extends beyond the playable area, so letterboxing looks intentional.

---

## 8. Build Milestones

### Milestone 1: Core Prototype
**Goal**: Player ship moves, shoots, and enemies spawn and can be destroyed.

- [ ] Project setup (Vite + Phaser 4)
- [ ] Load CraftPix assets (player ship, 2 enemy types, 1 background)
- [ ] Scrolling background
- [ ] Player movement (touch + keyboard)
- [ ] Auto-fire with bullet pooling
- [ ] Basic enemy spawns (straight drop pattern only)
- [ ] Collision detection (bullets hit enemies, enemies hit player)
- [ ] Player health (3 HP) with invulnerability frames
- [ ] Basic score counter
- [ ] Death → simple results screen

**Test**: Can you fly around, shoot enemies, die, and see a score?

### Milestone 2: Seeded Waves & Power-ups
**Goal**: Full wave system with deterministic spawns and power-up drops.

- [ ] Implement seeded PRNG (mulberry32)
- [ ] Wave manager with defined wave compositions
- [ ] All 5 enemy movement patterns
- [ ] All 5 power-up types with timed duration
- [ ] Power-up drop system (seeded probability per enemy)
- [ ] Wave difficulty scaling
- [ ] Wave counter UI
- [ ] Perfect wave bonus
- [ ] Sound effects (CraftPix or free SFX)

**Test**: Play twice with the same seed — is the enemy pattern identical both times?

### Milestone 3: Bosses & Polish
**Goal**: Boss encounters, visual polish, and juice.

- [ ] 3 boss types with phase-based attack patterns
- [ ] Boss HP bars
- [ ] Screen shake on explosions
- [ ] Particle effects (explosions, thrust, power-up pickup)
- [ ] Mine hazards (wave 11+)
- [ ] Escalation system for wave 16+
- [ ] Background music (loop)
- [ ] Improved HUD (health hearts/bar, score, wave, active power-up indicator)
- [ ] Ship death explosion animation

**Test**: Can you reach and fight a boss? Do phases change behaviour?

### Milestone 4: Arena System & Deployment
**Goal**: Full weekly challenge flow, attempt tracking, leaderboard.

- [ ] Menu screen with weekly challenge info
- [ ] Weekly seed generation based on current date
- [ ] Attempt tracking (1 per day, localStorage)
- [ ] "Already played today" state
- [ ] Results screen with full score breakdown
- [ ] Local leaderboard (own scores across the week)
- [ ] Accuracy bonus calculation at end of run
- [ ] Survival time bonus
- [ ] Score validation (basic sanity checks)
- [ ] Deploy to Vercel
- [ ] Responsive testing on mobile + desktop

**Test**: Full flow — see challenge, play, see results, come back "tomorrow" (test with date mocking), play again, see updated high score.

---

## 9. Claude Code Setup Instructions

### Initial Setup Prompt

Copy this entire section and paste it into Claude Code as your first prompt:

---

**PROMPT START**

I want to build a game called "Star Assault" — a vertical-scrolling space shooter using Phaser 4. Here's what I need you to do for setup:

1. Create a new project folder called `star-assault`
2. Initialize it with `npm init -y`
3. Install dependencies:
   - `phaser` (version 4.x — use `npm install phaser@beta` if v4 isn't on the main tag yet, check npm for the latest v4 RC/release)
   - `vite` as a dev dependency for the dev server and build
4. Set up Vite config for a vanilla JS project that serves from `index.html`
5. Create the basic file structure:

```
star-assault/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js              # Phaser game config and initialization
│   ├── scenes/
│   │   ├── BootScene.js      # Minimal asset load for splash
│   │   ├── PreloadScene.js   # Full asset loading with progress bar
│   │   ├── MenuScene.js      # Title screen, play button
│   │   ├── GameScene.js      # Core gameplay
│   │   └── ResultsScene.js   # Score display after death
│   ├── systems/
│   │   ├── WaveManager.js    # Controls wave spawning and progression
│   │   ├── SeededRandom.js   # Deterministic PRNG (mulberry32)
│   │   ├── ScoreManager.js   # Tracks and calculates score
│   │   └── ArenaManager.js   # Weekly challenge, attempt tracking
│   ├── entities/
│   │   ├── Player.js         # Player ship class
│   │   ├── Enemy.js          # Base enemy class
│   │   ├── Boss.js           # Boss class with phase system
│   │   ├── Bullet.js         # Bullet pool
│   │   └── PowerUp.js        # Power-up class
│   ├── config/
│   │   ├── constants.js      # All magic numbers, speeds, timings
│   │   └── waves.js          # Wave definitions
│   └── utils/
│       └── helpers.js        # Utility functions
└── assets/                   # CraftPix assets go here (I'll add manually)
    ├── ships/
    ├── enemies/
    ├── bosses/
    ├── powerups/
    ├── backgrounds/
    ├── objects/
    ├── ui/
    └── audio/
```

6. Set up the Phaser config in `main.js`:
   - Resolution: 1080×1920 (portrait)
   - Scale mode: FIT with CENTER_BOTH
   - Physics: Arcade, no gravity
   - Background colour: #000000
   - Scenes registered in order: Boot, Preload, Menu, Game, Results

7. Create placeholder versions of each scene that just display the scene name in white text on black background, and transition to the next scene on click/tap (Menu → Game → Results → Menu loop)

8. Set up `npm run dev` to launch Vite dev server
9. Set up `npm run build` for production build

Also create a `constants.js` with these initial values:

```javascript
export const GAME = {
    WIDTH: 1080,
    HEIGHT: 1920,
    BACKGROUND_SCROLL_SPEED: 1,
};

export const PLAYER = {
    SPEED: 8,
    MAX_HP: 3,
    INVULNERABILITY_DURATION: 2000, // ms
    FIRE_RATE: 200, // ms between shots
    BULLET_SPEED: -800, // negative = upward
};

export const ENEMIES = {
    BASIC_SPEED: 150,
    BASIC_HP: 1,
    BASIC_FIRE_RATE: 2000,
    ELITE_SPEED: 200,
    ELITE_HP: 2,
    ELITE_FIRE_RATE: 1500,
    BULLET_SPEED: 400, // positive = downward
};

export const BOSSES = {
    HP_MULTIPLIER: 100, // Boss HP = wave_number * multiplier
    PHASE_THRESHOLDS: [0.66, 0.33], // Phase changes at these HP percentages
};

export const SCORING = {
    BASIC_KILL: 100,
    ELITE_KILL: 250,
    BOSS_KILL_BASE: 1000,
    BOSS_KILL_WAVE_BONUS: 200,
    PERFECT_WAVE: 500,
    POWERUP_COLLECT: 50,
    MINE_DESTROY: 150,
    SURVIVAL_PER_SECOND: 10,
    ACCURACY_MIN_MULTIPLIER: 0.5,
    ACCURACY_MAX_MULTIPLIER: 1.5,
};

export const POWERUPS = {
    DROP_CHANCE: 0.15, // 15% chance per enemy kill
    RAPID_FIRE_DURATION: 8000,
    SPREAD_SHOT_DURATION: 8000,
    MISSILE_DURATION: 6000,
    SCORE_MULTI_DURATION: 10000,
};
```

Please build this step by step. After setup, confirm it runs with `npm run dev` and I can see the placeholder scenes cycling.

**PROMPT END**

---

### Subsequent Build Prompts

After setup is confirmed, proceed milestone by milestone:

**Milestone 1 Prompt**:
> I've added the CraftPix Space Shooter Game Kit assets into the `assets/` folder. Please scan the assets directory and identify which sprites we should use for: player ship, 2 basic enemy types, 1 background. Then build Milestone 1 from the spec: scrolling background, player movement (touch + keyboard), auto-fire with bullet pooling, basic enemy spawns, collision detection, 3HP health system, basic score counter, and death leading to results screen. Use the `ask user question` tool if you need me to choose between asset options.

**Milestone 2 Prompt**:
> Build Milestone 2: Implement the seeded PRNG system using mulberry32, the wave manager with all 5 enemy movement patterns (straight drop, sine wave, flanker, dive bomber, formation), all 5 power-up types with timed durations, wave difficulty scaling, and the perfect wave bonus. The seed for testing should be "starassault-test-seed-001". After building, I'll play twice to verify the same seed produces identical gameplay.

**Milestone 3 Prompt**:
> Build Milestone 3: Add the 3 boss encounters at waves 5, 10, and 15 with phase-based attack patterns (phases trigger at 66% and 33% HP). IMPORTANT: Store boss HP as a scene-level variable, not on the Phaser game object. Add screen shake, particle explosions, mine hazards from wave 11+, the escalation system for wave 16+, and improve the HUD with health display, wave counter, and active power-up indicator. Add placeholder sounds if no audio assets are available yet.

**Milestone 4 Prompt**:
> Build Milestone 4: Implement the full Weekly Arena system. Add the menu screen showing this week's challenge info, weekly seed generation based on current date (format: "starassault-YYYY-WXX"), attempt tracking with localStorage (1 attempt per day, up to 5 per week), the "already played today" state, full results screen with score breakdown (kills, accuracy bonus, survival time, perfect wave bonuses), and local leaderboard showing all attempts this week with the high score highlighted. Prepare for deployment with `npm run build`.

---

## 10. File Structure

```
star-assault/
├── index.html                    # Entry point
├── package.json
├── vite.config.js
├── README.md
│
├── src/
│   ├── main.js                   # Phaser config, game initialization
│   │
│   ├── scenes/
│   │   ├── BootScene.js          # Load splash screen assets
│   │   ├── PreloadScene.js       # Asset loading with progress bar
│   │   ├── MenuScene.js          # Weekly challenge info, play button, leaderboard
│   │   ├── GameScene.js          # Core gameplay loop
│   │   └── ResultsScene.js       # Score breakdown, leaderboard position
│   │
│   ├── systems/
│   │   ├── WaveManager.js        # Wave composition, spawning, progression
│   │   ├── SeededRandom.js       # mulberry32 PRNG + string hash
│   │   ├── ScoreManager.js       # Real-time scoring + end-of-run calculations
│   │   ├── ArenaManager.js       # Weekly seed, attempt tracking, leaderboard
│   │   └── PowerUpManager.js     # Active power-up state, duration timers
│   │
│   ├── entities/
│   │   ├── Player.js             # Ship, input handling, invulnerability
│   │   ├── Enemy.js              # Base enemy with movement pattern variants
│   │   ├── Boss.js               # Phase-based boss with HP thresholds
│   │   ├── BulletPool.js         # Object pool for player + enemy bullets
│   │   └── PowerUp.js            # Collectible power-up objects
│   │
│   ├── config/
│   │   ├── constants.js          # All tuning values (speeds, HP, scoring)
│   │   └── waves.js              # Per-wave enemy composition definitions
│   │
│   └── utils/
│       └── helpers.js            # Shared utility functions
│
├── assets/
│   ├── ships/                    # Player ship sprites
│   ├── enemies/                  # Enemy ship sprites (6 basic, 4 elite)
│   ├── bosses/                   # 3 boss ship sprites (animated)
│   ├── powerups/                 # 5 power-up item sprites
│   ├── backgrounds/              # Vertical scrolling backgrounds (1080×1920)
│   ├── objects/                  # Asteroids, mines, debris
│   ├── ui/                       # Health bar, buttons, panels
│   └── audio/                    # Music and SFX (add later)
│
└── public/                       # Static files copied to build output
```

---

## 11. Future Integration Notes

When integrating Star Assault into FiGGYZ World:

### Vue 3 Wrapper

The Phaser game will be mounted inside a Vue component:

```vue
<template>
    <div ref="gameContainer" class="game-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Phaser from 'phaser';
import { gameConfig } from './star-assault/src/main.js';

const gameContainer = ref(null);
let game = null;

onMounted(() => {
    game = new Phaser.Game({
        ...gameConfig,
        parent: gameContainer.value,
    });
});

onBeforeUnmount(() => {
    if (game) game.destroy(true);
});
</script>
```

### Laravel API Endpoints (Future)

```
POST   /api/arena/start         # Get today's seed, validate attempt eligibility
POST   /api/arena/submit-score  # Submit score with validation data
GET    /api/arena/leaderboard   # Current week's leaderboard
GET    /api/arena/my-attempts   # Player's attempts this week
POST   /api/arena/claim-prize   # Claim weekly FiGGYZ Points (end of week)
```

### Score Submission Payload (Future)

```json
{
    "game_type": "star-assault",
    "seed": "starassault-2026-W09",
    "score": 62100,
    "waves_cleared": 12,
    "accuracy": 0.73,
    "play_duration_seconds": 342,
    "kills": { "basic": 87, "elite": 23, "boss": 2 },
    "powerups_collected": 8,
    "perfect_waves": 3,
    "client_hash": "abc123..." // Integrity hash of key game events
}
```

---

## Appendix: Quick Reference Card

| Setting | Value |
|---------|-------|
| Canvas Size | 1080 × 1920 (portrait) |
| Engine | Phaser 4 |
| Build Tool | Vite |
| Physics | Arcade (no gravity) |
| PRNG | mulberry32 |
| Seed Format | `starassault-YYYY-WXX` |
| Attempts per Week | 5 (1 per day, Mon–Fri) |
| Player HP | 3 |
| Wave Boss Interval | Every 5 waves |
| Run Duration Target | 3–8 minutes |
| Scoring | Points + Accuracy multiplier + Survival time |
| Standalone Storage | localStorage |
| Asset Source | CraftPix Space Shooter Game Kit (vector) |
| Asset Formats | PNG (gameplay), AI (source vectors) |
