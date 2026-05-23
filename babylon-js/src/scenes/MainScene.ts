import {
  Scene,
  Vector3,
  HemisphericLight,
  Color3,
  Color4,
  WebXRDefaultExperience,
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
  private _xr!: WebXRDefaultExperience;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;
    this._environment = new Environment(this._scene);
    this._levelManager = new LevelManager(this._environment);
    this._audioService = new AudioService();

    this._initScene();
    this._initAudioControls();
    this._initXR();
  }

  private async _initXR(): Promise<void> {
    try {
      this._xr = await this._scene.createDefaultXRExperienceAsync({
        floorMeshes: [], // Inițial gol
      });

      // Configurăm Mișcarea Smooth (Joystick)
      try {
        this._xr.baseExperience.featuresManager.enableFeature(
          "xr-controller-movement",
          "latest",
          {
            xrInput: this._xr.input,
            movementOrientationFollowsViewerPose: true,
            movementOrientationFollowsController: true,
          },
        );
      } catch (e) {
        console.warn("[XR] Mișcarea prin controller nu a putut fi activată:", e);
      }

      // Sincronizare poziție XR cu Player Capsule
      this._xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 2) { // Entering VR
          console.log("[XR] Intrat în modul VR");
          
          // Calculăm poziția "picioarelor" player-ului (capsula are înălțime 1.8, deci centrul e la +0.9 față de bază)
          const footPosition = this._player.position.clone();
          footPosition.y -= 0.9; 

          // În WebXR cu local-floor, camera.position reprezintă capul.
          // Pentru a pune jucătorul unde este capsula, trebuie să mutăm rig-ul (sau să folosim setTransformationFromCamera)
          // O variantă simplă este să setăm poziția camerei pe XZ, dar să lăsăm Y-ul să fie gestionat de înălțimea reală + offset-ul podelei.
          // Babylon XR gestionează Y-ul automat dacă nu îl forțăm.
          
          this._xr.baseExperience.camera.position.set(footPosition.x, this._xr.baseExperience.camera.position.y, footPosition.z);
        } else if (state === 0) { // Exiting VR
          console.log("[XR] Ieșit din modul VR");
          this._player.attachFlashlightTo(null);
        }
      });

      // Atașare lanternă de controllerul din mâna dreaptă
      this._xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
          if (motionController.handness === "right") {
            console.log("[XR] Atașez lanterna de controllerul drept");
            this._player.attachFlashlightTo(controller.grip || controller.pointer);
          }
        });
      });

      // Loop de actualizare pentru podele și sincronizare fizică
      this._scene.onBeforeRenderObservable.add(() => {
        if (this._xr && this._xr.baseExperience.state === 2) {
          // 1. Actualizăm floorMeshes pentru teleportare
          const floors = this._levelManager.getFloorMeshes();
          if (this._xr.teleportation) {
            floors.forEach(f => {
              this._xr.teleportation.addFloorMesh(f);
            });
          }

          // 2. Sincronizăm Capsula de Fizică cu Camera VR (pentru coliziuni)
          const cameraPos = this._xr.baseExperience.camera.position;
          this._player.setPosition(new Vector3(cameraPos.x, this._player.position.y, cameraPos.z));
        }
      });

      console.log("[XR] Sistem WebXR inițializat.");
    } catch (e) {
      console.warn("[XR] WebXR nu este suportat sau a apărut o eroare:", e);
    }
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
          this._audioService.loadTrack("assets/track2.wav");
          break;
        case "3":
          console.log("Track 3 requested (placeholder)");
          // this._audioService.loadTrack("assets/track3.wav");
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
