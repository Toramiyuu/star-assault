// Enemy type base stats for horde-survival mode
export const ENEMY_TYPES = {
  grunt: {
    sprites: ['enemy_01', 'enemy_02'],
    speed: 90,
    hp: 10,
    fireRate: 3000,
    tint: null,
  },
  zigzagger: {
    sprites: ['enemy_03'],
    speed: 110,
    hp: 15,
    fireRate: 5000,
    tint: 0x00ffff,
  },
  diver: {
    sprites: ['enemy_04'],
    speed: 200,
    hp: 18,
    fireRate: 9999,
    tint: 0xff4444,
  },
  formation_leader: {
    sprites: ['enemy_05'],
    speed: 70,
    hp: 30,
    fireRate: 4500,
    tint: 0xffff00,
    shield: 2,
  },
  bomber: {
    sprites: ['enemy_06'],
    speed: 60,
    hp: 40,
    fireRate: 9999,
    tint: 0xff6600,
    shield: 2,
    detonateRadius: 220,
    telegraphTime: 1200,
    aoeRadius: 180,
  },
};

// Wave configs: minAlive = minimum enemies on screen, spawnInterval = ms between spawns,
// duration = ms before next wave (0 = until boss defeated), enemies = weighted pool
export const WAVE_CONFIGS = [
  // Wave 1: Grunts only — gentler
  {
    minAlive: 2, spawnInterval: 3500, duration: 22000,
    enemies: [{ type: 'grunt', weight: 1 }],
  },
  // Wave 2: Grunts + Zigzaggers — gentler
  {
    minAlive: 3, spawnInterval: 3000, duration: 22000,
    enemies: [{ type: 'grunt', weight: 2 }, { type: 'zigzagger', weight: 1 }],
  },
  // Wave 3: Grunts + Zigzaggers + Divers — gentler
  {
    minAlive: 5, spawnInterval: 2500, duration: 25000,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 1 },
    ],
  },
  // Wave 4: All standard types — gentler
  {
    minAlive: 8, spawnInterval: 2000, duration: 25000,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 1 },
      { type: 'formation_leader', weight: 1 },
    ],
  },
  // Wave 5: + Bombers
  {
    minAlive: 12, spawnInterval: 1500, duration: 28000,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 2 },
      { type: 'formation_leader', weight: 1 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 6: All types heavy
  {
    minAlive: 14, spawnInterval: 1200, duration: 28000,
    enemies: [
      { type: 'grunt', weight: 3 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 2 },
      { type: 'formation_leader', weight: 1 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 7: Formation Leaders in pairs
  {
    minAlive: 16, spawnInterval: 1000, duration: 30000,
    enemies: [
      { type: 'grunt', weight: 1 },
      { type: 'zigzagger', weight: 1 },
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 2 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 8: Elites more frequent
  {
    minAlive: 18, spawnInterval: 900, duration: 30000,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 2 },
      { type: 'formation_leader', weight: 3 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 9: Pre-boss barrage
  {
    minAlive: 20, spawnInterval: 700, duration: 30000,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 3 },
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 2 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 10: AAX Boss + continuous grunt harassment
  {
    boss: 'boss_aax', bossHP: 2000,
    minAlive: 5, spawnInterval: 2000, duration: 0,
    enemies: [{ type: 'grunt', weight: 1 }],
  },
  // Wave 11
  {
    minAlive: 18, spawnInterval: 800, duration: 28000,
    hpMultiplier: 1.2,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 2 },
      { type: 'formation_leader', weight: 2 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 12
  {
    minAlive: 20, spawnInterval: 700, duration: 28000,
    hpMultiplier: 1.3,
    enemies: [
      { type: 'grunt', weight: 1 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 2 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 13
  {
    minAlive: 22, spawnInterval: 700, duration: 30000,
    hpMultiplier: 1.4,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 3 },
      { type: 'bomber', weight: 1 },
    ],
  },
  // Wave 14
  {
    minAlive: 24, spawnInterval: 600, duration: 30000,
    hpMultiplier: 1.5,
    enemies: [
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 3 },
      { type: 'zigzagger', weight: 2 },
      { type: 'grunt', weight: 1 },
      { type: 'bomber', weight: 2 },
    ],
  },
  // Wave 15: Boss + harassment
  {
    boss: 'boss_aax', bossHP: 3500,
    minAlive: 8, spawnInterval: 1500, duration: 0,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 1 },
    ],
  },
];

export function generateEscalationConfig(waveNum) {
  const scale = 1 + (waveNum - 15) * 0.1;
  const minAlive = Math.min(20 + Math.floor((waveNum - 15) * 0.5), 30);
  const spawnInterval = Math.max(400, Math.floor(800 / scale));

  // Every 5th wave is a boss wave
  if (waveNum % 5 === 0) {
    return {
      boss: 'boss_aax',
      bossHP: 600 + (waveNum - 10) * 40,
      minAlive: 8,
      spawnInterval: 1500,
      duration: 0,
      enemies: [
        { type: 'grunt', weight: 2 },
        { type: 'zigzagger', weight: 1 },
      ],
      hpMultiplier: scale,
    };
  }

  return {
    minAlive,
    spawnInterval,
    duration: 30000,
    hpMultiplier: scale,
    enemies: [
      { type: 'grunt', weight: 2 },
      { type: 'zigzagger', weight: 2 },
      { type: 'diver', weight: 3 },
      { type: 'formation_leader', weight: 2 },
      { type: 'bomber', weight: 1 },
    ],
  };
}
