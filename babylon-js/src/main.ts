import './style.css';
import { GameEngine } from './core/Engine';
import { MainScene } from './scenes/MainScene';

class App {
    constructor() {
        // Inițializează motorul grafic și scene-ul de bază
        const game = new GameEngine("renderCanvas");

        // Injectează scene-ul și canvas-ul în controller-ul de scenă specific
        new MainScene(game.scene, game.canvas);

        console.log("TranceVR: Sistem modular inițializat.");
    }
}

// Start app
new App();
