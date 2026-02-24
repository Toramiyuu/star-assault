# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Runner:**
- No test framework is configured. No Jest, Vitest, Mocha, or Playwright configs exist.
- No test files exist in the project (`*.test.js`, `*.spec.js` -- only in `node_modules/`).
- `puppeteer` is listed as a devDependency but no test scripts reference it.

**Run Commands:**
```bash
npm run dev      # Start Vite dev server (opens browser automatically)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

There is no `npm test` script defined in `package.json`.

## Dev Mode / Debug Tools

### Enabling Dev Mode

Dev mode is activated via URL parameter on the menu screen:

```
http://localhost:5173/?dev=1
```

**What `?dev=1` does:**
- `MenuScene.create()` at `src/scenes/MenuScene.js` reads: `new URLSearchParams(window.location.search).get("dev") === "1"`
- Bypasses the daily arena play limit (`canPlay = this.arena.canPlay() || devMode`)
- Passes `dev: true` to GameScene: `this.scene.start("Game", { seed, dev: devMode })`
- In `GameScene.create()`, when `data.dev` is true:
  - Enables god mode by default (`this.godMode = true`)
  - Displays dev key legend in top-left corner (red text, depth 500)

### Dev Keys (Active During Gameplay)

Defined in `src/scenes/GameSceneDevTools.js`. All keys use raw `window.addEventListener('keydown')` with debounce state tracking (`_devKeyState`). These work in both dev mode and normal mode (god mode just defaults to on in dev):

| Key | Action | Function |
|-----|--------|----------|
| `I` | Toggle god mode (invulnerability) | `handleDevKey` -- toggles `scene.godMode`, shows floating text |
| `B` | Skip to boss wave | `skipToBoss` -- clears enemies, sets wave to 9, starts next wave (10 = boss) |
| `N` | Skip to next wave | `skipToNextWave` -- clears enemies, advances wave counter |
| `K` | Kill all enemies + boss | `killAllEnemies` -- destroys all active enemies, defeats boss if active |
| `U` | Force level-up (trigger upgrade card selection) | Calls `upgradeManager.triggerCardSelection()` |
| `X` | Grant +50 XP | Calls `xpManager.addXP(50)` |

### Additional Dev Key (Menu)

- `D` key on the menu screen: when daily attempt is used up, pressing `D` starts a new game anyway (`src/scenes/MenuScene.js` line 143)

### Global Debug Access

The Phaser game instance is exposed globally for console debugging:

```javascript
// src/main.js line 28
window.__GAME__ = game;

// In browser console:
window.__GAME__.scene.scenes[3]  // GameScene instance
window.__GAME__.scene.scenes[3].hp  // Current HP
window.__GAME__.scene.scenes[3].playerDamage  // Current damage
```

### Console Logging

Minimal `console.log`/`console.warn` usage in production code:
- `src/entities/AAXBoss.js` line 129: `console.warn("[BOSS] update stopped")` -- logged when boss update is called but boss is inactive
- `src/entities/AAXBoss.js` line 432: `console.log("[BOSS] HP:", this.hp)` -- logged every 50 HP on boss hits

No other console output exists. No structured logging framework.

## Build Verification

### Vite Build

```bash
npm run build    # Outputs to dist/
npm run preview  # Serves dist/ for verification
```

**Build config** (`vite.config.js`):
```javascript
export default defineConfig({
  base: './',        // Relative paths for deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: { open: true },
});
```

### Asset Generation Script

`scripts/generate-sfx.js` -- Node.js script that generates sound effects and music via ElevenLabs API:

```bash
ELEVENLABS_API_KEY=xxx node scripts/generate-sfx.js
```

Generates 6 SFX files + 1 music loop to `assets/sfx/`. Not part of the build pipeline -- run manually once.

### Pre-Deployment Checklist (Manual)

There are no automated checks. Manual verification approach:

1. **Run dev server:** `npm run dev`
2. **Add `?dev=1`** to enable dev keys
3. **Verify core loop:** Start game, check countdown, verify enemies spawn
4. **Test combat:** Let enemies approach, fire, verify hit detection
5. **Test upgrades:** Press `U` to trigger card selection, pick a card
6. **Test boss:** Press `B` to skip to boss, verify boss spawns and takes damage
7. **Test game over:** Press `I` to disable god mode, take damage until death
8. **Build check:** `npm run build && npm run preview`

## How the Developer Tests

### Primary Testing Method: Live Browser Playtesting

The primary (and only) testing method is manual browser testing via Vite dev server:

```bash
npm run dev
# Opens http://localhost:5173
# Add ?dev=1 for dev tools
```

### Seeded RNG for Reproducibility

The arena system provides deterministic game runs via seeded random:
- Seed is derived from the current ISO week: `starassault-2026-W09`
- All gameplay randomness (enemy spawns, elite rolls, XP orb scatter, weighted upgrade draws) uses `this.random` (mulberry32 PRNG seeded from the arena seed)
- Same seed = same enemy spawn sequence, same elite rolls, same drop chances
- This means bugs can be reproduced by using the same seed
- Pass custom seed via: `this.scene.start("Game", { seed: 'custom-seed' })`

### Arena System for Session Tracking

`src/systems/ArenaManager.js` stores attempt data in `localStorage`:
- Key: `star-assault-arena`
- Records: date, score breakdown, wave reached per attempt
- Weekly rotation with leaderboard history
- Can be inspected/cleared via browser DevTools > Application > Local Storage

### Visual Debugging Cues

The codebase includes several visual indicators useful for testing:
- **StatBar** (`src/ui/StatBar.js`): Bottom HUD strip shows real-time stats (DMG, RATE, SPD, SH, HP, CRIT, PIER, STK)
- **Enemy HP bars**: Graphics-drawn bars above every enemy showing current/max HP and shield pips
- **Boss HP bar**: Top-center progress bar during boss fights
- **XP bar**: Shows current XP / threshold and level
- **Kill streak counter**: Top-right corner, changes color at 10+ and 20+
- **Floating text**: Damage numbers, crit indicators, shield blocks, streak breaks all visible in real-time
- **Elite spawn flash**: Golden circle + "ELITE" text when elite enemies spawn

### Audio Debugging

`AudioManager` (`src/systems/AudioManager.js`) has built-in fallback:
- If SFX files are not loaded (`this.hasSFX = false`), it falls back to procedurally generated Web Audio tones
- `ProceduralMusic` (`src/systems/ProceduralMusic.js`) provides background music without any audio files
- Useful for testing in environments where audio files may not be available

## Test Types

**Unit Tests:**
- Not implemented. No unit test files exist.

**Integration Tests:**
- Not implemented. Puppeteer is available as a devDependency but not wired up.

**E2E Tests:**
- Not implemented.

**Manual Playtesting:**
- Primary and only testing method
- Dev keys provide shortcuts to reach specific game states quickly
- Seeded RNG ensures reproducible sessions for bug investigation

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

## Test Data / Fixtures

**Game Configuration as Implicit Test Data:**
- `src/config/waves.js`: 15 hand-designed waves serve as the primary test scenarios
- `src/config/upgrades.js`: 40 upgrades with specific stat values
- `src/config/synergies.js`: 8 synergy pairs
- Wave escalation beyond 15 is procedurally generated via `generateEscalationConfig()`

**Arena Seeds:**
- Weekly seeds rotate automatically
- Custom seeds can be injected for targeted testing:
  ```javascript
  // In browser console:
  window.__GAME__.scene.start("Game", { seed: 'test-seed-123', dev: true });
  ```

## Recommendations for Adding Tests

If automated testing is added in the future:

**Vitest would be the natural choice** (already using Vite for build).

**Testable pure logic modules (no Phaser dependency):**
- `src/systems/SeededRandom.js` -- pure functions, easily unit-testable
- `src/systems/ScoreManager.js` -- pure class, no scene dependency
- `src/systems/ArenaManager.js` -- uses localStorage, mockable
- `src/config/waves.js` (`generateEscalationConfig`) -- pure function
- `src/systems/PlayerStats.js` -- needs minimal scene mock (just an object with properties)

**Would require Phaser mocks:**
- All scene classes, entity classes, weapon subsystems
- Any code that calls `this.scene.add`, `this.scene.physics`, `this.scene.tweens`

---

*Testing analysis: 2026-02-24*
