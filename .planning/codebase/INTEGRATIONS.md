# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**ElevenLabs (build-time only):**
- Purpose: Generate sound effects and music via AI
- Script: `scripts/generate-sfx.js`
- Endpoints used:
  - `https://api.elevenlabs.io/v1/sound-generation` - SFX generation (shoot, explosions, hits, powerup, wave complete)
  - `https://api.elevenlabs.io/v1/music` - Music generation (falls back to SFX API if Music API unavailable)
- Auth: `ELEVENLABS_API_KEY` env var, passed as `xi-api-key` header
- Output: MP3 files written to `assets/sfx/`
- **Not used at runtime** - Only for asset generation during development

**No Runtime External APIs:**
- The game is entirely client-side with no network calls during gameplay
- No analytics, no telemetry, no multiplayer, no leaderboard server

## Data Storage

**Databases:**
- None (fully client-side)

**Browser LocalStorage:**
- Service: `localStorage` via `src/systems/ArenaManager.js`
- Storage key: `'star-assault-arena'`
- Data stored:
  - Current week string (e.g., `"2026-W09"`)
  - Weekly seed for deterministic arenas
  - Array of attempt records (date, score, wave reached, full breakdown)
  - High score for current week
  - Leaderboard history (past weeks' scores)
- Pattern: Load on construction, save after each attempt record
- Graceful failure: try/catch around both read and write (ignores storage errors)

**File Storage:**
- Local filesystem for assets only (loaded by Phaser's HTTP loader in browser)

**Caching:**
- None beyond browser defaults

## Authentication & Identity

**Auth Provider:**
- None (no user accounts, no authentication)
- "Daily Arena Challenge" uses date-based seeding, not user identity

## Audio System

**Dual Audio Architecture** (`src/systems/AudioManager.js`):

1. **Phaser Audio (primary for SFX):**
   - Loads pre-generated MP3 files via Phaser's audio cache
   - Used for: shoot, explosions, player hit, boss sounds, powerup, wave complete
   - Loaded in `src/scenes/PreloadScene.js` via `this.load.audio()`
   - Files: `assets/sfx/*.mp3` (11 files total)

2. **Web Audio API (fallback SFX + procedural music):**
   - Creates `AudioContext` via `window.AudioContext || window.webkitAudioContext`
   - Master gain node at 0.3 volume
   - Fallback SFX: Oscillator-based tones when Phaser audio assets are missing
   - Shield sounds: Always use Web Audio (metallic ping, glass shatter, rising chime)
   - Web Audio nodes used: `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `AudioBufferSourceNode`

3. **Procedural Music Engine** (`src/systems/ProceduralMusic.js`):
   - Custom step sequencer built on Web Audio API
   - Three musical phases: `cruise` (118 BPM), `combat` (130 BPM), `boss` (142 BPM)
   - Instruments: bass (sawtooth), lead (square/sawtooth), arpeggio (boss only), kick, snare, hihat
   - Drums use pre-generated noise buffer (1 second of white noise)
   - Scheduling: Lookahead pattern (150ms ahead, 25ms timer interval)
   - Phase transitions: 2-second crossfade between musical phases
   - All synthesis uses native Web Audio nodes (no external audio libraries)

## Rendering & Graphics

**Phaser Renderer:**
- Mode: `Phaser.AUTO` (WebGL preferred, Canvas 2D fallback)
- Resolution: 1080x1920 (portrait mobile)
- Scale: `Phaser.Scale.FIT` with `CENTER_BOTH`

**Canvas 2D API (direct usage):**
- `src/scenes/PreloadScene.js` - `_removeWhiteBG()` method:
  - Creates offscreen canvas via `document.createElement("canvas")`
  - Uses `getContext("2d")` for pixel manipulation
  - Performs flood-fill background removal on boss sprite sheets
  - Uses `getImageData()`/`putImageData()` for per-pixel alpha manipulation
  - Anti-aliases edges between sprite content and removed background

**Phaser Graphics API (extensive):**
- `src/systems/HUD.js` - Health bars, shield bars, XP bar, boss HP bar (all drawn with `scene.add.graphics()`)
- `src/systems/XPManager.js` - XP orbs drawn as layered glowing circles
- `src/systems/GroundDropManager.js` - Ground drop items
- `src/scenes/GameScene.js` - Enemy HP bars (`this.enemyHPBars`)
- `src/systems/WeaponManager.js` - AoE/laser weapon effects
- `src/ui/StatBar.js` - Bottom HUD stat display
- `src/ui/UpgradeCardUI.js` - Upgrade selection cards

## Input Handling

**Keyboard:**
- Phaser cursor keys (`this.input.keyboard.createCursorKeys()`)
- WASD keys (`this.input.keyboard.addKeys()`)
- Dev mode keys via raw `window.addEventListener("keydown"/"keyup")` in `src/scenes/GameScene.js`
- Dev keys: I (god mode), B (boss), N (next wave), K (kill all), U (level-up), X (+50 XP)

**Touch/Pointer:**
- Phaser pointer events: `pointerdown`, `pointermove`, `pointerup`
- Touch target tracking for mobile movement (`this.touchTarget`)
- `user-scalable=no` viewport meta tag prevents pinch zoom

**URL Parameters:**
- `?dev=1` enables dev mode (parsed in `src/scenes/MenuScene.js` via `URLSearchParams`)

## Asset Loading

**Phaser Loader** (`src/scenes/PreloadScene.js`):

All assets loaded via Phaser's built-in HTTP loader during the Preload scene:

| Asset Type | Count | Path Pattern | Loader Method |
|-----------|-------|-------------|---------------|
| Player ship | 1 | `assets/ships/player.png` | `load.image()` |
| Exhaust frames | 10 | `assets/ships/exhaust_0..9.png` | `load.image()` |
| Player explosion | 7 | `assets/ships/explosion_1..7.png` | `load.image()` |
| Player bullets | 6 | `assets/ships/bullet_1..6.png` | `load.image()` |
| Enemy ships | 6 | `assets/enemies/enemy_01..06.png` | `load.image()` |
| Enemy damaged | 6 | `assets/enemies/enemy_01..06_damaged.png` | `load.image()` |
| Enemy bullets | 4 | `assets/enemies/bullet_1..4.png` | `load.image()` |
| Enemy explosion | 9 | `assets/enemies/explosion_0..8.png` | `load.image()` |
| Boss ships | 3 | `assets/bosses/boss_01..03.png` | `load.image()` |
| AAX boss sheets | 4 | `assets/boss-aax.png`, `assets/*.png` | `load.image()` (converted to spritesheet in `create()`) |
| Backgrounds | 3 | `assets/backgrounds/bg_*.png` | `load.image()` |
| Meteors | 6 | `assets/objects/meteor_01..06.png` | `load.image()` |
| UI elements | 2 | `assets/ui/*.png` | `load.image()` |
| Power-ups | 5 | `assets/powerups/*.png` | `load.image()` |
| Sound effects | 10 | `assets/sfx/*.mp3` | `load.audio()` |
| Music | 1 | `assets/sfx/music_loop.mp3` | `load.audio()` |

**Loading UI:**
- Progress bar rendered via Phaser Graphics during load
- Bar: 600x40px, centered at (540, 960)
- "LOADING..." text above bar
- Destroyed on completion, then transitions to Menu scene

**Post-Load Processing** (`PreloadScene.create()`):
- Boss sprite sheets are loaded as raw images, then:
  1. White/checkerboard background removed via pixel-level flood fill (`_removeWhiteBG()`)
  2. Converted to Phaser spritesheets with calculated frame dimensions
  3. Original raw textures removed from texture manager

**Asset Source:**
- `assets/craftpix-981156-space-shooter-game-kit/` - Licensed art pack (CraftPix)
- `assets/sfx/` - AI-generated via ElevenLabs (build-time script)
- Custom boss art in root `assets/` directory

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, no error reporting)

**Logs:**
- No structured logging
- `console.log` used only in `scripts/generate-sfx.js` for build output
- No runtime logging in game code

**Debugging:**
- `window.__GAME__` exposes the Phaser Game instance globally (`src/main.js`)
- Dev mode (`?dev=1`): Enables god mode, displays debug key bindings on screen
- Phaser Arcade physics debug: Available via config but set to `false`

## CI/CD & Deployment

**Hosting:**
- Static files (no server-side logic)
- Build output: `dist/` directory with `index.html` + `assets/`
- Suitable for any static host (Netlify, Vercel, GitHub Pages, S3, etc.)

**CI Pipeline:**
- None configured (no GitHub Actions, no CI config files)

## Deterministic Seeding

**Seeded RNG** (`src/systems/SeededRandom.js`):
- Algorithm: Mulberry32 (32-bit PRNG)
- Seed source: Week string `"starassault-2026-W09"` hashed via `hashString()` (DJB2-style)
- Shared `this.random` function passed to: `WaveManager`, `XPManager`, `UpgradeManager`, `BossManager`, `PowerUpManager`, `GroundDropManager`
- Purpose: All players in the same week face the same arena (enemy spawns, patterns, upgrades)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Assets

**CraftPix Space Shooter Kit:**
- Location: `assets/craftpix-981156-space-shooter-game-kit/`
- License: `assets/craftpix-981156-space-shooter-game-kit/license.txt`
- Contains: Ship sprites, enemy sprites, boss sprites, backgrounds, UI elements, effects, objects
- Subdirectories: Boss, Enemy, Pirate, Spaceship, UFO sprite sets; backgrounds; GUI; icons; objects

**ElevenLabs AI-Generated Audio:**
- Location: `assets/sfx/`
- Generated by: `scripts/generate-sfx.js`
- 10 SFX files + 1 music loop (MP3 format, 44100Hz, 128kbps)

---

*Integration audit: 2026-02-24*
