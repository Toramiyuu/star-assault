#!/usr/bin/env node
/**
 * Generate pixel-art upgrade card icons using gemini-3.1-flash-image-preview.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/generate-upgrade-icons.js
 *   GEMINI_API_KEY=your_key node scripts/generate-upgrade-icons.js --force   # regenerate all
 *
 * Saves PNGs to assets/upgrade-icons/{id}.png.
 * Delete a file and re-run to regenerate it, or pass --force to redo all.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '../assets/upgrade-icons');
const FORCE     = process.argv.includes('--force');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set GEMINI_API_KEY environment variable.');
  console.error('  GEMINI_API_KEY=your_key node scripts/generate-upgrade-icons.js');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-image-preview';

const STYLE =
  'retro 16-bit pixel art game icon, bold chunky pixels, limited neon color palette, ' +
  'centered symbol on deep space dark circular background (#060612), ' +
  'glowing neon lines, clean crisp silhouette, no text, no UI, no labels, ' +
  'square image, dramatic sci-fi aesthetic';

const ICONS = [
  // ── GREY ──────────────────────────────────────────────────────────
  { id: 'G01', prompt: `rocket thruster engine nozzle, blue plasma exhaust, speed upgrade, ${STYLE}` },
  { id: 'G02', prompt: `targeting crosshair reticle, red laser sight, precision optics, ${STYLE}` },
  { id: 'G03', prompt: `reactor core energy crystal, pulsing green energy, power cell, ${STYLE}` },
  { id: 'G04', prompt: `horseshoe magnet with blue magnetic field lines, gravity coil, ${STYLE}` },
  { id: 'G05', prompt: `wrench and hull armor plate, repair tool, green health cross, ${STYLE}` },
  { id: 'G06', prompt: `four-leaf clover lucky charm, golden star constellation, luck symbol, ${STYLE}` },

  // ── GREEN ─────────────────────────────────────────────────────────
  { id: 'Gn01', prompt: `dual cannon barrels side by side, spread fire, twin nozzles blue plasma, ${STYLE}` },
  { id: 'Gn02', prompt: `overcharged plasma cell, crackling orange electricity, power cell glowing, ${STYLE}` },
  { id: 'Gn03', prompt: `syringe with glowing combat stims, neural enhancement, electric pulse, ${STYLE}` },
  { id: 'Gn04', prompt: `small hexagonal energy shield barrier, cyan force field, micro shield, ${STYLE}` },
  { id: 'Gn05', prompt: `two shooting stars, lucky crit stars, golden sparkling constellation, ${STYLE}` },
  { id: 'Gn06', prompt: `bullet piercing through two target rings, ion refractor, penetrating bolt, ${STYLE}` },
  { id: 'Gn07', prompt: `rocket booster with bright yellow exhaust flames, warp speed engines, ${STYLE}` },
  { id: 'Gn08', prompt: `heart with plus sign, max HP increase, red heart with armor plating, ${STYLE}` },

  // ── BLUE ──────────────────────────────────────────────────────────
  { id: 'B01', prompt: `fan of spreading bullets radiating outward, spread cannon, blue bolts, ${STYLE}` },
  { id: 'B02', prompt: `backward-facing gun turret, rear guard cannon, orange exhaust behind, ${STYLE}` },
  { id: 'B03', prompt: `circular plasma explosion ring, plasma burst AoE, expanding energy wave, ${STYLE}` },
  { id: 'B04', prompt: `small drone spacecraft with tracking arrow, seeker missile drone, ${STYLE}` },
  { id: 'B05', prompt: `quantum clock with lightning bolt, chrono capacitor, time accelerator, ${STYLE}` },
  { id: 'B06', prompt: `dark void energy shield, purple-black barrier, void energy absorption, ${STYLE}` },
  { id: 'B07', prompt: `bullet trailing toxic purple nebula cloud, poison damage trail, ${STYLE}` },
  { id: 'B08', prompt: `robotic AI eye with targeting reticle, precision circuit chip, ${STYLE}` },

  // ── PURPLE ────────────────────────────────────────────────────────
  { id: 'P01', prompt: `twin parallel laser beams, dual laser array, bright cyan laser lines, ${STYLE}` },
  { id: 'P02', prompt: `orbiting weapon satellite around planet, orbital cannon, spinning weapon, ${STYLE}` },
  { id: 'P03', prompt: `black hole grenade with event horizon swirl, gravity vortex, ${STYLE}` },
  { id: 'P04', prompt: `ship phasing through space with ghost trail, quantum phase blink, ${STYLE}` },
  { id: 'P05', prompt: `cascading critical hits chain lightning, crit cascade, electric chain, ${STYLE}` },
  { id: 'P06', prompt: `dark matter core glowing ominous purple, unstable power core orb, ${STYLE}` },
  { id: 'P07', prompt: `shield exploding outward energy pulse, pulsar shield burst, blue nova, ${STYLE}` },
  { id: 'P08', prompt: `ship teleporting with electric warp flash, warp strike blink attack, ${STYLE}` },

  // ── RED ───────────────────────────────────────────────────────────
  { id: 'R01', prompt: `event horizon gravitational anomaly, black hole swirling red spiral, ${STYLE}` },
  { id: 'R02', prompt: `photon beam devastator, full-width laser cannon charging, white beam, ${STYLE}` },
  { id: 'R03', prompt: `phoenix rising from ashes, undying protocol revival, red resurrection, ${STYLE}` },
  { id: 'R04', prompt: `rapid-fire gun overheating, bullet storm barrage, red barrel smoking, ${STYLE}` },
  { id: 'R05', prompt: `singularity engine core, red-gold damage multiplier, unstable reactor, ${STYLE}` },
  { id: 'R06', prompt: `explosion chain nova, death nova detonation chain, fiery orange blast, ${STYLE}` },

  // ── GOLD (COSMIC) ─────────────────────────────────────────────────
  { id: 'Au01', prompt: `cosmic rebirth, golden phoenix galaxy spiral, universal reset, bright gold, ${STYLE}` },
  { id: 'Au02', prompt: `supernova explosion, golden star going nova, blinding light burst, ${STYLE}` },
  { id: 'Au03', prompt: `god mode core, golden divine energy orb, pure cosmic power, omnipotent, ${STYLE}` },
  { id: 'Au04', prompt: `galactic arsenal, all weapons radiating outward, cosmic armory complete, ${STYLE}` },
];

async function generateIcon(id, prompt) {
  const outPath = resolve(OUT_DIR, `${id}.png`);
  if (!FORCE && existsSync(outPath)) {
    process.stdout.write(`  skip ${id} (exists)\n`);
    return;
  }

  process.stdout.write(`  ${id}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    process.stdout.write(` FAILED (${res.status})\n`);
    console.error(`    ${txt.slice(0, 200)}`);
    return;
  }

  const data = await res.json();
  let b64 = null;
  for (const candidate of data.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        b64 = part.inlineData.data;
        break;
      }
    }
    if (b64) break;
  }

  if (!b64) {
    process.stdout.write(` FAILED (no image)\n`);
    console.error(`    Response: ${JSON.stringify(data).slice(0, 200)}`);
    return;
  }

  await writeFile(outPath, Buffer.from(b64, 'base64'));
  process.stdout.write(` done\n`);
}

async function main() {
  console.log(`Star Assault — generating ${ICONS.length} upgrade icons via ${MODEL}\n`);
  if (FORCE) console.log('  --force: regenerating all icons\n');
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  for (const { id, prompt } of ICONS) {
    try {
      await generateIcon(id, prompt);
      // Small pause between calls to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`  ERROR ${id}: ${err.message}`);
    }
  }

  console.log('\nDone! Refresh the game to see new icons.');
  console.log('If any icon looks wrong, delete its PNG and re-run (or use --force).');
}

main();
