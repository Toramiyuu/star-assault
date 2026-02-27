#!/usr/bin/env node
/**
 * Generate pixel-art drop icons using Google Imagen 3.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/generate-drop-icons.js
 *
 * Saves PNGs to assets/drops/. Run once; re-run any icon by deleting its file
 * and running again (each call produces a different result).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../assets/drops');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set GEMINI_API_KEY environment variable.');
  console.error('  GEMINI_API_KEY=your_key node scripts/generate-drop-icons.js');
  process.exit(1);
}

// Shared style suffix appended to every prompt
const STYLE =
  'retro 16-bit pixel art game sprite, bold chunky pixels, limited color palette, ' +
  'centered on a small dark circular background, black outer background, ' +
  'clean crisp silhouette, no text, no UI, no labels, square image';

const ICONS = {
  heart: {
    file: 'heart.png',
    prompt: `red heart pickup icon, classic heart shape, bright red with pink highlight, ${STYLE}`,
  },
  shield: {
    file: 'shield.png',
    prompt: `blue shield pickup icon, classic heater shield shape (pointed bottom, rounded top), bright blue with light blue highlight, ${STYLE}`,
  },
  bomb: {
    file: 'bomb.png',
    prompt: `bomb pickup icon, classic cartoon round bomb, dark grey sphere with shiny highlight, short brown fuse with bright orange glowing lit tip, ${STYLE}`,
  },
  magnet: {
    file: 'magnet.png',
    prompt: `horseshoe magnet pickup icon, U-shaped magnet, teal cyan body, red tip on left pole, blue tip on right pole, ${STYLE}`,
  },
  boost: {
    file: 'boost.png',
    prompt: `speed boost pickup icon, bright yellow electric lightning bolt, bold angular bolt shape, white inner glow, ${STYLE}`,
  },
  elite_shard: {
    file: 'elite_shard.png',
    prompt: `rare crystal shard pickup icon, faceted gem crystal, purple and gold colors, multiple facets with light reflection, glowing magical aura, ${STYLE} dark purple circular background`,
  },
};

async function generateIcon(name, cfg) {
  const outPath = resolve(OUT_DIR, cfg.file);

  if (existsSync(outPath)) {
    console.log(`  skip ${name} (already exists — delete to regenerate)`);
    return;
  }

  process.stdout.write(`  generating ${name}...`);

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `imagen-3.0-generate-001:predict?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: cfg.prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log(` FAILED`);
    console.error(`    API ${res.status}: ${text.slice(0, 200)}`);
    return;
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;

  if (!b64) {
    console.log(` FAILED`);
    console.error(`    No image data in response: ${JSON.stringify(data).slice(0, 200)}`);
    return;
  }

  await writeFile(outPath, Buffer.from(b64, 'base64'));
  console.log(` done → ${cfg.file}`);
}

async function main() {
  console.log('Star Assault — generating drop icons via Imagen 3\n');

  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  for (const [name, cfg] of Object.entries(ICONS)) {
    try {
      await generateIcon(name, cfg);
    } catch (err) {
      console.error(`  ERROR ${name}: ${err.message}`);
    }
  }

  console.log(
    '\nDone! Run `npm run dev` to see new icons.' +
    '\nIf any icon looks wrong, delete its PNG and re-run — each call differs.'
  );
}

main();
