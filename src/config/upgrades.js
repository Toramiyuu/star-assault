export const RARITY_COLORS = {
  GREY:   { border: '#9E9E9E', banner: '#757575' },
  GREEN:  { border: '#4CAF50', banner: '#2E7D32' },
  BLUE:   { border: '#2196F3', banner: '#1565C0' },
  PURPLE: { border: '#9C27B0', banner: '#6A1B9A' },
  RED:    { border: '#F44336', banner: '#B71C1C' },
  GOLD:   { border: '#FFC107', banner: '#F57F17' },
};

export const RARITY_WEIGHTS = {
  GREY: 100,
  GREEN: 50,
  BLUE: 20,
  PURPLE: 8,
  RED: 3,
  GOLD: 1,
};

export const UPGRADES = [
  // ========== GREY — Common ==========
  {
    id: 'G01', name: 'Thruster Tweak', rarity: 'GREY', type: 'passive',
    isPercent: true, maxLevel: 3,
    levels: [
      { label: '+8% Speed', values: { playerSpeed: 0.08 } },
      { label: '+16% Speed', values: { playerSpeed: 0.16 } },
      { label: '+25% Speed', values: { playerSpeed: 0.25 } },
    ],
    description: 'Minor engine calibration. Dodge bullets just a bit easier.',
  },
  {
    id: 'G02', name: 'Targeting Lens', rarity: 'GREY', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+1 DMG', values: { playerDamage: 1 } },
      { label: '+2 DMG', values: { playerDamage: 2 } },
      { label: '+4 DMG', values: { playerDamage: 4 } },
    ],
    description: 'Polished optics. Your shots land a little harder.',
  },
  {
    id: 'G03', name: 'Reactor Tick', rarity: 'GREY', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '-5% Cooldown', values: { playerCooldown: 0.05 } },
      { label: '-10% Cooldown', values: { playerCooldown: 0.10 } },
      { label: '-15% Cooldown', values: { playerCooldown: 0.15 } },
    ],
    description: 'Small reactor tweak lets weapons recycle slightly faster.',
  },
  {
    id: 'G04', name: 'Gravity Coil', rarity: 'GREY', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+20 Magnet', values: { playerMagnet: 20 } },
      { label: '+40 Magnet', values: { playerMagnet: 40 } },
      { label: '+60 Magnet', values: { playerMagnet: 60 } },
    ],
    description: 'Increased magnetic field pulls XP orbs from further away.',
  },
  {
    id: 'G05', name: 'Hull Patch', rarity: 'GREY', type: 'utility',
    isPercent: false, maxLevel: 3, special: 'heal',
    levels: [
      { label: 'Restore 1 HP', values: {} },
      { label: 'Restore 1 HP', values: {} },
      { label: 'Restore 1 HP', values: {} },
    ],
    description: 'Quick field repair. Each pick restores 1 HP up to current max.',
  },
  {
    id: 'G06', name: 'Lucky Charm', rarity: 'GREY', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+2 Luck', values: { playerLuck: 2 } },
      { label: '+4 Luck', values: { playerLuck: 4 } },
      { label: '+7 Luck', values: { playerLuck: 7 } },
    ],
    description: 'Slightly weights the roll pool toward higher rarities.',
  },

  // ========== GREEN — Uncommon ==========
  {
    id: 'Gn01', name: 'Dual Burner', rarity: 'GREEN', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+1 Spread (2 shots)', values: { playerSpread: 1 } },
      { label: '+2 Spread (3 shots)', values: { playerSpread: 2 } },
      { label: '+3 Spread (4 shots)', values: { playerSpread: 3 } },
    ],
    description: 'Side nozzles fire additional parallel shots.',
  },
  {
    id: 'Gn02', name: 'Overcharged Cell', rarity: 'GREEN', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+3 DMG', values: { playerDamage: 3 } },
      { label: '+6 DMG', values: { playerDamage: 6 } },
      { label: '+10 DMG', values: { playerDamage: 10 } },
    ],
    description: 'Hotter plasma, more kinetic force per round.',
  },
  {
    id: 'Gn03', name: 'Combat Stims', rarity: 'GREEN', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+0.2 Fire Rate', values: { playerFireRate: 0.2 } },
      { label: '+0.4 Fire Rate', values: { playerFireRate: 0.4 } },
      { label: '+0.6 Fire Rate', values: { playerFireRate: 0.6 } },
    ],
    description: 'Neural combat protocols increase trigger response.',
  },
  {
    id: 'Gn04', name: 'Micro Shield', rarity: 'GREEN', type: 'defense',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+1 Shield', values: { playerShield: 1 } },
      { label: '+2 Shield', values: { playerShield: 2 } },
      { label: '+3 Shield', values: { playerShield: 3 } },
    ],
    description: 'Small energy barrier absorbs hits before hull damage.',
  },
  {
    id: 'Gn05', name: 'Lucky Stars', rarity: 'GREEN', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+5% Crit', values: { playerCrit: 0.05 } },
      { label: '+10% Crit', values: { playerCrit: 0.10 } },
      { label: '+15% Crit', values: { playerCrit: 0.15 } },
    ],
    description: 'Random targeting glitches somehow result in critical strikes.',
  },
  {
    id: 'Gn06', name: 'Ion Refractor', rarity: 'GREEN', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+1 Pierce', values: { playerPierce: 1 } },
      { label: '+2 Pierce', values: { playerPierce: 2 } },
      { label: '+3 Pierce', values: { playerPierce: 3 } },
    ],
    description: 'Shots now punch through one enemy to hit the next.',
  },
  {
    id: 'Gn07', name: 'Warp Boosters', rarity: 'GREEN', type: 'passive',
    isPercent: true, maxLevel: 3,
    levels: [
      { label: '+15% Speed', values: { playerSpeed: 0.15 } },
      { label: '+25% Speed', values: { playerSpeed: 0.25 } },
      { label: '+40% Speed', values: { playerSpeed: 0.40 } },
    ],
    description: 'Experimental engine pods. You feel the difference immediately.',
  },
  {
    id: 'Gn08', name: 'Max HP Upgrade', rarity: 'GREEN', type: 'defense',
    isPercent: false, maxLevel: 3, special: 'maxhp',
    levels: [
      { label: '+1 Max HP', values: { playerMaxHP: 1 } },
      { label: '+2 Max HP', values: { playerMaxHP: 2 } },
      { label: '+3 Max HP', values: { playerMaxHP: 3 } },
    ],
    description: 'Reinforced life support. Also heals 1 HP on pickup.',
  },

  // ========== BLUE — Rare ==========
  {
    id: 'B01', name: 'Spread Cannon', rarity: 'BLUE', type: 'weapon',
    weaponId: 'B01', maxLevel: 3,
    levels: [
      { label: '3-shot spread', values: {} },
      { label: '5-shot spread', values: {} },
      { label: '7-shot spread +15% DMG', values: {} },
    ],
    description: 'Replaces single shot with a fanning spread of bolts.',
  },
  {
    id: 'B02', name: 'Rear Guard', rarity: 'BLUE', type: 'weapon',
    weaponId: 'B02', maxLevel: 3,
    levels: [
      { label: '1 shot backward', values: {} },
      { label: '2 shots backward', values: {} },
      { label: '3 shots backward +DMG', values: {} },
    ],
    description: 'Auto-turret fires behind you. No more running from Divers.',
  },
  {
    id: 'B03', name: 'Plasma Burst', rarity: 'BLUE', type: 'weapon',
    weaponId: 'B03', maxLevel: 3,
    levels: [
      { label: 'AoE burst every 4s', values: {} },
      { label: 'AoE burst every 3s', values: {} },
      { label: 'AoE burst every 2s +50% radius', values: {} },
    ],
    description: 'Periodic expanding plasma ring damages all nearby enemies.',
  },
  {
    id: 'B04', name: 'Seeker Drone', rarity: 'BLUE', type: 'weapon',
    weaponId: 'B04', maxLevel: 3,
    levels: [
      { label: '1 homing missile per 5s', values: {} },
      { label: '1 homing missile per 3s', values: {} },
      { label: '2 homing missiles per 3s', values: {} },
    ],
    description: 'Deploys a mini-drone that targets the nearest enemy.',
  },
  {
    id: 'B05', name: 'Chrono Capacitor', rarity: 'BLUE', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '-20% Cooldown', values: { playerCooldown: 0.20 } },
      { label: '-35% Cooldown', values: { playerCooldown: 0.35 } },
      { label: '-50% Cooldown', values: { playerCooldown: 0.50 } },
    ],
    description: 'Quantum timing chip. Everything fires faster.',
  },
  {
    id: 'B06', name: 'Void Shield', rarity: 'BLUE', type: 'defense',
    isPercent: false, maxLevel: 3, special: 'voidShield',
    levels: [
      { label: '+2 Shield, recharge 8s', values: { playerShield: 2 }, rechargeTime: 8000 },
      { label: '+3 Shield, recharge 6s', values: { playerShield: 3 }, rechargeTime: 6000 },
      { label: '+4 Shield, recharge 4s', values: { playerShield: 4 }, rechargeTime: 4000 },
    ],
    description: 'Void-energy barrier. Recharges mid-wave, not just between waves.',
  },
  {
    id: 'B07', name: 'Nebula Rounds', rarity: 'BLUE', type: 'weapon',
    weaponId: 'B07', maxLevel: 3,
    levels: [
      { label: 'Shots leave 1s damage cloud', values: {} },
      { label: '2s damage cloud', values: {} },
      { label: '3s damage cloud +DMG', values: {} },
    ],
    description: 'Bullets leave toxic nebula clouds that deal tick damage.',
  },
  {
    id: 'B08', name: 'Targeting AI', rarity: 'BLUE', type: 'passive',
    isPercent: false, maxLevel: 3, special: 'targetingAI',
    levels: [
      { label: '+20% Crit, +5 crit DMG', values: { playerCrit: 0.20 }, critDmgBonus: 5 },
      { label: '+30% Crit, +10 crit DMG', values: { playerCrit: 0.30 }, critDmgBonus: 10 },
      { label: '+40% Crit, +15 crit DMG', values: { playerCrit: 0.40 }, critDmgBonus: 15 },
    ],
    description: 'AI-assisted targeting drastically increases precision strikes.',
  },

  // ========== PURPLE — Epic ==========
  {
    id: 'P01', name: 'Twin Laser Array', rarity: 'PURPLE', type: 'weapon',
    weaponId: 'P01', maxLevel: 3,
    levels: [
      { label: 'Dual lasers replace cannon', values: {} },
      { label: '+30% laser DMG', values: {} },
      { label: '+60% DMG, beams widen', values: {} },
    ],
    description: 'Replaces your cannon with two continuous laser beams.',
  },
  {
    id: 'P02', name: 'Orbital Cannon', rarity: 'PURPLE', type: 'weapon',
    weaponId: 'P02', maxLevel: 3,
    levels: [
      { label: 'Satellite fires every 2s', values: {} },
      { label: 'Every 1.5s +DMG', values: {} },
      { label: 'Dual satellite, every 1s', values: {} },
    ],
    description: 'A weapons satellite orbits you, firing independently.',
  },
  {
    id: 'P03', name: 'Black Hole Grenade', rarity: 'PURPLE', type: 'weapon',
    weaponId: 'P03', maxLevel: 3,
    levels: [
      { label: 'Grenade every 8s, pulls enemies', values: {} },
      { label: 'Every 6s, bigger pull', values: {} },
      { label: 'Every 4s, enemies take 50 DMG/s', values: {} },
    ],
    description: 'Creates a micro black hole that drags enemies toward center.',
  },
  {
    id: 'P04', name: 'Quantum Phase', rarity: 'PURPLE', type: 'defense',
    isPercent: false, maxLevel: 3, special: 'quantumPhase',
    levels: [
      { label: '0.5s invuln on hit', values: {}, invulnTime: 500 },
      { label: '0.8s invuln on hit', values: {}, invulnTime: 800 },
      { label: '1.2s invuln + speed burst', values: {}, invulnTime: 1200 },
    ],
    description: 'Ship briefly phases out of realspace when hit. Built-in parry.',
  },
  {
    id: 'P05', name: 'Crit Cascade', rarity: 'PURPLE', type: 'passive',
    isPercent: false, maxLevel: 3, special: 'critCascade',
    levels: [
      { label: '+5% crit per chain', values: {}, chainBonus: 0.05 },
      { label: '+10% crit per chain', values: {}, chainBonus: 0.10 },
      { label: '+15% crit per chain', values: {}, chainBonus: 0.15 },
    ],
    description: 'Critical hits feed a momentum chain. Land enough and every shot crits.',
  },
  {
    id: 'P06', name: 'Dark Matter Core', rarity: 'PURPLE', type: 'passive',
    isPercent: false, maxLevel: 3,
    levels: [
      { label: '+10 DMG, +0.5 Rate', values: { playerDamage: 10, playerFireRate: 0.5 } },
      { label: '+20 DMG, +1.0 Rate', values: { playerDamage: 20, playerFireRate: 1.0 } },
      { label: '+35 DMG, +1.5 Rate', values: { playerDamage: 35, playerFireRate: 1.5 } },
    ],
    description: 'Unstable dark matter power source. Raw performance upgrade.',
  },
  {
    id: 'P07', name: 'Pulsar Shield', rarity: 'PURPLE', type: 'defense',
    isPercent: false, maxLevel: 3, special: 'pulsarShield',
    levels: [
      { label: 'Shield break: 20 DMG burst', values: {}, burstDamage: 20 },
      { label: 'Shield break: 40 DMG burst', values: {}, burstDamage: 40 },
      { label: 'Shield break: 80 DMG + stun', values: {}, burstDamage: 80 },
    ],
    description: 'When shield breaks, releases a damaging energy pulse outward.',
  },
  {
    id: 'P08', name: 'Warp Strike', rarity: 'PURPLE', type: 'weapon',
    weaponId: 'P08', maxLevel: 3,
    levels: [
      { label: 'Teleport + 100 DMG every 10s', values: {} },
      { label: '150 DMG every 7s', values: {} },
      { label: '200 DMG + stun every 5s', values: {} },
    ],
    description: 'You blink to the nearest enemy cluster and detonate.',
  },

  // ========== RED — Legendary ==========
  {
    id: 'R01', name: 'Event Horizon', rarity: 'RED', type: 'weapon',
    weaponId: 'R01', maxLevel: 3,
    levels: [
      { label: 'Permanent vortex pulls enemies', values: {} },
      { label: 'Bigger pull radius', values: {} },
      { label: 'Enemies take 50 DMG/s', values: {} },
    ],
    description: 'A permanent gravitational anomaly warps the battlefield.',
  },
  {
    id: 'R02', name: 'Photon Devastator', rarity: 'RED', type: 'weapon',
    weaponId: 'R02', maxLevel: 3,
    levels: [
      { label: 'Screen beam every 3s', values: {} },
      { label: 'Every 2.5s +50% DMG', values: {} },
      { label: 'Every 2s, full pierce', values: {} },
    ],
    description: 'Screen-wide beam fires periodically. Nothing survives it.',
  },
  {
    id: 'R03', name: 'Undying Protocol', rarity: 'RED', type: 'defense',
    isPercent: false, maxLevel: 3, special: 'undying',
    levels: [
      { label: 'Revive with 1 HP (once)', values: {}, reviveHP: 1 },
      { label: 'Revive with 2 HP', values: {}, reviveHP: 2 },
      { label: 'Revive with 3 HP + invuln', values: {}, reviveHP: 3 },
    ],
    description: 'Emergency resurrection software. One get-out-of-death-free card.',
  },
  {
    id: 'R04', name: 'Bullet Storm', rarity: 'RED', type: 'weapon',
    weaponId: 'R04', maxLevel: 3,
    levels: [
      { label: '3s of 10x fire every 12s', values: {} },
      { label: 'Every 10s', values: {} },
      { label: 'Every 8s + damage boost', values: {} },
    ],
    description: 'Systems briefly overload. Absolute carnage for 3 seconds.',
  },
  {
    id: 'R05', name: 'Singularity Engine', rarity: 'RED', type: 'passive',
    isPercent: false, maxLevel: 3, special: 'singularity',
    levels: [
      { label: 'All DMG x1.5', values: {}, dmgMultiplier: 1.5 },
      { label: 'All DMG x2.0', values: {}, dmgMultiplier: 2.0 },
      { label: 'All DMG x2.5, crits x3', values: {}, dmgMultiplier: 2.5 },
    ],
    description: 'Rewires your ship\'s power matrix. Everything hits harder.',
  },
  {
    id: 'R06', name: 'Death Nova', rarity: 'RED', type: 'passive',
    isPercent: false, maxLevel: 3, special: 'deathNova',
    levels: [
      { label: '5% kill explosion (80 DMG)', values: {}, chance: 0.05, damage: 80 },
      { label: '10% kill explosion (120 DMG)', values: {}, chance: 0.10, damage: 120 },
      { label: '20% kill explosion (200 DMG)', values: {}, chance: 0.20, damage: 200 },
    ],
    description: 'Enemies randomly detonate on death, chaining into nearby foes.',
  },

  // ========== GOLD — Cosmic ==========
  {
    id: 'Au01', name: 'COSMIC REBIRTH', rarity: 'GOLD', type: 'cosmic',
    maxLevel: 1, special: 'cosmicRebirth',
    levels: [
      { label: 'Full HP + 30% all stats', values: {} },
    ],
    description: 'The universe resets your ship to peak condition. One time.',
  },
  {
    id: 'Au02', name: 'SUPERNOVA FORM', rarity: 'GOLD', type: 'cosmic',
    maxLevel: 1, special: 'supernova',
    levels: [
      { label: '20s invincible + 500% DMG', values: {} },
    ],
    description: 'You become a star for 20 seconds. Save it for AAX.',
  },
  {
    id: 'Au03', name: 'GOD MODE CORE', rarity: 'GOLD', type: 'cosmic',
    maxLevel: 1, special: 'godModeCore',
    levels: [
      { label: '+5 HP, +5 Shield, x2 DMG, -50% CD', values: {} },
    ],
    description: 'Pure cosmic energy reforges your entire ship. The complete package.',
  },
  {
    id: 'Au04', name: 'GALACTIC ARSENAL', rarity: 'GOLD', type: 'cosmic',
    maxLevel: 1, special: 'arsenal',
    levels: [
      { label: 'Unlock ALL weapons', values: {} },
    ],
    description: 'Every weapon system activates at once. Beautiful chaos.',
  },
];
