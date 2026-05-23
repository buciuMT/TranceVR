import "./style.css";
import { GameEngine } from "./core/Engine";
import "@babylonjs/inspector";

class App {
  constructor() {
    this._init();
  }

  private async _init() {
    await GameEngine.Create("renderCanvas");
    this._hideLoadingScreen();
    console.log("TranceVR: Engine-driven ECS initialised.");
  }

  private _hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add("fade-out");
        setTimeout(() => {
          loadingScreen.remove();
        }, 800);
      }, 2500);
    }
  }
}

// Start app
new App();
