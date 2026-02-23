import { Scene } from "phaser";
import { GAME } from "../config/constants.js";
import { ArenaManager } from "../systems/ArenaManager.js";

export class MenuScene extends Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.arena = new ArenaManager();
    const devMode =
      new URLSearchParams(window.location.search).get("dev") === "1";
    const canPlay = this.arena.canPlay() || devMode;
    const weekDisplay = this.arena.getWeekDisplay();
    const attemptNum = this.arena.getAttemptNumber();
    const highScore = this.arena.getHighScore();
    const seed = this.arena.getSeed();

    this.bg = this.add.image(540, 960, "bg_base");

    this.add
      .text(GAME.WIDTH / 2, 500, "STAR ASSAULT", {
        fontFamily: "Arial",
        fontSize: "90px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME.WIDTH / 2, 650, "Daily Arena Challenge", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME.WIDTH / 2, 740, `Week: ${weekDisplay}`, {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#666666",
      })
      .setOrigin(0.5);

    if (highScore > 0) {
      this.add
        .text(
          GAME.WIDTH / 2,
          850,
          `Best This Week: ${highScore.toLocaleString()}`,
          {
            fontFamily: "Arial",
            fontSize: "40px",
            color: "#ffcc00",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5);
    }

    const attempts = this.arena.getAttemptsThisWeek();
    if (attempts.length > 0) {
      this.add
        .text(GAME.WIDTH / 2, 930, `Attempts: ${attempts.length}`, {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#888888",
        })
        .setOrigin(0.5);
    }

    if (canPlay) {
      this.add
        .text(GAME.WIDTH / 2, 1050, `Attempt #${attemptNum}`, {
          fontFamily: "Arial",
          fontSize: "32px",
          color: "#88ff88",
        })
        .setOrigin(0.5);

      const playBtn = this.add
        .text(GAME.WIDTH / 2, 1180, "[ TAP TO PLAY ]", {
          fontFamily: "Arial",
          fontSize: "48px",
          color: "#ffcc00",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: playBtn,
        alpha: { from: 1, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });

      this.input.once("pointerdown", () => {
        this.scene.start("Game", { seed, dev: devMode });
      });
    } else {
      this.add
        .text(GAME.WIDTH / 2, 1050, "Today's attempt complete!", {
          fontFamily: "Arial",
          fontSize: "36px",
          color: "#ff8844",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.add
        .text(GAME.WIDTH / 2, 1130, "Press D to play again (dev)", {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#888888",
        })
        .setOrigin(0.5);

      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt) {
        this.add
          .text(
            GAME.WIDTH / 2,
            1220,
            `Today's Score: ${lastAttempt.score.toLocaleString()}`,
            {
              fontFamily: "Arial",
              fontSize: "36px",
              color: "#ffffff",
              stroke: "#000000",
              strokeThickness: 3,
            },
          )
          .setOrigin(0.5);
      }

      this.input.keyboard.once("keydown-D", () => {
        this.scene.start("Game", { seed });
      });
      this.showLeaderboard(1350);
    }

    if (canPlay && attempts.length > 0) {
      this.showLeaderboard(1300);
    }
  }

  showLeaderboard(startY) {
    const history = this.arena.getLeaderboardHistory();
    if (history.length === 0) return;

    this.add
      .text(GAME.WIDTH / 2, startY, "Past Weeks", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#666666",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const recent = history.slice(-5).reverse();
    for (let i = 0; i < recent.length; i++) {
      const entry = recent[i];
      this.add
        .text(
          GAME.WIDTH / 2,
          startY + 50 + i * 40,
          `${entry.week}  Score: ${entry.score.toLocaleString()}  (${entry.attempts} plays)`,
          {
            fontFamily: "Arial",
            fontSize: "24px",
            color: "#555555",
          },
        )
        .setOrigin(0.5);
    }
  }
}
