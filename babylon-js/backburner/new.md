# TranceVR — New Architecture

> **Top priority:** Fix the PostProcess black‑screen bug before anything else.
> **Second priority:** The engine must **load** scene descriptors — not hardcode them.

---

## 0. Post‑Process Black‑Screen Fix (P0)

The uber shader compiles but enabling any effect turns the viewport black. The scene renders correctly without the PostProcess. This blocks all visual development.

### Root‑cause analysis (ordered by likelihood)

| # | Cause | Why |
|---|-------|-----|
| 1 | **Uniforms not initialized before first `onApply`** | Babylon `PostProcess` calls the shader immediately. If `uTranceIntensity` etc. are `undefined`/`NaN`, the fragment shader produces `NaN` output → black. |
| 2 | **Sampler name mismatch** | `PostProcess` defaults to `textureSampler`, but only if `sampler2D` uniforms aren't renamed. If the shader uses a different name, the input texture is never bound. |
| 3 | **Render‑target format mismatch** | The PostProcess render target defaults to `RGBA8_UNORM`. Some GPUs/drivers produce black if the format doesn't match what the shader writes. |
| 4 | **PostProcess created before first render** | If the post‑process is created on a camera that hasn't rendered yet, the framebuffer might be in an invalid state. |
| 5 | **Shader compilation warnings are silently ignored** | GLSL warnings (e.g. unused uniforms, implicit casts) can cause undefined behavior on some WebGL implementations. |

### Fix

**Step 1 — Explicit uniform defaults.** Set every uniform to a valid value **immediately** after `PostProcess` construction, before the first frame it applies:

```ts
const pp = new PostProcess("uberPP", "tranceUber", ["uTime"], [], 1.0, camera);
// Force safe defaults BEFORE the first render
pp.onApply = (effect) => {
  // Defaults set once, then onApply observer handles per-frame updates
};
// Set all uniforms immediately so the first pass has valid values
effect.setFloat("uTranceIntensity", 0);
effect.setFloat("uChromaticIntensity", 0);
effect.setFloat("uPulseIntensity", 0);
effect.setFloat("uKaleidoscopeIntensity", 0);
effect.setFloat("uInvertIntensity", 0);
effect.setFloat("uTranceHueShift", 0);
effect.setFloat("uTranceWaveStrength", 0);
effect.setFloat("uTranceAudioReactivity", 0);
effect.setFloat("uPulseLevel", 0);
effect.setFloat("uTime", 0);
effect.setColor3("uTranceColorTint", new Color3(1, 1, 1));
```

**Step 2 — Validate shader compilation.** Catch errors explicitly:

```ts
const pp = new PostProcess("uberPP", "tranceUber", [...], [...], 1.0, camera);
if (!pp.getEffect()?.isReady()) {
  console.error("[PostProcess] Shader failed to compile — using passthrough");
  // Fall back to a minimal no-op shader
}
```

**Step 3 — Defer attachment to after first render.** Don't attach the PostProcess until at least one frame has rendered. The current lazy‑attach on `Ctrl+1..5` is a workaround for this exact problem — make it explicit:

```ts
let firstFrameRendered = false;
engine.runRenderLoop(() => {
  scene.render();
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    // Now safe to create & attach PostProcess
  }
});
```

**Step 4 — Validate with a diagnostic passthrough shader first.** Before the full uber shader, test with this minimal shader to confirm the PostProcess pipeline itself works:

```glsl
// passthrough.frag.glsl — diagnostic only
varying vec2 vUv;
uniform sampler2D textureSampler;
void main() {
    vec3 color = texture2D(textureSampler, vUv).rgb;
    gl_FragColor = vec4(color * 1.1, 1.0); // Slightly brighter → confirms it works
}
```

Once passthrough renders correctly, re‑enable the uber shader piece by piece to find the offending effect.

**Step 5 — Per‑effect enable/disable guards.** Each effect function in the shader must return the input color unchanged when intensity is 0. The current shader already does this with `if (intensity > 0.001)`, but verify that `applyTrance`, `applyChromatic`, etc. don't produce NaN/Inf even when intensity is 0.

---

## 1. New Module Map

```
src/
├── main.ts                           # Boots engine → loads scene descriptor
├── style.css
│
├── engine/
│   ├── Engine.ts                     # Runtime: Babylon + Physics + ECS. ZERO game logic.
│   ├── SceneLoader.ts                # Parses scene JSON → spawns entities, registers systems
│   ├── AssetLoader.ts                # Central caching loader with retry + fallback
│   └── types.ts                      # Scene descriptor type definitions
│
├── ecs/
│   ├── Entity.ts                     # type Entity = number
│   ├── Component.ts                  # Component interface + ComponentType
│   ├── System.ts                     # abstract System { update(dt) }
│   ├── World.ts                      # Entity/component store + queries
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── Transform.ts
│   │   ├── Physics.ts
│   │   ├── Camera.ts
│   │   ├── Light.ts
│   │   ├── Player.ts
│   │   ├── Floor.ts
│   │   ├── Corridor.ts
│   │   └── PostProcessPipeline.ts    # SINGLE component — sole source of truth
│   └── systems/
│       ├── index.ts
│       ├── MovementSystem.ts
│       ├── CameraSystem.ts
│       ├── LightDrainSystem.ts
│       ├── LevelStreamingSystem.ts
│       ├── XRCameraSyncSystem.ts
│       └── PostProcessSystem.ts
│
├── services/
│   ├── XRService.ts
│   ├── AudioService.ts
│   ├── PostProcessService.ts         # Stateless! Only owns the PostProcess object
│   └── InputService.ts               # New: configurable input bindings
│
├── scenes/                           # Scene descriptors — DATA, NOT CODE
│   └── dungeon.json
│
└── shaders/
    ├── trance.vert.glsl
    └── tranceUber.frag.glsl
```

**Deleted (legacy removed):**
- `scenes/MainScene.ts`
- `entities/Player.ts`
- `entities/LevelManager.ts`
- `entities/Environment.ts` → merged into `AssetLoader`
- `services/PostProcessManager.ts`
- `services/ShaderService.ts`
- `shaders/trancePost.frag.glsl`, `chromatic.frag.glsl`, `pulse.frag.glsl`, `kaleidoscope.frag.glsl`, `invert.frag.glsl`
- Individual effect components: `TranceEffect.ts`, `ChromaticEffect.ts`, `PulseEffect.ts`, `KaleidoscopeEffect.ts`, `InvertEffect.ts`

---

## 2. Scene Descriptor Format

Scenes are JSON files that the engine loads. Nothing is hardcoded.

### `scenes/dungeon.json`

```jsonc
{
  "name": "Dungeon",
  "version": 1,

  "environment": {
    "fog": { "mode": "linear", "color": "#0f0f0f", "start": 20, "end": 60 },
    "clearColor": "#0f0f0f",
    "ambientLight": { "intensity": 0.15, "direction": [0, 1, 0] }
  },

  "physics": {
    "gravity": [0, -9.81, 0]
  },

  "level": {
    "type": "streaming",
    "segments": {
      "length": 16,
      "renderDistance": 3,
      "modules": ["coridor0", "coridor1", "coridor2", "coridor3"]
    }
  },

  "entities": [
    {
      "tag": "player",
      "components": {
        "Transform": {
          "position": [0, 3, 0],
          "rotation": [0, 0, 0],
          "scale": [1, 1, 1]
        },
        "Physics": {
          "shape": "capsule",
          "radius": 0.3,
          "height": 1.8,
          "mass": 80,
          "friction": 0.5,
          "restitution": 0,
          "lockRotation": true
        },
        "Camera": {
          "type": "free",
          "offset": [0, 0.6, 0],
          "nearPlane": 0.1,
          "mouselook": true
        },
        "Light": {
          "type": "spot",
          "offset": [0, 0, 0],
          "direction": [0, 0, 1],
          "angle": 1.047,
          "intensity": 200,
          "range": 200,
          "parentTo": "camera"
        },
        "Player": { "moveSpeed": 5 },
        "PostProcessPipeline": {
          "tranceIntensity": 0,
          "chromaticIntensity": 0,
          "pulseIntensity": 0,
          "kaleidoscopeIntensity": 0,
          "invertIntensity": 0
        }
      }
    }
  ],

  "systems": [
    { "name": "MovementSystem",        "order": 1 },
    { "name": "CameraSystem",          "order": 2 },
    { "name": "LightDrainSystem",      "order": 3 },
    { "name": "LevelStreamingSystem",  "order": 4 },
    { "name": "XRCameraSyncSystem",    "order": 5 },
    { "name": "PostProcessSystem",     "order": 6 }
  ],

  "input": {
    "bindings": [
      { "key": "KeyW",               "action": "move.forward" },
      { "key": "KeyS",               "action": "move.backward" },
      { "key": "KeyA",               "action": "move.left" },
      { "key": "KeyD",               "action": "move.right" },
      { "key": "Digit1",             "action": "audio.track1" },
      { "key": "Digit2",             "action": "audio.track2" },
      { "key": "Digit3",             "action": "audio.track3" },
      { "key": "KeyO",               "action": "audio.openFile" },
      { "key": "Digit1",  "ctrl": true, "action": "effect.toggle", "effect": "trance" },
      { "key": "Digit2",  "ctrl": true, "action": "effect.toggle", "effect": "chromatic" },
      { "key": "Digit3",  "ctrl": true, "action": "effect.toggle", "effect": "pulse" },
      { "key": "Digit4",  "ctrl": true, "action": "effect.toggle", "effect": "kaleidoscope" },
      { "key": "Digit5",  "ctrl": true, "action": "effect.toggle", "effect": "invert" },
      { "key": "Digit0",  "ctrl": true, "action": "effect.disableAll" }
    ],
    "defaultEffectIntensity": 0.7
  },

  "audio": {
    "playlist": [
      { "id": "track1", "src": "assets/track1.wav" },
      { "id": "track2", "src": "assets/track2.wav" }
    ],
    "autoPlay": false
  },

  "assets": {
    "basePath": "assets/",
    "modules": [
      { "id": "coridor0", "src": "assets/coridor0.glb" },
      { "id": "coridor1", "src": "assets/coridor1.glb" },
      { "id": "coridor2", "src": "assets/coridor2.glb" },
      { "id": "coridor3", "src": "assets/coridor3.glb" }
    ]
  }
}
```

---

## 3. Bootstrap Flow

`main.ts` boots the engine, then loads a scene descriptor. The engine has **zero** knowledge of what game it's running.

```
main.ts
  │
  ├── engine = await Engine.Create("renderCanvas")
  │     ├── new Babylon.Engine(canvas)           // renderer
  │     ├── new Scene(engine)                    // empty scene
  │     ├── await HavokPhysics()                 // physics plugin
  │     ├── new World()                          // ECS container
  │     ├── new InputService(scene)              // raw keyboard/gamepad state
  │     ├── new AudioService()                   // audio engine + FFT
  │     ├── new XRService(scene)                 // WebXR lifecycle
  │     ├── new PostProcessService()             // does NOT create PostProcess yet
  │     ├── new AssetLoader(scene)               // caching loader
  │     └── new SceneLoader(world, services)     // parses descriptors
  │
  ├── fetch("scenes/dungeon.json")
  │     └── engine.loadScene(json)
  │           │
  │           ├── SceneLoader: set fog, clear color, ambient light
  │           ├── SceneLoader: enable physics with gravity from config
  │           ├── SceneLoader: spawn entities from descriptor
  │           │     └── for each entity: createEntity() → add components
  │           ├── SceneLoader: register systems in configured order
  │           ├── SceneLoader: register input bindings
  │           └── SceneLoader: queue audio playlist (don't auto-play)
  │
  ├── engine.start()
  │     ├── Wait for first frame to render
  │     ├── Create PostProcess (deferred — see §0)
  │     ├── Validate shader compilation
  │     ├── Init XR (fire-and-forget)
  │     └── Begin render loop: systems.update(dt) → scene.render()
  │
  └── Hide loading screen
```

---

## 4. Engine (`engine/Engine.ts`)

A reusable runtime. No game logic. No hardcoded constants. No keyboard shortcuts. No player spawning.

```ts
class Engine {
  // Core
  readonly babylon: Engine;        // Babylon.js engine
  readonly scene: Scene;           // Babylon.js scene
  readonly world: World;           // ECS container
  readonly canvas: HTMLCanvasElement;

  // Services (all stateless wrappers)
  readonly input: InputService;
  readonly audio: AudioService;
  readonly xr: XRService;
  readonly postProcess: PostProcessService;
  readonly assets: AssetLoader;

  // Scene management
  readonly sceneLoader: SceneLoader;

  /** Boot the runtime. No game logic happens here. */
  static async Create(canvasId: string): Promise<Engine>;

  /** Load a scene descriptor. Call once. */
  async loadScene(descriptor: SceneDescriptor): Promise<void>;

  /** Start the render loop + XR + deferred PostProcess. Call after loadScene. */
  start(): void;
}
```

### What Engine does NOT do (compared to old architecture)

| Old `GameEngine` | New `Engine` |
|---|---|
| Creates fog, ambient light | Delegates to `SceneLoader` from descriptor |
| Spawns player entity | Delegates to `SceneLoader` from descriptor |
| Binds keyboard shortcuts | Delegates to `InputService` from descriptor |
| Hardcodes audio tracks | Delegates to `AudioService` from descriptor |
| Hardcodes level modules | Delegates to `LevelStreamingSystem` from descriptor |
| Constructs systems with `new` | Delegates to `SceneLoader` (factory pattern) |
| Creates PostProcess on first keypress | `start()` creates it after first frame |
| Has `_initEffectShortcuts()` | Replaced by `InputService` action map |
| Has `_initAudioControls()` | Replaced by `InputService` action map |
| Has `_initInspector()` | Removed from production path (debug only) |

---

## 5. SceneLoader (`engine/SceneLoader.ts`)

Parses a `SceneDescriptor` JSON and populates the ECS World + registers systems + configures services. This is the only place that maps scene data to engine state.

```ts
class SceneLoader {
  constructor(world: World, services: EngineServices);

  async load(descriptor: SceneDescriptor): Promise<void> {
    // 1. Set up environment
    this._applyEnvironment(descriptor.environment);

    // 2. Enable physics
    this._applyPhysics(descriptor.physics);

    // 3. Preload assets
    await this._assets.preload(descriptor.assets);

    // 4. Spawn entities from descriptor
    for (const entityDesc of descriptor.entities) {
      const entity = this._world.createEntity();
      for (const [compName, compData] of Object.entries(entityDesc.components)) {
        const factory = ComponentFactory.registry[compName];
        const component = factory.create(entity, compData, this._scene, this._assets);
        this._world.add(component);
      }
      if (entityDesc.tag) {
        this._tags.set(entityDesc.tag, entity);
      }
    }

    // 5. Register systems in descriptor order
    for (const sysDesc of descriptor.systems) {
      const factory = SystemFactory.registry[sysDesc.name];
      const system = factory.create(this._world, this._services);
      this._systems.push(system);
    }

    // 6. Register input bindings
    this._input.loadBindings(descriptor.input.bindings);
    this._input.setConfig("effectIntensity", descriptor.input.defaultEffectIntensity);

    // 7. Queue audio playlist
    this._audio.setPlaylist(descriptor.audio.playlist);
  }
}
```

### Component Factory

Each component type registers a factory that knows how to create the Babylon.js objects it wraps:

```ts
// Example: Camera component factory
ComponentFactory.register("Camera", {
  create(entity, data, scene) {
    const cam = new FreeCamera("cam", Vector3.FromArray(data.offset), scene);
    cam.minZ = data.nearPlane ?? 0.1;
    if (data.mouselook) cam.attachControl();
    return new Camera({ entity, camera: cam });
  }
});
```

This replaces the old `_spawnPlayer()` monolith. Each component factory is independent and testable.

### System Factory

```ts
SystemFactory.register("MovementSystem", {
  create(world, services) {
    return new MovementSystem(world, services.input);
  }
});
```

---

## 6. Services — Cleaned Up

### 6.1 PostProcessService (rewritten — P0 bug fix)

Stateless wrapper around a single `PostProcess`. Does NOT create the PostProcess until explicitly called after first frame.

```ts
class PostProcessService {
  private _postProcess: PostProcess | null = null;
  private _uniforms: Map<string, number | Color3> = new Map();
  private _time = 0;

  /**
   * Create and attach the PostProcess. Must be called AFTER at least one frame
   * has rendered. Validates shader compilation before attaching.
   */
  create(camera: Camera): void {
    // 1. Create PostProcess
    const pp = new PostProcess(
      "tranceUberPP",
      "tranceUber",
      ["uTime"],
      [],
      1.0,
      camera,
      Texture.TRILINEAR_SAMPLINGMODE,
      Engine.TEXTURETYPE_UNSIGNED_BYTE,
    );

    // 2. Validate shader compilation
    const effect = pp.getEffect();
    if (!effect || !effect.isReady()) {
      console.error("[PostProcess] Shader failed — falling back to passthrough");
      pp.dispose();
      this._createPassthrough(camera);
      return;
    }

    // 3. Set ALL uniforms to safe defaults IMMEDIATELY
    //    This prevents NaN/undefined values on the first onApply
    const defaults: Record<string, number> = {
      uTranceIntensity: 0,
      uChromaticIntensity: 0,
      uPulseIntensity: 0,
      uKaleidoscopeIntensity: 0,
      uInvertIntensity: 0,
      uTranceHueShift: 0,
      uTranceWaveStrength: 0,
      uTranceAudioReactivity: 0,
      uPulseLevel: 0,
      uTime: 0,
    };
    for (const [name, value] of Object.entries(defaults)) {
      effect.setFloat(name, value);
    }
    effect.setColor3("uTranceColorTint", new Color3(1, 1, 1));

    // 4. Set up per-frame uniform updates
    pp.onApply = (eff) => {
      for (const [name, value] of this._uniforms) {
        if (typeof value === "number") {
          eff.setFloat(name, value);
        } else {
          eff.setColor3(name, value);
        }
      }
      eff.setFloat("uTime", this._time);
    };

    this._postProcess = pp;
    console.log("[PostProcess] Attached successfully");
  }

  /** Switch to a different camera */
  switchCamera(camera: Camera): void {
    if (!this._postProcess) return;
    // Dispose old, create new on target camera
    const wasActive = this._postProcess !== null;
    this._postProcess?.dispose();
    if (wasActive) this.create(camera);
  }

  detach(): void {
    this._postProcess?.dispose();
    this._postProcess = null;
  }

  setUniform(name: string, value: number | Color3): void {
    this._uniforms.set(name, value);
  }

  updateTime(dt: number): void {
    this._time += dt;
  }

  disableAll(): void {
    const names = ["uTranceIntensity", "uChromaticIntensity", "uPulseIntensity", "uKaleidoscopeIntensity", "uInvertIntensity"];
    for (const n of names) this._uniforms.set(n, 0);
  }

  /** Diagnostic fallback — minimal passthrough shader */
  private _createPassthrough(camera: Camera): void {
    // Creates a PostProcess with a shader that just passes the scene through
    // with 10% brightness boost so it's visibly confirmed working
  }
}
```

### 6.2 InputService (new)

Replaces the old `InputManager` + inline keyboard listeners in `Engine`. Bindings come from the scene descriptor.

```ts
interface InputBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: string;
  params?: Record<string, any>;
}

class InputService {
  constructor(scene: Scene);
  loadBindings(bindings: InputBinding[]): void;
  setConfig(key: string, value: any): void;

  // Query state (for systems like MovementSystem)
  isActionActive(action: string): boolean;

  // Manage action handlers (for game-level logic)
  onAction(action: string, handler: (params?: any) => void): void;

  finishFrame(): void;
}
```

### 6.3 AssetLoader (new, replaces `Environment`)

Central caching loader with error handling, retry, and progress reporting.

```ts
class AssetLoader {
  constructor(scene: Scene);

  /** Register assets from descriptor */
  register(assets: AssetManifest): void;

  /** Load a GLB module (cached) */
  async loadGLB(id: string, position: Vector3): Promise<AbstractMesh[]>;

  /** Load an audio file */
  async loadAudio(src: string): Promise<ArrayBuffer>;

  /** Loading progress (0–1) */
  get progress(): number;

  /** Loading errors */
  get errors(): AssetError[];
}
```

### 6.4 AudioService (lightly refactored)

No hardcoded track paths. Playlist comes from scene descriptor via `setPlaylist()`.

```ts
class AudioService {
  setPlaylist(tracks: AudioTrack[]): void;
  loadTrack(id: string): Promise<void>;
  loadFile(file: File): Promise<void>;
  getRMS(): number;
  getFrequencyData(): Uint8Array;
}
```

### 6.5 XRService (unchanged)

Already well‑isolated. No changes needed.

---

## 7. ECS — Simplified

### 7.1 Components — Legacies removed

**Deleted** (duplicated the PostProcessPipeline):

- `TranceEffect`
- `ChromaticEffect`
- `PulseEffect`
- `KaleidoscopeEffect`
- `InvertEffect`

Only **`PostProcessPipeline`** remains — single source of truth for all post‑process state. Intensity values are read/written **only** through the ECS component. PostProcessSystem reads the pipeline component and feeds values to PostProcessService.

### 7.2 PostProcessSystem — Simplified

No more dual‑mode. Only one path:

```
PostProcessSystem.update(dt)
  │
  ├── 1. Feed audio → postProcess.setUniform("uTranceAudioReactivity", rms)
  │                    postProcess.setUniform("uPulseLevel", rms / 255)
  │
  ├── 2. Query PostProcessPipeline component (first one found)
  │     │
  │     └── Found? → Map each field to postProcess.setUniform(...)
  │
  └── 3. postProcess.updateTime(dt)
```

```ts
class PostProcessSystem extends System {
  update(dt: number): void {
    const rms = this._audio.getRMS();

    // Audio uniforms
    this._postProcess.setUniform("uTranceAudioReactivity", rms);
    this._postProcess.setUniform("uPulseLevel", rms / 255);

    // Pipeline uniforms
    const pipes = this._world.queryComponents(PostProcessPipeline);
    if (pipes.length > 0) {
      const pipe = pipes[0].components[0];
      this._postProcess.setUniform("uTranceIntensity", pipe.tranceIntensity);
      this._postProcess.setUniform("uChromaticIntensity", pipe.chromaticIntensity);
      this._postProcess.setUniform("uPulseIntensity", pipe.pulseIntensity);
      this._postProcess.setUniform("uKaleidoscopeIntensity", pipe.kaleidoscopeIntensity);
      this._postProcess.setUniform("uInvertIntensity", pipe.invertIntensity);
      this._postProcess.setUniform("uTranceHueShift", pipe.tranceHueShift);
      this._postProcess.setUniform("uTranceWaveStrength", pipe.tranceWaveStrength);
      this._postProcess.setUniform("uTranceColorTint", pipe.tranceColorTint);
    }

    this._postProcess.updateTime(dt);
  }
}
```

### 7.3 LevelStreamingSystem — Configurable

Receives config from the scene descriptor, not hardcoded constants:

```ts
interface LevelStreamingConfig {
  segmentLength: number;
  renderDistance: number;
  modules: string[];
}

class LevelStreamingSystem extends System {
  constructor(world: World, assetLoader: AssetLoader, config: LevelStreamingConfig);

  // Now uses this._config.segmentLength, this._config.modules, etc.
}
```

### 7.4 MovementSystem — Input-driven

Reads `InputService.isActionActive("move.forward")` etc. instead of hardcoded WASD checks. Any input device or remapping works transparently.

---

## 8. Shaders — Cleaned Up

Only two shader files remain:

| File | Purpose |
|------|---------|
| `trance.vert.glsl` | Standard full‑screen quad vertex shader |
| `tranceUber.frag.glsl` | All 5 effects in one pass, chained |

**Legacy per‑effect fragment shaders are deleted.**

The uber shader already guards each effect with:
```glsl
if (uTranceIntensity > 0.001) { color = mix(color, applyTrance(color, vUv), uTranceIntensity); }
```

**Additional safety:** each `apply*` function must clamp its output to `[0, 1]` to prevent NaN/Inf propagation:
```glsl
vec3 safeColor(vec3 c) {
    return clamp(c, vec3(0.0), vec3(1.0));
}
```

---

## 9. Data Flow

### 9.1 Audio → Visual (unchanged, but via ECS only)

```
AudioEngineV2 → AnalyserNode (fftSize=512)
                      │
                      ▼
           PostProcessSystem.update(dt)
                      │
              ┌───────┴───────┐
              │               │
     uTranceAudioReactivity  uPulseLevel
              │               │
              └───────┬───────┘
                      ▼
           PostProcessService.setUniform()
                      │
                      ▼
           tranceUber.frag.glsl
```

### 9.2 Camera switching (Flat ↔ XR)

```
Flat: PostProcess on player FreeCamera

XR Enter:
  1. postProcess.switchCamera(xrCamera)
  2. Sync player position to XR camera

XR Exit:
  1. postProcess.switchCamera(playerFreeCamera)
```

### 9.3 Effect toggling (via ECS, not service)

```
InputService: "effect.toggle" action with { effect: "trance" }
       │
       ▼
SceneLoader.onAction handler:
  const pipe = world.queryComponents(PostProcessPipeline)[0];
  pipe.tranceIntensity = pipe.tranceIntensity > 0 ? 0 : config.defaultEffectIntensity;
       │
       ▼
PostProcessSystem reads pipe → sets uniform on next frame
```

**Single source of truth:** the `PostProcessPipeline` ECS component. Nothing writes directly to `PostProcessService` except `PostProcessSystem`.

---

## 10. Keyboard Controls (Configurable)

All bindings come from `scenes/dungeon.json`. Defaults:

| Key | Action | Handler |
|-----|--------|---------|
| `W A S D` | `move.*` | `MovementSystem` reads via `InputService` |
| `1` | `audio.track1` | `InputService` handler → `AudioService.loadTrack("track1")` |
| `2` | `audio.track2` | `InputService` handler → `AudioService.loadTrack("track2")` |
| `3` | `audio.track3` | Placeholder |
| `O` | `audio.openFile` | File dialog |
| `Ctrl+1..5` | `effect.toggle` | Toggles ECS `PostProcessPipeline` field |
| `Ctrl+0` | `effect.disableAll` | Sets all pipeline intensities to 0 |

No key handling code lives in `Engine.ts`.

---

## 11. Error Handling

| Scenario | Behavior |
|----------|----------|
| GLB fails to load | `AssetLoader` retries once, logs error, skips segment. Corridor gap is visible but non‑fatal. |
| Audio fails to load | Console warning, continue without audio. No crash. |
| Shader fails to compile | `PostProcessService` falls back to passthrough shader. Console error with GLSL compiler log. |
| Scene descriptor malformed | `SceneLoader.load()` throws descriptive error before any state is modified. Loading screen remains visible. |
| Physics plugin missing | `Engine.Create()` throws immediately. |
| WebXR not available | `XRService.init()` resolves silently. Game runs flat. |
| Canvas not found | `Engine.Create()` throws immediately. |

---

## 12. Migration Plan

| Phase | What | Effort |
|-------|------|--------|
| **P0 — Fix black screen** | §0 steps 1–5: explicit defaults, validation, deferred attach, passthrough fallback | 1 day |
| **P1 — Extract Engine** | Remove all game logic from `Engine.ts`. Create `AssetLoader`, `SceneLoader`, `InputService`. Systems accept config, not hardcoded constants. | 2–3 days |
| **P2 — Scene descriptor** | Create `scenes/dungeon.json`. Implement `SceneLoader.load()`. Component + System factories. | 2 days |
| **P3 — Cleanup** | Delete legacy files. Remove individual effect components. Simplify `PostProcessSystem`. Switch `MovementSystem` to `InputService` actions. | 1 day |
| **P4 — Polish** | Error handling, progress reporting, loading screen integration, debug toggle for inspector (off by default). | 1 day |
