import {
  Scene,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Environment } from "../entities/Environment";
import { Player } from "../entities/Player";

export class MainScene {
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _environment: Environment;
  private _player!: Player;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;
    this._environment = new Environment(this._scene);

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

    // 3. DEBUG GROUND (Să vedem dacă fizica funcționează deloc)
    const debugGround = MeshBuilder.CreateGround(
      "debugGround",
      { width: 10, height: 10 },
      this._scene,
    );
    debugGround.position.y = -0.5; // Sub nivelul coridorului
    new PhysicsAggregate(
      debugGround,
      PhysicsShapeType.BOX,
      { mass: 0 },
      this._scene,
    );

    // 4. Environment
    this._loadAssets();

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

  private _loadAssets(): void {
    console.log("Încărcare asset-uri în MainScene...", this._environment);

    this._environment.loadLevel("coridor2").then(() => {
      console.log("Level loaded! Teleporting in 1s...");
    });
  }
}
