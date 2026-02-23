import { GAME } from '../config/constants.js';

const CENTER_Y = GAME.HEIGHT / 2;

export class ScrollingBackground {
    constructor(scene) {
        this.base1 = scene.add.image(GAME.WIDTH / 2, CENTER_Y, 'bg_base');
        this.base2 = scene.add.image(GAME.WIDTH / 2, CENTER_Y - GAME.HEIGHT, 'bg_base');
        this.stars1 = scene.add.image(GAME.WIDTH / 2, CENTER_Y, 'bg_stars');
        this.stars2 = scene.add.image(GAME.WIDTH / 2, CENTER_Y - GAME.HEIGHT, 'bg_stars');
    }

    update(delta) {
        const baseSpeed = 0.5 * (delta / 16);
        const starsSpeed = 1.0 * (delta / 16);
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
