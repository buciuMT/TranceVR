import {
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Vector3,
} from "@babylonjs/core";
import type { Observer } from "@babylonjs/core";
import type { Scene as BabylonScene } from "@babylonjs/core";
import { Scene } from "./Scene";
import { GameEngine } from "../core/Engine";
import { Tags } from "../ecs/components";
import { LevelStreamingSystem } from "../ecs/systems/LevelStreamingSystem";
import { PostProcessSystem } from "../ecs/systems/PostProcessSystem";
import { VertexGlitchSystem } from "../ecs/systems/VertexGlitchSystem";
import { FractalPostProcessService } from "../services/FractalPostProcessService";

export class FractalScene extends Scene {
  private _ground: Mesh | null = null;
  private _fractalPost: FractalPostProcessService | null = null;
  private _frameObserver: Observer<BabylonScene> | null = null;

  private _spikiness = 0.5;
  private _thickness = 0.5;

  private _keydownHandler: ((ev: KeyboardEvent) => void) | null = null;
  private _sceneTag = "fractal_scene";

  async init(engine: GameEngine): Promise<void> {
    this._disableSystems(engine);
    this._createGround(engine);
    engine.createPlayer({ pos: new Vector3(0, 3, 0) });

    this._fractalPost = new FractalPostProcessService(engine.scene);
    this._fractalPost.loadEnvMap("assets/hall.hdr");
    this._fractalPost.attachToCamera(engine.scene.activeCamera!);
    this._initXRCallbacks(engine);
    this._fractalPost.setThickness(0.1);
    this._fractalPost.setScale(0.2);

    this._frameObserver = engine.scene.onBeforeRenderObservable.add(() => {
      const analysis = engine.audio.getAnalysis();
      this._fractalPost?.setAudio(analysis);
    });

    this._initKeyboardCallbacks(engine);
    console.log("[FractalScene] Initialised.");
  }

  unload(engine: GameEngine): void {
    this._enableSystems(engine);

    if (this._frameObserver) {
      engine.scene.onBeforeRenderObservable.remove(this._frameObserver);
      this._frameObserver = null;
    }
    this._fractalPost?.detach();
    this._fractalPost = null;

    if (this._ground) {
      engine.xr.unregisterFloorMesh(this._ground);
      this._ground.dispose();
      this._ground = null;
    }

    if (this._keydownHandler) {
      window.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }

    const allTagged = engine.world.queryComponents(Tags);
    for (const { entity, components } of allTagged) {
      const [tags] = components;
      if (tags.has(this._sceneTag)) engine.world.destroyEntity(entity);
    }
    console.log("[FractalScene] Unloaded.");
  }

  // =========================================================================
  // Systems
  // =========================================================================

  private _disableSystems(engine: GameEngine): void {
    const levelSystem = engine.getSystem(LevelStreamingSystem);
    if (levelSystem) { levelSystem.enabled = false; console.log("[FractalScene] LevelStreamingSystem disabled."); }
    const ppSystem = engine.getSystem(PostProcessSystem);
    if (ppSystem) { ppSystem.enabled = false; console.log("[FractalScene] PostProcessSystem disabled."); }
    const vgSystem = engine.getSystem(VertexGlitchSystem);
    if (vgSystem) { vgSystem.enabled = false; console.log("[FractalScene] VertexGlitchSystem disabled."); }
  }

  private _enableSystems(engine: GameEngine): void {
    const levelSystem = engine.getSystem(LevelStreamingSystem);
    if (levelSystem) levelSystem.enabled = true;
    const ppSystem = engine.getSystem(PostProcessSystem);
    if (ppSystem) ppSystem.enabled = true;
    const vgSystem = engine.getSystem(VertexGlitchSystem);
    if (vgSystem) vgSystem.enabled = true;
  }

  // =========================================================================
  // Ground
  // =========================================================================

  private _createGround(engine: GameEngine): void {
    this._ground = MeshBuilder.CreateGround(
      "fractalGround",
      { width: 200, height: 200 },
      engine.scene,
    );
    this._ground.isVisible = false;

    new PhysicsAggregate(
      this._ground,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.5, restitution: 0 },
      engine.scene,
    );

    engine.xr.registerFloorMesh(this._ground);
  }

  // =========================================================================
  // XR camera switching
  // =========================================================================

  private _initXRCallbacks(engine: GameEngine): void {
    engine.xr.onEnter((xrCamera) => {
      this._fractalPost?.attachToCamera(xrCamera);
      console.log("[FractalScene] VR entered — PostProcess reattached to XR camera.");
    });
    engine.xr.onExit(() => {
      const flat = engine.scene.activeCamera;
      if (flat) this._fractalPost?.attachToCamera(flat);
      console.log("[FractalScene] VR exited — PostProcess reattached to flat camera.");
    });

    engine.xr.onControllerAdded((inputSource, motionController, handedness) => {
      // Track cycle on 'select' (trigger)
      inputSource.onSelectObservable.add(() => {
        console.log(`[FractalScene] VR ${handedness} controller 'select' — cycling track`);
        engine.audio.nextTrack();
      });

      if (handedness === "right") {
        const aButton = motionController.getComponent("a-button");
        if (aButton) {
          aButton.onButtonStateChangedObservable.add((component: any) => {
            if (component.pressed) {
              console.log("[FractalScene] VR 'A' button pressed — cycling track");
              engine.audio.nextTrack();
            }
          });
        }
      }
    });
  }

  // =========================================================================
  // Keyboard
  // =========================================================================

  private _initKeyboardCallbacks(engine: GameEngine): void {
    this._keydownHandler = (ev: KeyboardEvent) => {
      if (ev.key === "k" || ev.key === "K") {
        console.log("[FractalScene] Keyboard 'K' pressed — cycling track");
        engine.audio.nextTrack();
      }
    };
    window.addEventListener("keydown", this._keydownHandler);
  }
}
