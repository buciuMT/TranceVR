import { Vector3 } from "@babylonjs/core";
import { Scene } from "./Scene";
import { GameEngine } from "../core/Engine";
import { Tags, PostProcessPipeline, VertexGlitchEffect, Camera, Player, Transform, Corridor, Light } from "../ecs/components";
import { LevelStreamingSystem } from "../ecs/systems";
import type { EffectName } from "../services/PostProcessService";

const SEGMENT_LENGTH = 16;
const RENDER_DISTANCE = 3;
const MODULE_TYPES = ["coridor0", "coridor1", "coridor2", "coridor3"];

/**
 * The main game scene — first‑person dungeon crawl with audio‑reactive post‑processing.
 *
 * Owns: which entities to spawn, keyboard shortcuts, XR callbacks, audio loading.
 * The Engine owns infrastructure (Babylon, ECS world, services, systems, render loop).
 */
export class MainScene extends Scene {
  private _keydownHandler: ((ev: KeyboardEvent) => void) | null = null;
  private _sceneTag = "main_scene";

  // =========================================================================
  // Lifecycle
  // =========================================================================

  async init(engine: GameEngine): Promise<void> {
    // 1. Load initial corridor segments BEFORE spawning player
    //    (prevents player from falling through empty space)
    await this._loadInitialSegments(engine);

    // 2. Spawn player — always starts flat; VR transition via XR button
    engine.createPlayer({ pos: new Vector3(0, 3, 0) });

    // 3. Wire keyboard callbacks
    this._initKeyboardCallbacks(engine);

    // 4. Wire XR callbacks (VR enter/exit, controller attachment)
    this._initXRCallbacks(engine);

    // 5. Auto-load default audio track
    engine.audio.loadTrack("assets/track1.wav");

    console.log("[MainScene] Initialised.");
  }

  unload(engine: GameEngine): void {
    // 1. Remove keyboard listener
    if (this._keydownHandler) {
      window.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }

    // 2. Destroy all entities tagged with this scene's tag
    const allTagged = engine.world.queryComponents(Tags);
    for (const { entity, components } of allTagged) {
      const [tags] = components;
      if (tags.has(this._sceneTag)) {
        engine.world.destroyEntity(entity);
      }
    }

    // 3. Dispose any remaining corridor meshes (belt-and-suspenders)
    const corridors = engine.world.queryComponents(Corridor);
    for (const { entity, components: [corridor] } of corridors) {
      for (const mesh of corridor.meshes) {
        mesh.dispose();
      }
      engine.world.destroyEntity(entity);
    }

    console.log("[MainScene] Unloaded.");
  }

  // =========================================================================
  // Corridor pre‑load (identical to old Engine._loadInitialSegment)
  // =========================================================================

  private async _loadInitialSegments(engine: GameEngine): Promise<void> {
    const start = -RENDER_DISTANCE;
    const end = RENDER_DISTANCE;
    const promises: Promise<void>[] = [];

    for (let i = start; i <= end; i++) {
      const type = MODULE_TYPES[Math.abs(i) % MODULE_TYPES.length];
      const offset = i * SEGMENT_LENGTH;

      promises.push(
        engine.environment.loadLevel(type, new Vector3(0, 0, offset)).then((meshes) => {
          const entity = engine.world.createEntity();
          engine.world.add(new Corridor({ entity, segmentIndex: i, meshes }));
          engine.world.add(new Tags({ entity, values: [this._sceneTag, "corridor"] }));
        }),
      );
    }

    await Promise.allSettled(promises);
    console.log("[MainScene] Initial corridor segments loaded.");
  }

  // =========================================================================
  // Keyboard callbacks (identical to old Engine._initAudioControls + _initEffectShortcuts)
  // =========================================================================

  private _initKeyboardCallbacks(engine: GameEngine): void {
    // Audio file picker (identical to old Engine._initAudioControls)
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) engine.audio.loadTrack(file);
    };

    this._keydownHandler = (ev: KeyboardEvent) => {
      // Audio track selection (identical to old Engine._initAudioControls)
      switch (ev.key) {
        case "k":
        case "K":
          engine.audio.nextTrack();
          break;
        case "1":
          engine.audio.loadTrack("assets/track1.wav");
          break;
        case "2":
          console.log("Track 2 requested (placeholder)");
          engine.audio.loadTrack("assets/track2.wav");
          break;
        case "3":
          console.log("Track 3 requested (placeholder)");
          break;
        case "o":
        case "O":
          fileInput.click();
          break;
      }

      // Blur toggle ('a' key — no Ctrl needed) (identical to old _initEffectShortcuts)
      if (ev.key === "a" || ev.key === "A") {
        engine.ensurePostProcessAttached();
        engine.postProcess.toggleBlur();
        return;
      }

      // Vertex glitch toggle (Ctrl+6) (identical to old _initEffectShortcuts)
      if (ev.ctrlKey && ev.key === "6") {
        const effects = engine.world.queryComponents(VertexGlitchEffect);
        for (const { components: [fx] } of effects) {
          fx.enabled = !fx.enabled;
          console.log(`[MainScene] VertexGlitch: ${fx.enabled ? "ON" : "OFF"}`);
        }
        return;
      }

      if (!ev.ctrlKey) return;

      // Lazy‑attach PostProcess on first use (identical to old _initEffectShortcuts)
      engine.ensurePostProcessAttached();

      const names = engine.postProcess.effectNames as unknown as string[];
      const digit = parseInt(ev.key);
      const idx = digit - 1;

      if (digit === 0) {
        // Ctrl+0 → disable all
        engine.postProcess.disableAll();
        console.log("[MainScene] All effects disabled");

        // Reset pipeline component
        const pipes = engine.world.queryComponents(PostProcessPipeline);
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
        const current = engine.postProcess.getIntensity(name);
        const next = current > 0 ? 0 : 0.7;
        engine.postProcess.setIntensity(name, next);
        console.log(`[MainScene] ${name}: ${current > 0 ? "OFF" : "ON (0.7)"}`);

        // Sync pipeline component
        const pipes = engine.world.queryComponents(PostProcessPipeline);
        for (const { components: [pipe] } of pipes) {
          const key = `${name}Intensity` as keyof typeof pipe;
          if (key in pipe) (pipe as any)[key] = next;
        }
      }
    };

    window.addEventListener("keydown", this._keydownHandler);
  }

  // =========================================================================
  // XR callbacks (identical to old Engine._initXR)
  // =========================================================================

  private _initXRCallbacks(engine: GameEngine): void {
    engine.xr.onEnter((xrCamera) => {
      if (engine.postProcessAttached) {
        engine.postProcess.attachToCamera(xrCamera);
      }

      // Sync player position to XR camera on entry
      const players = engine.world.queryComponents(Player, Transform);
      for (const { components } of players) {
        const [, transform] = components;
        const footPos = transform.position.clone();
        footPos.y -= 0.9;
        xrCamera.position.set(footPos.x, xrCamera.position.y, footPos.z);
      }
    });

    engine.xr.onExit(() => {
      if (!engine.postProcessAttached) return;
      // Switch post-process back to player camera
      const players = engine.world.queryComponents(Player, Camera);
      if (players.length > 0) {
        engine.postProcess.attachToCamera(players[0].components[1].camera);
      }
    });

    // Flashlight on right controller
    engine.xr.onControllerAdded((inputSource, motionController, handedness, gripNode) => {
      // Track cycle on 'select' (trigger)
      inputSource.onSelectObservable.add(() => {
        console.log(`[MainScene] VR ${handedness} controller 'select' — cycling track`);
        engine.audio.nextTrack();
      });

      if (handedness === "right") {
        // Track cycle on 'A' button
        const aButton = motionController.getComponent("a-button");
        if (aButton) {
          aButton.onButtonStateChangedObservable.add((component: any) => {
            if (component.pressed) {
              console.log("[MainScene] VR 'A' button pressed — cycling track");
              engine.audio.nextTrack();
            }
          });
        }

        const players = engine.world.queryComponents(Player, Light);
        for (const { components } of players) {
          const [, light] = components;
          if (gripNode) {
            light.light.parent = gripNode;
            light.light.position = Vector3.Zero();
            light.light.direction = new Vector3(0, 0, 1);
          } else {
            // Reset to camera
            const cameras = engine.world.queryComponents(Player, Camera);
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

    // Per-frame: register floor meshes for VR teleportation
    const levelSystem = engine.getSystem(LevelStreamingSystem);

    engine.scene.onBeforeRenderObservable.add(() => {
      if (!engine.xr.isVR) return;
      const tp = engine.xr.teleportation;
      if (!tp || !levelSystem) return;

      const floors = levelSystem.getFloorMeshes();
      for (const f of floors) {
        tp.addFloorMesh(f);
      }
    });
  }
}
