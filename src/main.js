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

// Position HUD bars to overlay the canvas edges — always visible regardless of letterbox
const HUD_TOP_H = 64;   // px — matches safe zone at top of game
const HUD_BOT_H = 42;   // px — matches XP bar height

function fitHudBars() {
    const canvas = document.querySelector('canvas');
    if (!canvas || canvas.offsetHeight === 0) {
        requestAnimationFrame(fitHudBars);
        return;
    }
    const rect   = canvas.getBoundingClientRect();
    const top    = document.getElementById('hud-top');
    const bottom = document.getElementById('hud-bottom');

    // Overlay top edge of canvas
    top.style.top    = Math.round(rect.top)  + 'px';
    top.style.left   = Math.round(rect.left) + 'px';
    top.style.width  = Math.round(rect.width) + 'px';
    top.style.height = HUD_TOP_H + 'px';

    // Overlay bottom edge of canvas
    bottom.style.top    = Math.round(rect.bottom - HUD_BOT_H) + 'px';
    bottom.style.left   = Math.round(rect.left) + 'px';
    bottom.style.width  = Math.round(rect.width) + 'px';
    bottom.style.height = HUD_BOT_H + 'px';
}

game.events.on('ready', () => requestAnimationFrame(fitHudBars));
window.addEventListener('resize', fitHudBars);
