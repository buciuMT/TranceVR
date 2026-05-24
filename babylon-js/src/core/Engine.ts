import {
  Engine,
  Scene,
  Vector3,
  HavokPlugin,
  HemisphericLight,
  Color3,
  Color4,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  FreeCamera,
  SpotLight,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF";

import { World, System } from "../ecs";
import {
  Transform,
  Physics,
  Camera,
  Light,
  Player,
  Tags,
  PostProcessPipeline,
  VertexGlitchEffect,
} from "../ecs/components";

import { InputManager } from "./InputManager";
import { AudioService } from "../services/AudioService";
import { XRService } from "../services/XRService";
import { Environment } from "../entities/Environment";
import { PostProcessService } from "../services/PostProcessService";

import {
  MovementSystem,
  CameraSystem,
  LightDrainSystem,
  LevelStreamingSystem,
  XRCameraSyncSystem,
  PostProcessSystem,
  VertexGlitchSystem,
} from "../ecs/systems";

import type { Scene as GameScene } from "../scenes/Scene";

/**
 * Single owner of infrastructure — Babylon Engine, Scene, ECS World,
 * all Services, all Systems, and the player factory.
 *
 * Scenes (MainScene, etc.) own content — what entities to spawn,
 * what keyboard callbacks to wire, what XR hooks to connect.
 */
export class GameEngine {
  private _engine: Engine;
  private _scene: Scene;
  private _world: World;
  private _canvas: HTMLCanvasElement;

  // Services (owned by engine, injected into Systems)
  private _input: InputManager;
  private _audio: AudioService;
  private _xr: XRService;
  private _postProcess: PostProcessService;
  private _environment: Environment;

  // Post‑process state (shared between Engine and Scene callbacks)
  private _postProcessAttached = false;

  // Systems (run every frame in order)
  private _systems: System[] = [];

  // Scene management
  private _currentScene: GameScene | null = null;
  private _started = false;

  private constructor(canvasId: string) {
    this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this._engine = new Engine(this._canvas, true, {
      deterministicLockstep: true,
    });
    this._engine.disableUniformBuffers = true;
    this._scene = new Scene(this._engine);

    this._world = new World();
    this._input = new InputManager(this._scene);
    this._audio = new AudioService();
    this._xr = new XRService(this._scene);
    this._postProcess = new PostProcessService(this._scene);
    this._environment = new Environment(this._scene);
  }

  // =========================================================================
  // Static factory — async bootstrap
  // =========================================================================

  public static async Create(canvasId: string): Promise<GameEngine> {
    const game = new GameEngine(canvasId);

    // 1. Havok Physics
    const havok = await HavokPhysics();
    const plugin = new HavokPlugin(true, havok);
    game._scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);

    // 2. Scene visuals
    game._initScene();

    // 3. Create ECS Systems
    game._initSystems();

    // 4. Inspector
    game._initInspector();

    // 5. Resize handling
    game._handleResize();

    console.log("[GameEngine] Infrastructure initialised — call loadScene() to start.");
    return game;
  }

  // =========================================================================
  // Scene lifecycle
  // =========================================================================

  /**
   * Load a scene. If a scene is currently loaded, unloads it first.
   * Then calls newScene.init(this).
   */
  public async loadScene(scene: GameScene): Promise<void> {
    if (this._currentScene) {
      this._currentScene.unload(this);
      this._currentScene = null;
    }

    this._currentScene = scene;
    await scene.init(this);
    console.log(`[GameEngine] Scene loaded: ${scene.constructor.name}`);

    // Start render loop + XR on first scene load
    // (render loop MUST start before XR — XR init can hang waiting for interaction)
    if (!this._started) {
      this._started = true;
      this._startRenderLoop();
      this._initXRService();
    }
  }

  // =========================================================================
  // Player factory
  // =========================================================================

  /**
   * Create the player entity with all Babylon nodes + ECS components.
   * Always starts in flat mode. VR transition happens via the XR button /
   * callbacks wired by the current scene.
   */
  public createPlayer(options?: { pos?: Vector3 }): number {
    const pos = options?.pos ?? new Vector3(0, 3, 0);
    const entity = this._world.createEntity();

    // 1. Capsule mesh (invisible physics body)
    const capsule = MeshBuilder.CreateCapsule(
      "playerCapsule",
      { radius: 0.3, height: 1.8 },
      this._scene,
    );
    capsule.position = pos.clone();
    capsule.isVisible = false;

    const aggregate = new PhysicsAggregate(
      capsule,
      PhysicsShapeType.CAPSULE,
      { mass: 80, friction: 0.5, restitution: 0 },
      this._scene,
    );
    aggregate.body.setMassProperties({ inertia: new Vector3(0, 0, 0) });

    // 2. Camera
    const freeCam = new FreeCamera(
      "playerCamera",
      new Vector3(0, 0.6, 0),
      this._scene,
    );
    freeCam.parent = capsule;
    freeCam.attachControl(this._canvas, true);
    freeCam.keysUp = [];
    freeCam.keysDown = [];
    freeCam.keysLeft = [];
    freeCam.keysRight = [];
    freeCam.minZ = 0.1;
    freeCam.checkCollisions = false;
    freeCam.applyGravity = false;
    freeCam.setTarget(new Vector3(0, 0.6, 10));

    // 3. Flashlight
    const flashlight = new SpotLight(
      "playerFlashlight",
      Vector3.Zero(),
      new Vector3(0, 0, 1),
      Math.PI / 3,
      10,
      this._scene,
    );
    flashlight.parent = freeCam;
    flashlight.intensity = 200;
    flashlight.range = 200;

    // 4. ECS components
    this._world.add(new Transform({ entity, position: pos.clone() }));
    this._world.add(new Physics({ entity, aggregate, shapeType: PhysicsShapeType.CAPSULE, mass: 80 }));
    this._world.add(new Camera({ entity, camera: freeCam }));
    this._world.add(new Light({ entity, light: flashlight, intensity: 200, range: 200 }));
    this._world.add(new Player({ entity, moveSpeed: 5 }));

    // 5. Post-process pipeline (all effects start disabled)
    this._world.add(new PostProcessPipeline({
      entity,
      tranceIntensity: 0,
      chromaticIntensity: 0,
      pulseIntensity: 0,
      kaleidoscopeIntensity: 0,
      invertIntensity: 0,
    }));

    // 6. Vertex glitch (disabled by default, toggled with Ctrl+6)
    this._world.add(new VertexGlitchEffect({ entity, enabled: false, intensity: 0.8 }));

    // 7. Tags
    this._world.add(new Tags({ entity, values: ["player"] }));

    console.log(`[GameEngine] Player entity spawned (id: ${entity})`);
    return entity;
  }

  // =========================================================================
  // Post‑process — lazy attachment (used by scenes)
  // =========================================================================

  /** Whether the uber PostProcess is currently attached to a camera. */
  public get postProcessAttached(): boolean {
    return this._postProcessAttached;
  }

  /** Attach the uber PostProcess to the current camera (called on first effect toggle). */
  public ensurePostProcessAttached(): void {
    if (this._postProcessAttached) return;
    const players = this._world.queryComponents(Camera, Player);
    if (players.length === 0) return;

    this._postProcess.attachToCamera(players[0].components[0].camera);
    this._postProcessAttached = true;
    console.log("[Engine] PostProcess activated.");
  }

  // =========================================================================
  // System lookup (used by scenes for teleportation wiring, etc.)
  // =========================================================================

  /** Find a system by its constructor. Returns undefined if not registered. */
  public getSystem<T extends System>(type: new (...args: any[]) => T): T | undefined {
    return this._systems.find((s) => s instanceof type) as T | undefined;
  }

  // =========================================================================
  // Public accessors
  // =========================================================================

  get audio(): AudioService       { return this._audio; }
  get xr(): XRService             { return this._xr; }
  get postProcess(): PostProcessService { return this._postProcess; }
  get world(): World              { return this._world; }
  get scene(): Scene              { return this._scene; }
  get canvas(): HTMLCanvasElement { return this._canvas; }
  get environment(): Environment  { return this._environment; }
  get babylonEngine(): Engine     { return this._engine; }

  // =========================================================================
  // Scene visuals
  // =========================================================================

  private _initScene(): void {
    this._scene.fogMode = Scene.FOGMODE_LINEAR;
    this._scene.fogColor = new Color3(0.06, 0.06, 0.06);
    this._scene.clearColor = new Color4(0.06, 0.06, 0.06, 1.0);
    this._scene.fogStart = 20.0;
    this._scene.fogEnd = 60.0;

    // Dim ambient light
    const ambient = new HemisphericLight(
      "ambientLight",
      new Vector3(0, 1, 0),
      this._scene,
    );
    ambient.intensity = 0.15;
  }

  // =========================================================================
  // Systems
  // =========================================================================

  private _initSystems(): void {
    this._systems = [
      new MovementSystem(this._world, this._input),
      new CameraSystem(this._world),
      new LightDrainSystem(this._world),
      new LevelStreamingSystem(this._world, this._environment),
      new XRCameraSyncSystem(this._world, this._xr),
      new PostProcessSystem(this._world, this._postProcess, this._audio),
      new VertexGlitchSystem(this._world),
    ];

    console.log(`[GameEngine] ${this._systems.length} systems registered.`);
  }

  // =========================================================================
  // XR service init (callbacks are wired by the scene)
  // =========================================================================

  private async _initXRService(): Promise<void> {
    await this._xr.init();
  }

  // =========================================================================
  // Inspector (Shift+I)
  // =========================================================================

  private _initInspector(): void {
    window.addEventListener("keydown", (ev) => {
      if (ev.shiftKey && ev.keyCode === 73) {
        if (this._scene.debugLayer.isVisible()) {
          this._scene.debugLayer.hide();
        } else {
          this._scene.debugLayer.show();
        }
      }
    });
  }

  // =========================================================================
  // Render loop
  // =========================================================================

  private _handleResize(): void {
    window.addEventListener("resize", () => this._engine.resize());
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      const dt = this._engine.getDeltaTime() / 1000;

      // Run all ECS systems in order
      for (const system of this._systems) {
        system.update(dt);
      }

      // Consume one-shot "just pressed" events
      this._input.finishFrame();

      this._scene.render();
    });
  }
}
