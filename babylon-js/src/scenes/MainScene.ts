import {
  Scene,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Environment } from "../entities/Environment";
import { Player } from "../entities/Player";
import { LevelManager } from "../entities/LevelManager";
import { AudioService } from "../services/AudioService";

export class MainScene {
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _environment: Environment;
  private _levelManager: LevelManager;
  private _player!: Player;
  private _audioService: AudioService;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;
    this._environment = new Environment(this._scene);
    this._levelManager = new LevelManager(this._environment);
    this._audioService = new AudioService();

    this._initScene();
    this._initAudioControls();
  }

  private _initAudioControls(): void {
    // Hidden file input for loading local tracks
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this._audioService.loadTrack(file);
      }
    };

    window.addEventListener("keydown", (ev) => {
      switch (ev.key) {
        case "1":
          this._audioService.loadTrack("assets/track1.wav");
          break;
        case "2":
          // Placeholder URLs for other tracks
          console.log("Track 2 requested (placeholder)");
          this._audioService.loadTrack("assets/track2.mp3");
          break;
        case "3":
          console.log("Track 3 requested (placeholder)");
          // this._audioService.loadTrack("assets/track3.mp3");
          break;
        case "o":
        case "O":
          fileInput.click();
          break;
      }
    });

    // Auto-play default track (might require user interaction first in some browsers)
    // We'll try to load it, but browsers usually block autoplay without interaction.
    // The loading screen interaction or a key press will likely trigger it.
    this._audioService.loadTrack("assets/track1.wav");
  }

  private _initScene(): void {
    // Fog Configuration
    this._scene.fogMode = Scene.FOGMODE_LINEAR;
    this._scene.fogColor = new Color3(0.06, 0.06, 0.06);
    this._scene.clearColor = new Color4(0.06, 0.06, 0.06, 1.0);
    this._scene.fogStart = 20.0;
    this._scene.fogEnd = 60.0;

    // 1. Player & Cameră (First Person cu Fizică)
    this._player = new Player(this._scene, this._canvas);

    // 2. Lumină Ambientală (foarte slabă pentru a permite lanternei să domine)
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this._scene,
    );
    light.intensity = 0.15;

    // 3. Procedural Update Loop
    this._scene.onBeforeRenderObservable.add(() => {
      this._levelManager.update(this._player.position);
    });

    // 4. Start Position
    setTimeout(() => {
      this._player.setPosition(new Vector3(0, 3, 0));
    }, 2000); // Delay mic pentru a asigura că totul este inițializat

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
