import { GAME, POWERUPS, SCORING } from '../config/constants.js';

const POWERUP_SCALE = 0.4;
const POWERUP_SPEED = 120;
const TYPES = ['rapid_fire', 'spread_shot', 'shield', 'missile', 'score_multi'];
const SPRITES = {
    rapid_fire: 'damage_bonus',
    spread_shot: 'rockets_bonus',
    shield: 'armor_bonus',
    missile: 'enemy_destroy_bonus',
    score_multi: 'magnet_bonus',
};
const COLORS = {
    rapid_fire: 0x3399ff,
    spread_shot: 0xff8800,
    shield: 0x44ffff,
    missile: 0xff4444,
    score_multi: 0xffcc00,
};
const DURATIONS = {
    rapid_fire: POWERUPS.RAPID_FIRE_DURATION,
    spread_shot: POWERUPS.SPREAD_SHOT_DURATION,
    shield: 0,
    missile: POWERUPS.MISSILE_DURATION,
    score_multi: POWERUPS.SCORE_MULTI_DURATION,
};

export class PowerUpManager {
    constructor(scene, random) {
        this.scene = scene;
        this.random = random;
        this.active = new Map();
        this.group = scene.physics.add.group();
        this.glowGraphics = null;
    }

    tryDrop(x, y) {
        if (this.random() > POWERUPS.DROP_CHANCE) return;
        const type = TYPES[Math.floor(this.random() * TYPES.length)];
        const spriteKey = SPRITES[type];
        const pu = this.group.create(x, y, spriteKey);
        pu.setScale(POWERUP_SCALE);
        pu.setVelocityY(POWERUP_SPEED);
        pu.setDepth(15);
        pu.setData('type', type);
        pu.body.setSize(pu.width * 0.8, pu.height * 0.8);

        this.scene.tweens.add({
            targets: pu,
            scaleX: POWERUP_SCALE * 1.2,
            scaleY: POWERUP_SCALE * 1.2,
            duration: 400,
            yoyo: true,
            repeat: -1,
        });
    }

    collect(powerup) {
        const type = powerup.getData('type');
        powerup.destroy();

        this.scene.score += SCORING.POWERUP_COLLECT;
        this.scene.audio.playPowerUp();
        this.scene.showFloatingText(
            this.scene.player.x, this.scene.player.y - 60,
            type.replace('_', ' ').toUpperCase(), '#ffcc00'
        );

        if (type === 'shield') {
            this.active.set('shield', { until: Infinity });
            this.scene.shieldActive = true;
            return;
        }

        const duration = DURATIONS[type];
        const until = this.scene.time.now + duration;

        if (this.active.has(type) && this.active.get(type).timer) {
            this.active.get(type).timer.destroy();
        }

        const timer = this.scene.time.delayedCall(duration, () => {
            this.active.delete(type);
        });

        this.active.set(type, { until, timer });
    }

    has(type) {
        return this.active.has(type);
    }

    useShield() {
        if (!this.active.has('shield')) return false;
        this.active.delete('shield');
        this.scene.shieldActive = false;
        this.scene.showFloatingText(
            this.scene.player.x, this.scene.player.y - 60,
            'SHIELD BROKEN', '#44ffff'
        );
        return true;
    }

    getFireRate() {
        return this.has('rapid_fire') ? 0.5 : 1.0;
    }

    getScoreMultiplier() {
        return this.has('score_multi') ? 2 : 1;
    }

    update() {
        this.group.getChildren().forEach(pu => {
            if (pu.active && pu.y > GAME.HEIGHT + 50) {
                pu.destroy();
            }
        });
    }

    drawGlow() {
        if (this.glowGraphics) this.glowGraphics.clear();
        if (this.active.size === 0) return;

        if (!this.glowGraphics) {
            this.glowGraphics = this.scene.add.graphics().setDepth(8);
        }

        const px = this.scene.player.x;
        const py = this.scene.player.y;

        if (this.has('shield')) {
            this.glowGraphics.lineStyle(3, 0x44ffff, 0.6);
            this.glowGraphics.strokeCircle(px, py, 55);
        }

        let i = 0;
        for (const [type] of this.active) {
            if (type === 'shield') continue;
            const color = COLORS[type] || 0xffffff;
            this.glowGraphics.lineStyle(2, color, 0.4);
            this.glowGraphics.strokeCircle(px, py, 60 + i * 8);
            i++;
        }
    }
}
