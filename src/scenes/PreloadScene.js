import { Scene } from "phaser";

export class PreloadScene extends Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    const barW = 600;
    const barH = 40;
    const barX = 540 - barW / 2;
    const barY = 960;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barW, barH);

    const progressBar = this.add.graphics();

    const loadingText = this.add
      .text(540, barY - 60, "LOADING...", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x3399ff, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    this.load.image("player", "assets/ships/player.png");
    for (let i = 0; i <= 9; i++) {
      this.load.image(`exhaust_${i}`, `assets/ships/exhaust_${i}.png`);
    }
    for (let i = 1; i <= 7; i++) {
      this.load.image(
        `player_explosion_${i}`,
        `assets/ships/explosion_${i}.png`,
      );
    }
    for (let i = 1; i <= 6; i++) {
      this.load.image(`player_bullet_${i}`, `assets/ships/bullet_${i}.png`);
    }

    for (let i = 1; i <= 6; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`enemy_${id}`, `assets/enemies/enemy_${id}.png`);
      this.load.image(
        `enemy_${id}_damaged`,
        `assets/enemies/enemy_${id}_damaged.png`,
      );
    }
    for (let i = 1; i <= 4; i++) {
      this.load.image(`enemy_bullet_${i}`, `assets/enemies/bullet_${i}.png`);
    }
    for (let i = 0; i <= 8; i++) {
      this.load.image(
        `enemy_explosion_${i}`,
        `assets/enemies/explosion_${i}.png`,
      );
    }

    for (let i = 1; i <= 3; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`boss_${id}`, `assets/bosses/boss_${id}.png`);
    }
    this.load.image("boss-aax-img", "assets/boss-aax.png");

    this.load.image("bg_base", "assets/backgrounds/bg_base.png");
    this.load.image("bg_stars", "assets/backgrounds/bg_stars.png");
    this.load.image("bg_planets", "assets/backgrounds/bg_planets.png");

    for (let i = 1; i <= 6; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`meteor_${id}`, `assets/objects/meteor_${id}.png`);
    }

    this.load.image("health_dot", "assets/ui/health_dot.png");
    this.load.image("pause_btn", "assets/ui/pause_btn.png");

    this.load.image("damage_bonus", "assets/powerups/damage_bonus.png");
    this.load.image("rockets_bonus", "assets/powerups/rockets_bonus.png");
    this.load.image("armor_bonus", "assets/powerups/armor_bonus.png");
    this.load.image(
      "enemy_destroy_bonus",
      "assets/powerups/enemy_destroy_bonus.png",
    );
    this.load.image("magnet_bonus", "assets/powerups/magnet_bonus.png");
  }

  create() {
    if (this.textures.exists("boss-aax-img")) {
      const src = this.textures.get("boss-aax-img").source[0];
      if (src.width > 32) {
        this.textures.addSpriteSheet("boss-aax", src.image, {
          frameWidth: Math.floor(src.width / 3),
          frameHeight: Math.floor(src.height / 4),
        });
      }
      this.textures.remove("boss-aax-img");
    }
    this.scene.start("Menu");
  }
}
