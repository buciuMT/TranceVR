import "./style.css";
import { GameEngine } from "./core/Engine";
import { MainScene } from "./scenes/MainScene";

import "@babylonjs/inspector";

class App {
  constructor() {
    this._init();
  }

  private async _init() {
    // Inițializează motorul grafic și scene-ul de bază (cu Havok inclus)
    const game = await GameEngine.Create("renderCanvas");

    // Injectează scene-ul și canvas-ul în controller-ul de scenă specific
    new MainScene(game.scene, game.canvas);

    console.log("TranceVR: Sistem modular inițializat cu Havok Physics.");
  }
}

// Start app
new App();
