import { Scene } from 'phaser';

export class BootScene extends Scene {
    constructor() {
        super('Boot');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.scene.start('Preload');
    }
}
