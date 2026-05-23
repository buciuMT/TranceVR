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
  Corridor,
} from "../ecs/components";

import { InputManager } from "./InputManager";
import { AudioService } from "../services/AudioService";
import { XRService } from "../services/XRService";
import { Environment } from "../entities/Environment";

import {
  MovementSystem,
  CameraSystem,
  LightDrainSystem,
  LevelStreamingSystem,
  XRCameraSyncSystem,
  PostProcessSystem,
} from "../ecs/systems";
import { PostProcessPipeline } from "../ecs/components/PostProcessPipeline";
import { PostProcessService } from "../services/PostProcessService";
import type { EffectName } from "../services/PostProcessService";

/**
 * Single owner of everything — Babylon Engine, Scene, ECS World,
 * all Services, and all Systems. main.ts just boots it.
 *
 * Previously wiring was spread across MainScene, Player, and ad‑hoc
 * render‑loop callbacks. Now everything runs through ordered ECS systems.
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
  private _postProcessAttached = false;

  // Entities / helpers
  private _environment: Environment;

  // Systems (run every frame in order)
  private _systems: System[] = [];

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

    // 2. Scene setup
    game._initScene();

    // 3. Load initial environment segment before spawning player
    //    (prevents player from falling through an unloaded floor)
    await game._loadInitialSegment();

    // 4. Create ECS Systems
    game._initSystems();

    // 5. Spawn initial entities
    game._spawnPlayer();

    // 6. Post‑processing — activated lazily on first Ctrl+1..5 keypress
    // (avoids black‑screen on startup if shader compilation fails)

    // 7. Audio + post-process controls
    game._initAudioControls();
    game._initEffectShortcuts();

    // 8. Inspector
    game._initInspector();

    // 9. Resize handling
    game._handleResize();

    // 10. Start render loop (MUST start before XR — XR init can hang waiting for interaction)
    game._startRenderLoop();

    // 11. XR (fire-and-forget — callbacks register but init may wait for user gesture)
    game._initXR();

    console.log("[GameEngine] TranceVR initialised — Engine-driven ECS.");
    return game;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  get audio(): AudioService {
    return this._audio;
  }
  get xr(): XRService {
    return this._xr;
  }
  get postProcess(): PostProcessService {
    return this._postProcess;
  }
  get world(): World {
    return this._world;
  }
  get scene(): Scene {
    return this._scene;
  }
  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  /** Get the underlying Babylon.js Engine (rarely needed). */
  get babylonEngine(): Engine {
    return this._engine;
  }

  // =========================================================================
  // Environment preload
  // =========================================================================

  /** Load the segment at Z=0 before spawning the player so they have ground to stand on. */
  private async _loadInitialSegment(): Promise<void> {
    const SEGMENT_LENGTH = 16;
    const MODULE_TYPES = ["coridor0", "coridor1", "coridor2", "coridor3"];

    // Load segments -3..3 around spawn (same as LevelStreamingSystem)
    const start = -3;
    const end = 3;
    const promises: Promise<void>[] = [];

    for (let i = start; i <= end; i++) {
      const type = MODULE_TYPES[Math.abs(i) % MODULE_TYPES.length];
      const offset = i * SEGMENT_LENGTH;

      promises.push(
        this._environment.loadLevel(type, new Vector3(0, 0, offset)).then((meshes) => {
          const entity = this._world.createEntity();
          this._world.add(new Corridor({ entity, segmentIndex: i, meshes }));
        }),
      );
    }

    await Promise.allSettled(promises);
    console.log("[GameEngine] Initial corridor segments loaded.");
  }

  // =========================================================================
  // Scene & systems init
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

  private _initSystems(): void {
    this._systems = [
      new MovementSystem(this._world, this._input),
      new CameraSystem(this._world),
      new LightDrainSystem(this._world),
      new LevelStreamingSystem(this._world, this._environment),
      new XRCameraSyncSystem(this._world, this._xr),
      new PostProcessSystem(this._world, this._postProcess, this._audio),
    ];

    console.log(
      `[GameEngine] ${this._systems.length} systems registered.`
    );
  }

  // =========================================================================
  // Entity factories
  // =========================================================================

  /** Create the player entity with all Babylon nodes + ECS components. */
  private _spawnPlayer(): void {
    const entity = this._world.createEntity();

    // 1. Capsule mesh (invisible physics body)
    const capsule = MeshBuilder.CreateCapsule(
      "playerCapsule",
      { radius: 0.3, height: 1.8 },
      this._scene,
    );
    capsule.position = new Vector3(0, 3, 0);
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
    this._world.add(new Transform({ entity, position: capsule.position.clone() }));
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

    console.log(`[GameEngine] Player entity spawned (id: ${entity})`);
  }

  // =========================================================================
  // XR wiring
  // =========================================================================

  private async _initXR(): Promise<void> {
    await this._xr.init();

    this._xr.onEnter((xrCamera) => {
      if (this._postProcessAttached) {
        this._postProcess.attachToCamera(xrCamera);
      }

      // Sync player position to XR camera on entry
      const players = this._world.queryComponents(Player, Transform);
      for (const { components } of players) {
        const [, transform] = components;
        const footPos = transform.position.clone();
        footPos.y -= 0.9;
        xrCamera.position.set(footPos.x, xrCamera.position.y, footPos.z);
      }
    });

    this._xr.onExit(() => {
      if (!this._postProcessAttached) return;
      // Switch post-process back to player camera
      const players = this._world.queryComponents(Player, Camera);
      if (players.length > 0) {
        this._postProcess.attachToCamera(players[0].components[1].camera);
      }
    });

    // Flashlight on right controller
    this._xr.onControllerAdded((_mc, handedness, gripNode) => {
      if (handedness === "right") {
        const players = this._world.queryComponents(Player, Light);
        for (const { components } of players) {
          const [, light] = components;
          if (gripNode) {
            light.light.parent = gripNode;
            light.light.position = Vector3.Zero();
            light.light.direction = new Vector3(0, 0, 1);
          } else {
            // Reset to camera
            const cameras = this._world.queryComponents(Player, Camera);
            for (const { components: camComps } of cameras) {
              const [, cam] = camComps;
              light.light.parent = cam.camera;
              light.light.position = Vector3.Zero();
              light.light.direction = new Vector3(0, 0, 1);
            }
          }
        }
      }
    });

    // Per-frame: update teleportation floor meshes
    const levelSystem = this._systems.find(
      (s) => s instanceof LevelStreamingSystem,
    ) as LevelStreamingSystem | undefined;

    this._scene.onBeforeRenderObservable.add(() => {
      if (!this._xr.isVR) return;
      const tp = this._xr.teleportation;
      if (!tp || !levelSystem) return;

      const floors = levelSystem.getFloorMeshes();
      for (const f of floors) {
        tp.addFloorMesh(f);
      }
    });
  }

  // =========================================================================
  // Post‑process — lazy attachment
  // =========================================================================

  /** Attach the uber PostProcess to the current camera (called on first Ctrl+1..5). */
  private _ensurePostProcessAttached(): void {
    if (this._postProcessAttached) return;
    const players = this._world.queryComponents(Camera, Player);
    if (players.length === 0) return;

    this._postProcess.attachToCamera(players[0].components[0].camera);
    this._postProcessAttached = true;
    console.log("[Engine] PostProcess activated.");
  }

  // =========================================================================
  // Audio controls (keyboard shortcuts)
  // =========================================================================

  private _initAudioControls(): void {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) this._audio.loadTrack(file);
    };

    window.addEventListener("keydown", (ev) => {
      switch (ev.key) {
        case "1":
          this._audio.loadTrack("assets/track1.wav");
          break;
        case "2":
          console.log("Track 2 requested (placeholder)");
          this._audio.loadTrack("assets/track2.wav");
          break;
        case "3":
          console.log("Track 3 requested (placeholder)");
          break;
        case "o":
        case "O":
          fileInput.click();
          break;
      }
    });

    // Auto-play default track
    this._audio.loadTrack("assets/track1.wav");
  }

  // =========================================================================
  // Post‑process keyboard shortcuts — Ctrl+1..5 toggle effects, Ctrl+0 disables all
  // =========================================================================

  private _initEffectShortcuts(): void {
    window.addEventListener("keydown", (ev) => {
      // 'a' → toggle blur (no Ctrl needed)
      if (ev.key === "a" || ev.key === "A") {
        this._ensurePostProcessAttached();
        this._postProcess.toggleBlur();
        return;
      }

      if (!ev.ctrlKey) return;

      // Lazy‑attach PostProcess on first use
      this._ensurePostProcessAttached();

      const names = this._postProcess.effectNames as unknown as string[];
      const digit = parseInt(ev.key);
      const idx = digit - 1;

      if (digit === 0) {
        // Ctrl+0 → disable all
        this._postProcess.disableAll();
        console.log("[Engine] All effects disabled");

        // Also reset pipeline component
        const pipes = this._world.queryComponents(PostProcessPipeline);
        for (const { components: [pipe] } of pipes) {
          pipe.tranceIntensity = 0;
          pipe.chromaticIntensity = 0;
          pipe.pulseIntensity = 0;
          pipe.kaleidoscopeIntensity = 0;
          pipe.invertIntensity = 0;
        }
      } else if (idx >= 0 && idx < names.length) {
        // Ctrl+1..5 → toggle effect
        const name = names[idx] as EffectName;
        const current = this._postProcess.getIntensity(name);
        const next = current > 0 ? 0 : 0.7;
        this._postProcess.setIntensity(name, next);
        console.log(`[Engine] ${name}: ${current > 0 ? "OFF" : "ON (0.7)"}`);

        // Sync pipeline component
        const pipes = this._world.queryComponents(PostProcessPipeline);
        for (const { components: [pipe] } of pipes) {
          const key = `${name}Intensity` as keyof typeof pipe;
          if (key in pipe) (pipe as any)[key] = next;
        }
      }
    });
  }

  // =========================================================================
  // Inspector
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
