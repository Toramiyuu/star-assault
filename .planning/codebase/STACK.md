# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- JavaScript (ES2022+) - All game logic, no TypeScript

**Secondary:**
- HTML5 - Single-page entry point `index.html`
- CSS - Inline styles in `index.html` only (minimal: margin/padding reset, overflow hidden, black background)

## Runtime

**Environment:**
- Node.js 22 (specified in `.nvmrc`)
- Installed: v24.5.0 (runtime machine has a newer version than `.nvmrc` requests)
- Browser: Any modern browser with WebGL/Canvas and Web Audio support

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Phaser 4.0.0-rc.6 (`phaser` ^4.0.0-rc.6) - Game engine, handles rendering (WebGL/Canvas), physics (Arcade), input, tweens, scene management, asset loading
  - **Note:** This is a release candidate, not a stable release. Phaser 4 uses ES module imports natively.
  - Renderer: `Phaser.AUTO` (prefers WebGL, falls back to Canvas)
  - Physics: Arcade (zero-gravity, top-down shooter)
  - Scale mode: `Phaser.Scale.FIT` with `CENTER_BOTH` for responsive mobile display

**Testing:**
- None configured (no test framework, no test files, no test scripts)

**Build/Dev:**
- Vite 7.3.1 (`vite` ^7.3.1) - Dev server with hot reload, production bundler
  - Config: `vite.config.js`
  - Dev server: `npm run dev` (auto-opens browser)
  - Build output: `dist/` directory with `index.html` + `assets/`
  - Base path: `./` (relative, suitable for static hosting)

## Key Dependencies

**Critical (production):**
- `phaser` 4.0.0-rc.6 - The entire game engine. Provides rendering, physics, input, audio playback, asset loading, tweens, scene graph, timers, sprite batching, and groups/pools

**Dev Dependencies:**
- `vite` 7.3.1 - Build tooling and dev server
- `puppeteer` 24.37.5 - Listed but no scripts reference it directly; likely used for automated screenshot/testing workflows outside the codebase

## Scripts

```json
{
  "dev": "vite",           // Start dev server with HMR, auto-opens browser
  "build": "vite build",   // Production build to dist/
  "preview": "vite preview" // Preview production build locally
}
```

**Utility Scripts:**
- `scripts/generate-sfx.js` - Node.js script that calls the ElevenLabs API to generate sound effects and music. Requires `ELEVENLABS_API_KEY` env var. Outputs MP3 files to `assets/sfx/`. Run manually, not wired to npm scripts.

## Configuration

**Vite Config** (`vite.config.js`):
```javascript
export default defineConfig({
    base: './',           // Relative paths for static hosting
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        open: true,       // Auto-open browser on dev
    },
});
```

**Game Config** (`src/main.js`):
```javascript
const config = {
    type: Phaser.AUTO,
    width: 1080,
    height: 1920,          // Mobile portrait
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
    },
    backgroundColor: '#000000',
    scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultsScene],
};
```

**Game Constants** (`src/config/constants.js`):
- `GAME` - Width/height (1080x1920), background scroll speed
- `PLAYER` - Speed, max HP, invulnerability duration, fire rate, bullet speed
- `ENEMIES` - Speed, HP, fire rate, bullet speed
- `BOSSES` - HP multiplier, phase thresholds
- `SCORING` - Kill values, wave bonuses, accuracy multipliers
- `POWERUPS` - Drop chance, duration values

**Environment:**
- `.env` in `.gitignore` - Expected to contain `ELEVENLABS_API_KEY` for SFX generation script
- No runtime env vars needed (fully client-side game)
- Dev mode activated via URL param: `?dev=1`

## Module System

**Type:** ES Modules (`"type": "module"` in `package.json`)

**Import Pattern:**
```javascript
import { Scene } from 'phaser';             // Framework imports
import { GAME, PLAYER } from '../config/constants.js'; // Config
import { AudioManager } from '../systems/AudioManager.js'; // Systems
```

- All internal imports use explicit `.js` extensions
- No path aliases configured
- No barrel/index files

## Platform Requirements

**Development:**
- Node.js 22+ (for Vite dev server)
- npm (for dependency management)
- Modern browser with WebGL support

**Production:**
- Static file hosting only (no server required)
- Browser requirements: WebGL or Canvas 2D, Web Audio API, ES Module support
- Target: Mobile portrait (1080x1920) with responsive scaling
- `window.__GAME__` exposed globally for debugging

## Asset Pipeline

**Build:**
- Vite handles JS bundling and asset copying
- Assets in `assets/` are loaded at runtime by Phaser's loader (not imported via JS)
- Production build outputs to `dist/` with `dist/assets/` mirroring source structure

**No Additional Tooling:**
- No linting (no ESLint, no Biome)
- No formatting (no Prettier)
- No TypeScript
- No CSS preprocessors
- No CI/CD configuration files detected

---

*Stack analysis: 2026-02-24*
