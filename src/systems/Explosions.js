export class Explosions {
    constructor(scene) {
        this.scene = scene;
        this.group = scene.add.group();
    }

    play(x, y, prefix, frameCount, scale) {
        let frame = 0;
        const sprite = this.scene.add.image(x, y, `${prefix}_0`).setScale(scale).setDepth(20);
        this.group.add(sprite);

        const timer = this.scene.time.addEvent({
            delay: 60,
            repeat: frameCount - 1,
            callback: () => {
                frame++;
                if (frame >= frameCount) {
                    sprite.destroy();
                    timer.destroy();
                    return;
                }
                sprite.setTexture(`${prefix}_${frame}`);
            },
        });
    }
}
