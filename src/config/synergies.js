export const SYNERGIES = [
  {
    pair: ['Gn01', 'B01'],
    name: 'Galaxy Spray',
    bonus: { playerSpread: 9 },
    description: '9-shot spread fills the entire screen width',
  },
  {
    pair: ['B04', 'P02'],
    name: 'Swarm Protocol',
    bonus: { special: 'swarmProtocol' },
    description: 'Drones and cannon fire in coordinated bursts',
  },
  {
    pair: ['B03', 'P03'],
    name: 'Singularity Pulse',
    bonus: { special: 'singularityPulse' },
    description: 'Burst pulls enemies inward then explodes them outward',
  },
  {
    pair: ['P05', 'R04'],
    name: 'Nova Strike',
    bonus: { special: 'novaStrike' },
    description: 'During storm, crits guaranteed and cascade resets after each crit',
  },
  {
    pair: ['P04', 'P08'],
    name: 'Ghost Blade',
    bonus: { special: 'ghostBlade' },
    description: 'Warp Strike triggers phase invincibility on arrival',
  },
  {
    pair: ['P01', 'P06'],
    name: 'Annihilator Beam',
    bonus: { special: 'annihilatorBeam' },
    description: 'Lasers widen, gain 80% bonus DMG, beams chain on kill',
  },
  {
    pair: ['R06', 'R01'],
    name: 'Heat Death',
    bonus: { special: 'heatDeath' },
    description: 'Black hole kills cause nova chains — cascade wipes entire waves',
  },
  {
    pair: ['_ANY_RED', '_ANY_GOLD'],
    name: 'Transcendence',
    bonus: { special: 'transcendence', allStatsPercent: 0.15 },
    description: '+15% to all stats as a one-time bonus',
  },
];
