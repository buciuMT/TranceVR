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

    this._hideLoadingScreen();

    console.log("TranceVR: Sistem modular inițializat cu Havok Physics.");
  }

  private _hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add("fade-out");
        // Opțional: Elimină complet din DOM după ce tranziția de fade-out s-a terminat
        setTimeout(() => {
          loadingScreen.remove();
        }, 800); // corelat cu transition: opacity 0.8s în CSS
      }, 2500); // Așteaptă 2.5 secunde "la mișto"
    }
  }
}

// Start app
new App();
