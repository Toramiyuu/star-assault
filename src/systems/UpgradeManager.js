import { GAME } from '../config/constants.js';
import { UPGRADES, RARITY_WEIGHTS } from '../config/upgrades.js';
import { SYNERGIES } from '../config/synergies.js';
import { UpgradeCardUI } from '../ui/UpgradeCardUI.js';

const LUCK_MODIFIERS = {
  GREEN:  0.5,
  BLUE:   0.2,
  PURPLE: 0.1,
  RED:    0.03,
  GOLD:   0.01,
};

export class UpgradeManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.ownedUpgrades = new Map(); // id -> current level (1-based)
    this.activeSynergies = new Set();
    this.cardUI = new UpgradeCardUI(scene, this);
    this.undyingUsed = false;
    this.critChainCount = 0;

    // Singularity Engine multiplier
    this.dmgMultiplier = 1.0;
    // Targeting AI crit damage bonus
    this.critDmgBonus = 0;
    // Death Nova data
    this.deathNovaChance = 0;
    this.deathNovaDamage = 0;
    // Quantum Phase invuln duration
    this.quantumPhaseTime = 0;
    // Pulsar Shield burst damage
    this.pulsarBurstDamage = 0;
    // Crit Cascade chain bonus
    this.critCascadeBonus = 0;
    // Void Shield recharge timer
    this.voidShieldRechargeTime = 0;
    this.voidShieldTimer = 0;
  }

  triggerCardSelection() {
    // Don't interrupt a boss cutscene — the delayedCall chain in triggerHornModeTransition
    // uses scene.time, which would freeze if we set time.paused = true here.
    // Queue the level-up instead and fire it once the cutscene ends.
    if (this.scene.cutscenePlaying) {
      this._queuedLevelUp = true;
      return;
    }

    const cards = this.drawCards(3);
    if (cards.length === 0) return; // no upgrades available

    // Pause game
    this.scene.upgradePaused = true;
    this.scene.physics.pause();
    this.scene.time.paused = true;

    this.cardUI.show(cards);
  }

  drawCards(count) {
    const wave = this.scene.waveManager?.currentWave || 1;
    const luck = this.scene.playerLuck || 0;

    // Build eligible pool
    const pool = UPGRADES.filter((u) => {
      // Wave restrictions
      if (u.rarity === 'RED' && wave < 3) return false;
      if (u.rarity === 'GOLD' && wave < 5) return false;
      // Already at max level
      const owned = this.ownedUpgrades.get(u.id) || 0;
      if (owned >= u.maxLevel) return false;
      return true;
    });

    if (pool.length === 0) return [];

    // Calculate effective weights per rarity
    const weights = { ...RARITY_WEIGHTS };
    for (const [rarity, mod] of Object.entries(LUCK_MODIFIERS)) {
      weights[rarity] = (weights[rarity] || 0) + luck * mod;
    }

    const drawn = [];
    const usedIds = new Set();

    for (let i = 0; i < count && pool.length > 0; i++) {
      // Filter out already drawn IDs
      const available = pool.filter((u) => !usedIds.has(u.id));
      if (available.length === 0) break;

      // Weighted random draw
      const totalWeight = available.reduce((sum, u) => sum + (weights[u.rarity] || 1), 0);
      let roll = this.random() * totalWeight;
      let picked = available[0];

      for (const u of available) {
        roll -= weights[u.rarity] || 1;
        if (roll <= 0) {
          picked = u;
          break;
        }
      }

      usedIds.add(picked.id);
      const currentLevel = this.ownedUpgrades.get(picked.id) || 0;
      drawn.push({
        upgrade: picked,
        currentLevel,
        isLevelUp: currentLevel > 0,
      });
    }

    return drawn;
  }

  applyUpgrade(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade) return;

    const currentLevel = this.ownedUpgrades.get(id) || 0;
    const newLevel = currentLevel + 1;

    // Handle special utility: Hull Patch
    if (upgrade.special === 'heal') {
      this.scene.hp = Math.min(this.scene.hp + 1, this.scene.playerMaxHP);
      // Reset level so it can be offered again
      this.ownedUpgrades.set(id, 0);
      return;
    }

    // Handle cosmic upgrades
    if (upgrade.type === 'cosmic') {
      this._applyCosmicUpgrade(upgrade);
      this.ownedUpgrades.set(id, 1);
      return;
    }

    // Remove old level values if upgrading
    if (currentLevel > 0) {
      const oldLevel = upgrade.levels[currentLevel - 1];
      this._removeUpgradeValues(upgrade, oldLevel);
    }

    // Apply new level values
    const newLevelData = upgrade.levels[newLevel - 1];
    this._applyUpgradeValues(upgrade, newLevelData);

    // Handle weapon upgrades
    if (upgrade.type === 'weapon' && upgrade.weaponId) {
      if (this.scene.weaponManager) {
        this.scene.weaponManager.addWeapon(upgrade.weaponId, newLevel);
      }
    }

    // Handle defense upgrades
    if (upgrade.type === 'defense') {
      this._applyDefenseUpgrade(upgrade, newLevelData, newLevel, currentLevel);
    }

    // Handle special passives
    this._applySpecialPassive(upgrade, newLevelData, newLevel);

    this.ownedUpgrades.set(id, newLevel);
  }

  _applyUpgradeValues(upgrade, levelData) {
    if (!levelData.values) return;
    const stats = this.scene.playerStats;
    for (const [stat, val] of Object.entries(levelData.values)) {
      stats.modify(stat, val, upgrade.isPercent || false);
    }
  }

  _removeUpgradeValues(upgrade, levelData) {
    if (!levelData.values) return;
    const stats = this.scene.playerStats;
    for (const [stat, val] of Object.entries(levelData.values)) {
      if (upgrade.isPercent) {
        stats.removePercent(stat, val);
      } else {
        stats.removeFlat(stat, val);
      }
    }
  }

  _applyDefenseUpgrade(upgrade, levelData, newLevel, oldLevel) {
    if (upgrade.special === 'maxhp') {
      // Also heal 1 HP on pickup
      this.scene.hp = Math.min(this.scene.hp + 1, this.scene.playerMaxHP);
    }
    if (upgrade.special === 'voidShield') {
      this.voidShieldRechargeTime = levelData.rechargeTime || 0;
      this.scene.playerShieldCurrent = this.scene.playerShield;
    }
    if (upgrade.special === 'quantumPhase') {
      this.quantumPhaseTime = levelData.invulnTime || 0;
    }
    if (upgrade.special === 'pulsarShield') {
      this.pulsarBurstDamage = levelData.burstDamage || 0;
    }
    if (upgrade.special === 'undying') {
      this.undyingUsed = false; // Reset on upgrade
    }

    // Refresh shield current to new max
    if (levelData.values?.playerShield !== undefined) {
      this.scene.playerShieldCurrent = this.scene.playerShield;
    }
  }

  _applySpecialPassive(upgrade, levelData, newLevel) {
    if (upgrade.special === 'singularity') {
      this.dmgMultiplier = levelData.dmgMultiplier || 1.0;
    }
    if (upgrade.special === 'targetingAI') {
      this.critDmgBonus = levelData.critDmgBonus || 0;
    }
    if (upgrade.special === 'deathNova') {
      this.deathNovaChance = levelData.chance || 0;
      this.deathNovaDamage = levelData.damage || 0;
    }
    if (upgrade.special === 'critCascade') {
      this.critCascadeBonus = levelData.chainBonus || 0;
    }
  }

  _applyCosmicUpgrade(upgrade) {
    const scene = this.scene;
    const stats = scene.playerStats;

    switch (upgrade.special) {
      case 'cosmicRebirth':
        // Full HP + 30% all stats
        scene.hp = scene.playerMaxHP;
        stats.addPercent('playerDamage', 0.30);
        stats.addPercent('playerFireRate', 0.30);
        stats.addPercent('playerSpeed', 0.30);
        stats.addPercent('playerMagnet', 0.30);
        stats.addPercent('playerCrit', 0.30);
        stats.addPercent('playerBlastArea', 0.30);
        break;

      case 'supernova':
        // 20s invincible + 500% DMG
        scene.isInvulnerable = true;
        const origDamage = scene.playerDamage;
        stats.addPercent('playerDamage', 5.0);
        scene.time.paused = false; // Ensure timer works
        scene.time.delayedCall(20000, () => {
          scene.isInvulnerable = false;
          stats.removePercent('playerDamage', 5.0);
        });
        break;

      case 'godModeCore':
        // +5 Max HP, +5 Shield, x2 DMG, -50% Cooldown
        stats.addFlat('playerMaxHP', 5);
        stats.addFlat('playerShield', 5);
        stats.addPercent('playerDamage', 1.0); // x2
        stats.addFlat('playerCooldown', 0.50);
        scene.hp = Math.min(scene.hp + 5, scene.playerMaxHP);
        scene.playerShieldCurrent = scene.playerShield;
        break;

      case 'arsenal':
        // Activate all base weapons at level 1
        if (scene.weaponManager) {
          const baseWeapons = ['B01', 'B02', 'B03', 'B04', 'P01', 'P02', 'P03', 'P08', 'R01', 'R02', 'R04'];
          for (const wid of baseWeapons) {
            if (!scene.weaponManager.weapons.has(wid)) {
              scene.weaponManager.addWeapon(wid, 1);
            }
          }
        }
        break;
    }
  }

  checkSynergies() {
    for (const synergy of SYNERGIES) {
      if (this.activeSynergies.has(synergy.name)) continue;

      let matched = false;
      if (synergy.pair[0] === '_ANY_RED' && synergy.pair[1] === '_ANY_GOLD') {
        // Special: any RED + any GOLD
        const hasRed = [...this.ownedUpgrades.keys()].some((id) => {
          const u = UPGRADES.find((up) => up.id === id);
          return u && u.rarity === 'RED';
        });
        const hasGold = [...this.ownedUpgrades.keys()].some((id) => {
          const u = UPGRADES.find((up) => up.id === id);
          return u && u.rarity === 'GOLD';
        });
        matched = hasRed && hasGold;
      } else {
        matched = this.ownedUpgrades.has(synergy.pair[0]) && this.ownedUpgrades.has(synergy.pair[1]);
      }

      if (matched) {
        this.activeSynergies.add(synergy.name);
        this._applySynergyBonus(synergy);
        this._showSynergyBanner(synergy.name);
      }
    }
  }

  _applySynergyBonus(synergy) {
    const stats = this.scene.playerStats;
    const bonus = synergy.bonus;

    if (bonus.playerSpread) {
      stats.addFlat('playerSpread', bonus.playerSpread);
    }
    if (bonus.allStatsPercent) {
      const pct = bonus.allStatsPercent;
      stats.addPercent('playerDamage', pct);
      stats.addPercent('playerFireRate', pct);
      stats.addPercent('playerSpeed', pct);
      stats.addPercent('playerMagnet', pct);
      stats.addPercent('playerCrit', pct);
      stats.addPercent('playerBlastArea', pct);
    }
  }

  _showSynergyBanner(name) {
    const scene = this.scene;
    const banner = scene.add.text(
      GAME.WIDTH / 2, GAME.HEIGHT / 2 - 200,
      `SYNERGY UNLOCKED: ${name}`,
      {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#FFC107',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(400).setScale(0);

    scene.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: banner,
          alpha: 0,
          delay: 1700,
          duration: 300,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  onCardSelected() {
    // Resume game
    this.scene.upgradePaused = false;
    this.scene.physics.resume();
    this.scene.time.paused = false;

    // 1s invulnerability
    this.scene.isInvulnerable = true;
    this.scene.time.delayedCall(1000, () => {
      this.scene.isInvulnerable = false;
      if (this.scene.player?.active) this.scene.player.setAlpha(1);
    });

    // Flash player
    this.scene.tweens.add({
      targets: this.scene.player,
      alpha: { from: 0.4, to: 1 },
      duration: 150,
      repeat: 3,
    });

    // Check synergies
    this.checkSynergies();
  }

  // Calculate final damage for a bullet
  calculateDamage(baseDamage, isCrit) {
    let dmg = baseDamage * this.dmgMultiplier;
    if (isCrit) {
      dmg *= 2;
      dmg += this.critDmgBonus;
      // Singularity Engine L3: crits deal x3 total
      if (this.dmgMultiplier >= 2.5) {
        dmg = baseDamage * 3 + this.critDmgBonus;
      }
    }
    return Math.round(dmg);
  }

  // Roll crit using seeded random
  rollCrit() {
    let critChance = this.scene.playerCrit || 0.05;
    // Crit Cascade bonus
    critChance += this.critChainCount * this.critCascadeBonus;
    critChance = Math.min(critChance, 1.0);
    const isCrit = this.random() < critChance;

    if (this.critCascadeBonus > 0) {
      if (isCrit) {
        this.critChainCount++;
      } else {
        this.critChainCount = 0;
      }
    }

    return isCrit;
  }

  // Void Shield recharge tick
  updateVoidShield(delta) {
    if (this.voidShieldRechargeTime <= 0) return;
    if (this.scene.playerShieldCurrent >= this.scene.playerShield) return;

    this.voidShieldTimer += delta;
    if (this.voidShieldTimer >= this.voidShieldRechargeTime) {
      this.voidShieldTimer = 0;
      this.scene.playerShieldCurrent = this.scene.playerShield;
    }
  }

  // Check Undying Protocol on death
  checkUndying() {
    const level = this.ownedUpgrades.get('R03') || 0;
    if (level === 0 || this.undyingUsed) return false;

    this.undyingUsed = true;
    const upgrade = UPGRADES.find((u) => u.id === 'R03');
    const reviveHP = upgrade.levels[level - 1].reviveHP || 1;
    this.scene.hp = reviveHP;
    this.scene.isInvulnerable = true;

    if (level >= 3) {
      this.scene.time.delayedCall(2000, () => {
        this.scene.isInvulnerable = false;
      });
    } else {
      this.scene.time.delayedCall(1000, () => {
        this.scene.isInvulnerable = false;
      });
    }

    this.scene.showFloatingText(
      this.scene.player.x, this.scene.player.y - 60,
      'UNDYING PROTOCOL!', '#F44336'
    );

    return true;
  }

  // Death Nova check on enemy kill
  checkDeathNova(x, y) {
    if (this.deathNovaChance <= 0) return;
    if (this.random() >= this.deathNovaChance) return;

    // Explosion at death position
    const damage = this.deathNovaDamage;
    const radius = 120 * (this.scene.playerBlastArea || 1.0);

    this.scene.explosions.play(x, y, 'enemy_explosion', 9, 0.15);

    // Damage nearby enemies
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const dx = e.x - x;
      const dy = e.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        let hp = e.getData('hp') - damage;
        e.setData('hp', hp);
        if (hp <= 0) {
          this.scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
          e.destroy();
          this.scene.waveManager.onEnemyRemoved();
          // Chain: check again for chaining
          this.checkDeathNova(e.x, e.y);
        }
      }
    });
  }
}

