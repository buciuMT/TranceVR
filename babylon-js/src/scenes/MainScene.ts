import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Environment } from "../entities/Environment";

export class MainScene {
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _environment: Environment;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;
    this._environment = new Environment(this._scene);

    this._initScene();
  }

  private _initScene(): void {
    // 1. Cameră
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 2.5,
      15,
      Vector3.Zero(),
      this._scene,
    );
    camera.attachControl(this._canvas, true);

    // 2. Lumină
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this._scene,
    );
    light.intensity = 0.7;

    // 3. Environment
    this._loadAssets();

    // 4. Debug Inspector
    this._initInspector();
  }

  private _initInspector(): void {
    window.addEventListener("keydown", (ev) => {
      // Shift + I pentru a deschide Inspectorul
      if (ev.shiftKey && ev.keyCode === 73) {
        if (this._scene.debugLayer.isVisible()) {
          this._scene.debugLayer.hide();
        } else {
          this._scene.debugLayer.show();
        }
      }
    });
  }

  private _loadAssets(): void {
    console.log("Încărcare asset-uri în MainScene...", this._environment);
    // Exemplu de utilizare a entității Environment:
    this._environment.loadLevel("coridor2").then(() => {
      console.log("Level loaded!");
    });
  }
}
