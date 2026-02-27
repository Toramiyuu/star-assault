const DEFAULTS = {
  playerDamage: 10,
  playerFireRate: 1.0,
  playerSpeed: 450,
  playerShield: 1,
  playerMaxHP: 5,
  playerMagnet: 80,
  playerCrit: 0.05,
  playerPierce: 0,
  playerSpread: 1,
  playerCooldown: 0,
  playerBlastArea: 1.0,
  playerLifeSteal: 0,
};

const CAPS = {
  playerSpeed: 700,
  playerFireRate: 8.0,
  playerShield: 8,
  playerMaxHP: 10,
  playerMagnet: 400,
  playerCrit: 0.80,
  playerPierce: 5,
  playerSpread: 7,
  playerCooldown: 0.6,
  playerBlastArea: 2.5,
  playerLifeSteal: 0.3,
};

export class PlayerStats {
  constructor(scene) {
    this.scene = scene;
    this.defaults = { ...DEFAULTS };
    this.flatMods = {};
    this.percentMods = {};
    this.reset();
  }

  reset() {
    this.flatMods = {};
    this.percentMods = {};
    this.scene.playerShieldCurrent = this.defaults.playerShield;
    this.scene.playerCurrentHP = this.defaults.playerMaxHP;
    // Kill streak tracking
    this.scene.killStreak = 0;
    this.scene.killStreakBonus = 0;
    this.scene.nearMissCount = 0;
    // Life steal damage accumulator
    this.scene.lifeStealDmgAccum = 0;
    this._apply();
  }

  get(name) {
    return this.scene[name];
  }

  set(name, value) {
    this.scene[name] = value;
  }

  addFlat(stat, value) {
    this.flatMods[stat] = (this.flatMods[stat] || 0) + value;
    this._apply();
  }

  addPercent(stat, value) {
    this.percentMods[stat] = (this.percentMods[stat] || 0) + value;
    this._apply();
  }

  removeFlat(stat, value) {
    this.flatMods[stat] = (this.flatMods[stat] || 0) - value;
    this._apply();
  }

  removePercent(stat, value) {
    this.percentMods[stat] = (this.percentMods[stat] || 0) - value;
    this._apply();
  }

  modify(stat, delta, isPercent) {
    if (isPercent) {
      this.addPercent(stat, delta);
    } else {
      this.addFlat(stat, delta);
    }
  }

  _apply() {
    for (const [key, base] of Object.entries(this.defaults)) {
      const flat = this.flatMods[key] || 0;
      const pct = this.percentMods[key] || 0;
      let val = base * (1 + pct) + flat;
      // Apply caps
      if (CAPS[key] !== undefined) {
        val = Math.min(val, CAPS[key]);
      }
      this.scene[key] = val;
    }
  }

  getDefault(stat) {
    return this.defaults[stat];
  }
}
