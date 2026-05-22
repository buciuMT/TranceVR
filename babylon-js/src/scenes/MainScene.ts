import {
  Scene,
  Vector3,
  HemisphericLight,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Environment } from "../entities/Environment";
import { Player } from "../entities/Player";
import { LevelManager } from "../entities/LevelManager";

export class MainScene {
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _environment: Environment;
  private _levelManager: LevelManager;
  private _player!: Player;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;
    this._environment = new Environment(this._scene);
    this._levelManager = new LevelManager(this._environment);

    this._initScene();
  }

  private _initScene(): void {
    // 1. Player & Cameră (First Person cu Fizică)
    this._player = new Player(this._scene, this._canvas);

    // 2. Lumină
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this._scene,
    );
    light.intensity = 0.7;

    // 3. Procedural Update Loop
    this._scene.onBeforeRenderObservable.add(() => {
        this._levelManager.update(this._player.position);
    });

    // 4. Start Position
    this._player.setPosition(new Vector3(0, 2, 0));

    // 5. Debug Inspector
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
}
