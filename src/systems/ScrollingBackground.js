import { GAME } from '../config/constants.js';

const CENTER_Y = GAME.HEIGHT / 2;

const ZONES = [
    { name: 'Deep Space', baseTint: 0x223355, layerTint: 0x8899CC, speed: 1.0 },
    { name: 'Nebula Zone', baseTint: 0x662244, layerTint: 0xFF6699, speed: 1.2 },
    { name: 'Asteroid Belt', baseTint: 0x224466, layerTint: 0x66CCFF, speed: 1.5 },
    { name: 'Blood Sector', baseTint: 0x660000, layerTint: 0xFF3333, speed: 0.8 },
    { name: 'Meteor Storm', baseTint: 0x113322, layerTint: 0x33FF88, speed: 2.0 },
    { name: 'Void Rift', baseTint: 0x440055, layerTint: 0xDD44FF, speed: 0.6 },
];

function getZoneForWave(wave) {
    if (wave <= 3) return ZONES[0];
    if (wave <= 5) return ZONES[1];
    if (wave <= 7) return ZONES[2];
    if (wave <= 9) return ZONES[3];
    if (wave <= 11) return ZONES[4];
    if (wave <= 13) return ZONES[5];
    // 14+: cycle through all zones
    return ZONES[(wave - 14) % ZONES.length];
}

export class ScrollingBackground {
    constructor(scene) {
        this.scene = scene;

        this.base1 = scene.add.image(GAME.WIDTH / 2, CENTER_Y, 'bg_base').setDisplaySize(GAME.WIDTH, GAME.HEIGHT);
        this.base2 = scene.add.image(GAME.WIDTH / 2, CENTER_Y - GAME.HEIGHT, 'bg_base').setDisplaySize(GAME.WIDTH, GAME.HEIGHT);
        this.stars1 = scene.add.image(GAME.WIDTH / 2, CENTER_Y, 'bg_stars').setDisplaySize(GAME.WIDTH, GAME.HEIGHT);
        this.stars2 = scene.add.image(GAME.WIDTH / 2, CENTER_Y - GAME.HEIGHT, 'bg_stars').setDisplaySize(GAME.WIDTH, GAME.HEIGHT);

        this.currentZone = null;
        this.speedMultiplier = 1.0;
    }

    setTheme(waveNum) {
        const zone = getZoneForWave(waveNum);
        if (zone === this.currentZone) return;

        this.currentZone = zone;
        this.speedMultiplier = zone.speed;

        const layers = [this.base1, this.base2, this.stars1, this.stars2];

        // Flash + crossfade for dramatic zone transition
        const flash = this.scene.add.graphics().setDepth(50).setScrollFactor(0);
        flash.fillStyle(zone.layerTint, 0.15);
        flash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

        this.scene.tweens.add({
            targets: layers,
            alpha: 0.15,
            duration: 400,
            onComplete: () => {
                this.base1.setTint(zone.baseTint);
                this.base2.setTint(zone.baseTint);
                this.stars1.setTint(zone.layerTint);
                this.stars2.setTint(zone.layerTint);

                this.scene.tweens.add({
                    targets: layers,
                    alpha: 1.0,
                    duration: 400,
                });
            },
        });

        // Fade out the color flash
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 800,
            onComplete: () => flash.destroy(),
        });

        // Zone name announcement
        if (waveNum > 1) {
            const zoneText = this.scene.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 + 80, zone.name.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: '36px',
                color: '#' + zone.layerTint.toString(16).padStart(6, '0'),
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
            }).setOrigin(0.5).setDepth(200).setAlpha(0);

            this.scene.tweens.add({
                targets: zoneText,
                alpha: 1,
                duration: 300,
                hold: 1500,
                yoyo: true,
                onComplete: () => zoneText.destroy(),
            });
        }
    }

    update(delta) {
        const baseSpeed = 0.5 * this.speedMultiplier * (delta / 16);
        const starsSpeed = 1.0 * this.speedMultiplier * (delta / 16);
        const resetY = CENTER_Y + GAME.HEIGHT;

        this.base1.y += baseSpeed;
        this.base2.y += baseSpeed;
        if (this.base1.y >= resetY) this.base1.y = this.base2.y - GAME.HEIGHT;
        if (this.base2.y >= resetY) this.base2.y = this.base1.y - GAME.HEIGHT;

        this.stars1.y += starsSpeed;
        this.stars2.y += starsSpeed;
        if (this.stars1.y >= resetY) this.stars1.y = this.stars2.y - GAME.HEIGHT;
        if (this.stars2.y >= resetY) this.stars2.y = this.stars1.y - GAME.HEIGHT;
    }
}
