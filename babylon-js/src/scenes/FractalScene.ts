import {
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Vector3,
  ShaderMaterial,
  Texture,
} from "@babylonjs/core";
import type { Observer } from "@babylonjs/core";
import type { Scene as BabylonScene } from "@babylonjs/core";
import { Scene } from "./Scene";
import { GameEngine } from "../core/Engine";
import { Tags } from "../ecs/components";
import { LevelStreamingSystem } from "../ecs/systems/LevelStreamingSystem";
import { PostProcessSystem } from "../ecs/systems/PostProcessSystem";
import { VertexGlitchSystem } from "../ecs/systems/VertexGlitchSystem";

// Vite ?raw imports — inject GLSL source as strings
import domeVertex from "../shaders/fractalDome.vert.glsl?raw";
import domeFragment from "../shaders/fractalDome.frag.glsl?raw";

export class FractalScene extends Scene {
  private _ground: Mesh | null = null;
  private _dome: Mesh | null = null;
  private _material: ShaderMaterial | null = null;
  private _envTexture: Texture | null = null;
  private _frameObserver: Observer<BabylonScene> | null = null;

  private _spikiness = 0.5;
  private _thickness = 0.5;

  private _time = 0;

  private _keydownHandler: ((ev: KeyboardEvent) => void) | null = null;
  private _sceneTag = "fractal_scene";

  async init(engine: GameEngine): Promise<void> {
    this._disableSystems(engine);
    this._createGround(engine);
    engine.createPlayer({ pos: new Vector3(0, 3, 0) });
    this._loadEnvTexture(engine);
    this._createDome(engine);

    this._frameObserver = engine.scene.onBeforeRenderObservable.add(() => {
      this._time += engine.babylonEngine.getDeltaTime() / 1000;
      this._pushUniforms();
    });

    this._initKeyboardCallbacks();
    console.log("[FractalScene] Initialised. Ground:", !!this._ground, "Dome:", !!this._dome, "Mat:", !!this._material);
  }

  unload(engine: GameEngine): void {
    this._enableSystems(engine);

    if (this._frameObserver) {
      engine.scene.onBeforeRenderObservable.remove(this._frameObserver);
      this._frameObserver = null;
    }
    if (this._material) { this._material.dispose(); this._material = null; }
    if (this._dome) { this._dome.dispose(); this._dome = null; }
    if (this._envTexture) { this._envTexture.dispose(); this._envTexture = null; }
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
  // Dome + ShaderMaterial
  // =========================================================================

  private _createDome(engine: GameEngine): void {
    this._dome = MeshBuilder.CreateSphere(
      "fractalDome",
      { diameter: 4, segments: 32 },
      engine.scene,
    );
    this._dome.isPickable = false;

    // Parent dome to the capsule at the same local offset as the camera (0, 0.6, 0).
    // Babylon then owns the world matrix — no manual position sync needed, and
    // world[3].xyz in the vertex shader always equals the camera's world position.
    const capsule = engine.scene.activeCamera!.parent;
    if (capsule) {
      this._dome.parent = capsule;
      this._dome.position = new Vector3(0, 0.6, 0);
    }

    this._material = new ShaderMaterial(
      "fractalDomeMat",
      engine.scene,
      { vertexSource: domeVertex, fragmentSource: domeFragment },
      {
        attributes: ["position"],
        uniforms: ["world", "worldViewProjection", "uTime", "uSpikiness", "uThickness"],
      },
    );
    this._material.backFaceCulling = false;
    this._dome.material = this._material;
  }

  private _pushUniforms(): void {
    if (!this._material) return;
    this._material.setFloat("uTime", this._time);
    this._material.setFloat("uSpikiness", this._spikiness);
    this._material.setFloat("uThickness", this._thickness);
  }

  // =========================================================================
  // Environment texture
  // =========================================================================

  private _loadEnvTexture(engine: GameEngine): void {
    this._envTexture = new Texture("assets/hall.hdr", engine.scene);
    this._envTexture.onLoadObservable.addOnce(() => {
      console.log("[FractalScene] Environment map loaded.");
      this._envAvailable = true;
    });
    setTimeout(() => {
      if (!this._envAvailable) console.warn("[FractalScene] Environment map did not load.");
    }, 5000);
  }

  private _envAvailable = false;

  // =========================================================================
  // Keyboard
  // =========================================================================

  private _initKeyboardCallbacks(): void {
    this._keydownHandler = (ev: KeyboardEvent) => {
      const step = 0.05;
      switch (ev.key) {
        case "1": this._spikiness = Math.max(0, this._spikiness - step); console.log(`Spikiness: ${this._spikiness.toFixed(2)}`); break;
        case "2": this._spikiness = Math.min(1, this._spikiness + step); console.log(`Spikiness: ${this._spikiness.toFixed(2)}`); break;
        case "3": this._thickness = Math.max(0, this._thickness - step); console.log(`Thickness: ${this._thickness.toFixed(2)}`); break;
        case "4": this._thickness = Math.min(1, this._thickness + step); console.log(`Thickness: ${this._thickness.toFixed(2)}`); break;
        case "r": case "R": this._spikiness = 0.5; this._thickness = 0.5; console.log("Reset"); break;
      }
    };
    window.addEventListener("keydown", this._keydownHandler);
  }
}
