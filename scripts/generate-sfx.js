#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../assets/sfx");

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Set ELEVENLABS_API_KEY environment variable.");
  process.exit(1);
}

// ── Sound effects ──────────────────────────────────────────────────
const SFX = [
  { file: "shoot.mp3", prompt: "Short laser blaster shot, sci-fi weapon, punchy", duration: 0.5 },
  { file: "enemy_explosion.mp3", prompt: "Small sci-fi spaceship explosion, brief debris", duration: 1.0 },
  { file: "player_hit.mp3", prompt: "Shield impact hit, sci-fi damage taken, warning", duration: 0.8 },
  { file: "boss_explosion.mp3", prompt: "Massive boss explosion, deep rumble, debris, epic", duration: 2.0 },
  { file: "powerup.mp3", prompt: "Power-up collect, magical ascending sparkle chime", duration: 1.0 },
  { file: "wave_complete.mp3", prompt: "Short victory fanfare, level complete, triumphant", duration: 1.5 },
];

// ── Helpers ────────────────────────────────────────────────────────
async function generateSFX({ file, prompt, duration }) {
  const url = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
    body: JSON.stringify({ text: prompt, duration_seconds: duration, prompt_influence: 0.5 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SFX "${file}" failed (${res.status}): ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = resolve(OUT_DIR, file);
  await writeFile(out, buf);
  console.log(`  ✓ ${file} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function generateMusic() {
  const file = "music_loop.mp3";

  // Try the Music API first (requires paid plan)
  try {
    const musicUrl = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128";
    const res = await fetch(musicUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
      body: JSON.stringify({
        prompt: "Intense space battle background music, electronic, fast paced, loopable, sci-fi retro synth",
        music_length_ms: 30000,
        model_id: "music_v1",
        force_instrumental: true,
      }),
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(resolve(OUT_DIR, file), buf);
      console.log(`  ✓ ${file} (${(buf.length / 1024).toFixed(1)} KB) [Music API]`);
      return;
    }
    console.log(`  Music API returned ${res.status}, falling back to SFX API...`);
  } catch { /* fall through */ }

  // Fallback: use the SFX API (max ~22s, works on free tier)
  const sfxUrl = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128";
  const res = await fetch(sfxUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
    body: JSON.stringify({
      text: "Intense space battle background music loop, electronic synth, fast paced, sci-fi retro arcade",
      duration_seconds: 22,
      prompt_influence: 0.5,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Music "${file}" failed (${res.status}): ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(resolve(OUT_DIR, file), buf);
  console.log(`  ✓ ${file} (${(buf.length / 1024).toFixed(1)} KB) [SFX API fallback]`);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  console.log("Generating sound effects...");
  for (const sfx of SFX) {
    await generateSFX(sfx);
  }

  console.log("Generating music loop...");
  await generateMusic();

  console.log("\nDone! All files saved to assets/sfx/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
