import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1080,
    height: 1920,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    backgroundColor: '#000000',
    scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultsScene],
};

const game = new Phaser.Game(config);
window.__GAME__ = game;

// Size the fixed HUD bars to exactly match the canvas edges (fills letterbox precisely)
function fitHudBars() {
    const canvas = document.querySelector('canvas');
    if (!canvas || canvas.offsetHeight === 0) {
        requestAnimationFrame(fitHudBars);
        return;
    }
    const rect = canvas.getBoundingClientRect();
    document.getElementById('hud-top').style.height    = Math.max(0, Math.round(rect.top)) + 'px';
    document.getElementById('hud-bottom').style.height = Math.max(0, Math.round(window.innerHeight - rect.bottom)) + 'px';
}

game.events.on('ready', () => requestAnimationFrame(fitHudBars));
window.addEventListener('resize', fitHudBars);
