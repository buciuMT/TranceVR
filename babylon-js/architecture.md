# TranceVR — Architecture

First‑person VR dungeon exploration. Audio‑reactive post‑processing shaders.
Engine‑driven ECS. One PostProcess uber shader, optional blur pass.

**Stack:** TypeScript, Babylon.js 9.9, Havok Physics, Vite, WebXR.

---

## 1. Module Map

```
src/
├── main.ts                          # Entry point — boots GameEngine, hides loading screen
├── style.css                        # Loading screen styles
│
├── core/
│   ├── Engine.ts                    # GameEngine — owns everything (~520 lines)
│   └── InputManager.ts              # Keyboard state tracker
│
├── ecs/
│   ├── Entity.ts                    # type Entity = number
│   ├── Component.ts                 # Component interface + ComponentType
│   ├── System.ts                    # abstract System { update(dt) }
│   ├── World.ts                     # Entity/component store + queries
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── Transform.ts             # { entity, position, rotation, scale }
│   │   ├── Physics.ts               # { entity, aggregate, shapeType, mass }
│   │   ├── Camera.ts                # { entity, camera: FreeCamera }
│   │   ├── Light.ts                 # { entity, light: SpotLight, intensity, range }
│   │   ├── Player.ts                # { entity, moveSpeed }  [tag]
│   │   ├── Floor.ts                 # { entity }             [tag — VR teleport]
│   │   ├── Corridor.ts              # { entity, segmentIndex, meshes[] }
│   │   ├── PostProcessPipeline.ts   # All 5 effects bundled into one component
│   │   ├── TranceEffect.ts          # { entity, intensity, hueShift, waveStrength, colorTint }
│   │   ├── ChromaticEffect.ts       # { entity, intensity }
│   │   ├── PdAudioReactive.ts       # { entity, rmsOverride, bassOverride } — switch audio source to PD
│   │   ├── PulseEffect.ts           # { entity, intensity }
│   │   ├── KaleidoscopeEffect.ts    # { entity, intensity }
│   │   └── InvertEffect.ts          # { entity, intensity }
│   └── systems/
│       ├── index.ts
│       ├── MovementSystem.ts        # WASD → physics velocity
│       ├── CameraSystem.ts          # Syncs Transform ← physics body
│       ├── LightDrainSystem.ts      # Flashlight battery drain
│       ├── LevelStreamingSystem.ts  # Corridor spawn/despawn
│       ├── XRCameraSyncSystem.ts    # VR body sync
│       └── PostProcessSystem.ts     # Reads components + audio → drives shader
│
├── services/
│   ├── XRService.ts                 # WebXR lifecycle, state, callbacks
│   ├── AudioService.ts              # Playback + FFT analysis
│   ├── PostProcessService.ts        # Single uber PostProcess + blur + uniform state
│   ├── PostProcessManager.ts        # [LEGACY] old multi-pass manager
│   ├── PdService.ts                 # Pure Data patch runtime (webpd) + FFT analysis
│   └── ShaderService.ts             # [DEPRECATED]
│
├── entities/
│   ├── Environment.ts               # GLB loader + physics colliders (used by LevelStreamingSystem)
│   ├── Player.ts                    # [LEGACY] logic moved to Engine + MovementSystem
│   └── LevelManager.ts              # [LEGACY] logic moved to LevelStreamingSystem
│
└── shaders/
    ├── trance.vert.glsl             # [UNUSED] Babylon.js uses its own PostProcess vertex shader
    ├── tranceUber.frag.glsl         # Combined fragment shader — all 5 effects in one pass
    ├── trancePost.frag.glsl         # [LEGACY]
    ├── chromatic.frag.glsl          # [LEGACY]
    ├── pulse.frag.glsl              # [LEGACY]
    ├── kaleidoscope.frag.glsl       # [LEGACY]
    └── invert.frag.glsl             # [LEGACY]
```

---

## 2. Bootstrap Flow

```
main.ts
  │
  └── GameEngine.Create("renderCanvas")
        │
        ├── new Engine(canvas) + new Scene(engine)
        ├── new World()                    # ECS container
        ├── new InputManager(scene)        # keyboard state
        ├── new AudioService()             # playback + FFT
        ├── new XRService(scene)           # WebXR lifecycle
        ├── new PostProcessService(scene)  # uber shader + blur (not attached yet)
        ├── new Environment(scene)         # GLB loader
        │
        ├── await HavokPhysics() → HavokPlugin → scene.enablePhysics()
        ├── _initScene()                   # fog, ambient light, clear color
        ├── await _loadInitialSegment()    # load corridor segments -3..3 BEFORE spawning player
        ├── _initSystems()                 # creates 6 systems
        ├── _spawnPlayer()                 # capsule + camera + light + ECS components
        ├── _initAudioControls()           # keys 1/2/3/O
        ├── _initEffectShortcuts()         # Ctrl+1..5 toggle effects, 'a' toggle blur
        ├── _initInspector()               # Shift+I
        ├── _handleResize()
        ├── _startRenderLoop()             # for each system: update(dt) → scene.render()
        └── _initXR()                      # fire‑and‑forget async WebXR init
```

> **Note:** `_loadInitialSegment()` exists because `_spawnPlayer()` runs before the render loop starts, so `LevelStreamingSystem` hasn't had a chance to load corridor floors. Without this pre‑load the player physics body falls through empty space. It duplicates constants from `LevelStreamingSystem` as a workaround.

---

## 3. GameEngine (`core/Engine.ts`)

Single owner of everything — ~520 lines. `main.ts` just calls `Create()`.

**Services owned:**

| Service | Injected into | Purpose |
|---------|--------------|---------|
| `InputManager` | `MovementSystem` | Keyboard state (WASD) |
| `AudioService` | `PostProcessSystem` | Playback + FFT RMS |
| `XRService` | `XRCameraSyncSystem`, `_initXR()` | WebXR lifecycle, camera switching |
| `PostProcessService` | `PostProcessSystem`, `_initXR()` | Uber shader PostProcess + optional blur |
| `PdService` | `PostProcessSystem`, `_initPdControls()` | Pure Data patch runtime + FFT analysis |
| `Environment` | `LevelStreamingSystem`, `_loadInitialSegment()` | GLB loading + physics colliders |

**Systems (run in this order every frame):**

| # | System | Query |
|---|--------|-------|
| 1 | `MovementSystem` | Player + Transform + Camera + Physics |
| 2 | `CameraSystem` | Player + Transform + Physics |
| 3 | `LightDrainSystem` | Light |
| 4 | `LevelStreamingSystem` | Player + Transform |
| 5 | `XRCameraSyncSystem` | Player + Transform + Physics |
| 6 | `PostProcessSystem` | PostProcessPipeline (or individual effect components) |

**Public API:**
```ts
const engine = await GameEngine.Create("renderCanvas");

engine.audio.loadTrack("assets/track1.wav");
engine.postProcess.setIntensity("trance", 0.7);
engine.postProcess.toggleBlur();           // press 'a' or call programmatically
engine.postProcess.disableAll();
engine.world.createEntity();
engine.world.add(entity, new Transform({ entity, position: Vector3.Zero() }));
engine.scene;   // raw Babylon Scene
engine.canvas;  // HTMLCanvasElement
```

---

## 4. ECS (`ecs/`)

### 4.1 World

Stores components in `Map<ComponentType, Map<Entity, Component>>`. Each component type gets its own map.

```ts
const world = new World();
const e = world.createEntity();           // → number
world.add(new Transform({ entity: e, position: Vector3.Zero() }));
world.get(e, Transform);                  // → Transform | undefined
world.has(e, Transform);                  // → boolean
world.remove(e, Transform);
world.destroyEntity(e);                   // removes all components

// Query entities with ALL given component types
world.query(Transform, Player);           // → Entity[]
world.queryComponents(Transform, Player); // → Array<{ entity, components: [Transform, Player] }>
```

### 4.2 Components (plain data, no methods)

| Component | Fields |
|-----------|--------|
| `Transform` | `entity, position: Vector3, rotation: Vector3, scale: Vector3` |
| `Physics` | `entity, aggregate: PhysicsAggregate, shapeType, mass` |
| `Camera` | `entity, camera: FreeCamera` |
| `Light` | `entity, light: SpotLight, intensity, range` |
| `Player` | `entity, moveSpeed` [tag] |
| `Floor` | `entity` [tag — VR teleport floors] |
| `Corridor` | `entity, segmentIndex, meshes: AbstractMesh[]` |
| `PostProcessPipeline` | `entity, tranceIntensity, chromaticIntensity, pulseIntensity, kaleidoscopeIntensity, invertIntensity, tranceHueShift, tranceWaveStrength` |
| `PdAudioReactive` | `entity, rmsOverride, bassOverride` — switches audio source from AudioService to PdService |
| `TranceEffect` | `entity, intensity, hueShift, waveStrength, colorTint: Color3` |
| `ChromaticEffect` | `entity, intensity` |
| `PulseEffect` | `entity, intensity` |
| `KaleidoscopeEffect` | `entity, intensity` |
| `InvertEffect` | `entity, intensity` |

### 4.3 Systems (ordered, run once per frame)

**MovementSystem** — `Player + Transform + Camera + Physics`

Reads `InputManager` for WASD, computes direction from camera forward, sets linear velocity on physics body.

**CameraSystem** — `Player + Transform + Physics`

Copies physics body world position into `Transform.position`. Keeps ECS data in sync with Babylon nodes.

**LightDrainSystem** — `Light`

Drains `SpotLight.intensity` by 0.001 per frame (simulates flashlight battery drain).

**LevelStreamingSystem** — `Player + Transform`

Calculates player segment index from `playerZ`. Spawns 7 corridor segments (current ± 3) using `Environment.loadLevel()`. Loads in parallel via `Promise.allSettled`. Despawns segments outside range.

Config: `SEGMENT_LENGTH = 16`, `RENDER_DISTANCE = 3`, modules: `["coridor0", "coridor1", "coridor2", "coridor3"]`.

> **Duplicated in:** `Engine._loadInitialSegment()` uses the same `SEGMENT_LENGTH` and `MODULE_TYPES` array as a pre‑bootstrap workaround.

**XRCameraSyncSystem** — `Player + Transform + Physics`

When `XRService.isVR` is true, syncs the physics body XZ position to the XR camera position. Handles VR locomotion + collision.

**PostProcessSystem** — `PostProcessPipeline` (or individual effect components)

Two modes, checked in order:
1. **Pipeline mode:** reads the first `PostProcessPipeline` component found, sets all 5 intensities + trance params directly.
2. **Component mode:** queries each individual effect component type, takes **max intensity** across all entities.

Also feeds `AudioService.getRMS()` into `PostProcessService.updateAudio()` every frame.
Audio source selection: if any entity has `PdAudioReactive`, RMS is taken from `PdService` instead of `AudioService`.

---

## 5. Services

### 5.1 XRService (`services/XRService.ts`)

Wraps WebXR lifecycle. Owned by Engine, injected into `XRCameraSyncSystem`.

```ts
class XRService {
  init(): Promise<void>                    // creates default XR experience + smooth movement
  onEnter(cb: (xrCamera: Camera) => void)  // register VR enter handler
  onExit(cb: () => void)                   // register VR exit handler
  onControllerAdded(cb: (mc, handedness, gripNode) => void)

  get camera(): Camera | null              // XR camera (null if not in VR)
  get state(): "flat" | "vr"
  get isVR(): boolean
  get teleportation()                      // for floor mesh registration
  get input()                              // XR controller input
}
```

### 5.2 AudioService (`services/AudioService.ts`)

Audio playback via Babylon `AudioEngineV2` → `StreamingSound`. FFT analysis via Web Audio `AnalyserNode` (fftSize=512).

```ts
class AudioService {
  loadTrack(source: string | File): Promise<void>
  getRMS(): number                   // 0–255 root mean square
  getFrequencyData(): Uint8Array     // 256 FFT bins
}
```

### 5.3 PostProcessService (`services/PostProcessService.ts`)

Manages a **single** `PostProcess` with the combined uber shader (`tranceUber.frag.glsl`), plus an optional two‑pass blur (`BlurPostProcess` horizontal + vertical). All 5 effects run in one GPU pass. Camera switching (flat ↔ XR) disposes and recreates both post‑processes.

The fragment shader is registered in `Effect.ShadersStore` as `"tranceUberFragmentShader"`. **No custom vertex shader is used** — Babylon.js' built-in `postprocess` vertex shader provides the standard `vUV` varying.

```ts
class PostProcessService {
  attachToCamera(camera: Camera): void     // create PostProcess + restore blur if enabled
  detach(): void                           // dispose all post‑processes
  _disposePostProcesses(): void            // private — disposes uber + blur together

  getIntensity(effect: EffectName): number
  setIntensity(effect: EffectName, value: number): void
  setUniform(effect: EffectName, uniform: string, value: number | Color3): void
  updateAudio(rms: number): void           // feeds uTranceAudioReactivity + uPulseLevel
  disableAll(): void

  get blurEnabled(): boolean               // whether blur is currently active
  toggleBlur(kernelSize?: number): boolean // enable/disable two‑pass blur (default kernel 16)

  get camera(): Camera | null
  get effectNames(): readonly EffectName[]
  // EffectName = "trance" | "chromatic" | "pulse" | "kaleidoscope" | "invert"
}
```

**Uniforms:**

| Uniform | Source | Range |
|---------|--------|-------|
| `uTranceIntensity` | Pipeline or TranceEffect | 0–1 |
| `uChromaticIntensity` | Pipeline or ChromaticEffect | 0–1 |
| `uPulseIntensity` | Pipeline or PulseEffect | 0–1 |
| `uKaleidoscopeIntensity` | Pipeline or KaleidoscopeEffect | 0–1 |
| `uInvertIntensity` | Pipeline or InvertEffect | 0–1 |
| `uTranceHueShift` | Pipeline or TranceEffect | 0–1 |
| `uTranceWaveStrength` | Pipeline or TranceEffect | 0–2 |
| `uTranceAudioReactivity` | AudioService RMS | 0–255 |
| `uTranceColorTint` | Pipeline or TranceEffect | Color3 |
| `uPulseLevel` | AudioService RMS / 255 | 0–1 |
| `uTime` | Engine deltaTime accumulator | seconds |

**Attachment is lazy** — the PostProcess is NOT attached on startup. It activates on first keyboard shortcut (Ctrl+1..5 or 'a' for blur). This avoids unnecessary GPU work before any effects are enabled.

### 5.4 InputManager (`core/InputManager.ts`)

Tracks keyboard state. Created by Engine, injected into `MovementSystem`.

```ts
class InputManager {
  constructor(scene: Scene)     // registers scene.onKeyboardObservable
  isDown(key: string): boolean
  wasPressed(key: string): boolean   // one‑shot, cleared each frame
  finishFrame(): void           // called at end of render loop
}
```

### 5.5 PdService (`services/PdService.ts`)

Runs Pure Data patches in the browser via the `webpd` WebAssembly runtime.
Provides procedural audio generation, message passing to/from patches,
and FFT analysis for driving visual effects.

Owned by the Engine, injected into `PostProcessSystem`.
Initialised lazily on first use (key `P` or `4`).

```ts
class PdService {
  init(audioContext?: AudioContext): Promise<void>     // loads webpd WASM
  loadPatch(url: string): Promise<void>                 // fetch .pd from URL
  loadPatchFromFile(file: File): Promise<void>          // user upload
  loadPatchFromString(patchSource: string): void
  closePatch(): void

  connectAudio(destination?: AudioNode): void           // route to Web Audio
  start(): Promise<void>                                // resume DSP
  stop(): void                                          // pause DSP
  dispose(): void                                       // full teardown

  sendFloat(receiver: string, value: number): void
  sendBang(receiver: string): void
  sendSymbol(receiver: string, symbol: string): void
  sendList(receiver: string, list: (number|string)[]): void
  sendMessage(receiver: string, message: string): void
  sendNoteOn(channel: number, pitch: number, velocity: number): void
  sendNoteOff(channel: number, pitch: number): void

  subscribe(receiver: string, cb: (...args: any[]) => void): void
  unsubscribe(receiver: string): void

  getRMS(): number                                      // 0–255 root mean square
  getFrequencyData(): Uint8Array                        // 256 FFT bins
  getBassLevel(): number                                // 0–255 first 10 bins avg

  get isRunning(): boolean
  get isPatchLoaded(): boolean
  get audioContext(): AudioContext | null
}
```

**Audio routing:** PD output → internal `AnalyserNode` → destination (Web Audio
graph). The analyser is always connected so FFT data is available even when PD
is the sole audio source.

**ECS integration:** when a `PdAudioReactive` component exists on any entity,
`PostProcessSystem` switches from `AudioService.getRMS()` to `PdService.getRMS()`.
This lets procedural PD audio drive the shader effects instead of the main track.

**Keyboard shortcuts for PD:**

| Key | Action |
|-----|--------|
| `P` | Open file dialog to load a .pd patch (lazy-inits webpd) |
| `4` | Quick-load sample `assets/patches/drone.pd` |
| `[` | Stop PD DSP |
| `]` | Start/resume PD DSP |

**Sample patch** (`public/assets/patches/drone.pd`): dual oscillator drone
(220 Hz + 440 Hz) with a `[r masterVolume]` receive for real-time level control.

**Example usage from code:**

```ts
engine.pd.sendFloat("masterVolume", 0.3);
engine.pd.sendNoteOn(0, 60, 100);  // middle C

// Switch post-process audio source to PD
engine.world.add(new PdAudioReactive({ entity: playerEntity }));

// Subscribe to patch output
engine.pd.subscribe("analysis", (rms, pitch) => {
  console.log(`PD RMS: ${rms}, Pitch: ${pitch}`);
});
```

---

## 6. Shaders

### 6.1 Fragment Shader (`tranceUber.frag.glsl`)

All 5 effects in one file, applied in order:

```
Trance → Chromatic → Pulse → Kaleidoscope → Invert
```

Each effect is a function `vec3 applyX(vec3 color, vec2 uv)` that returns modified color. The main function samples the scene texture once, then chains effects:

```glsl
void main() {
    vec4 tex = texture2D(textureSampler, vUV);   // vUV = Babylon.js standard varying
    vec3 color = tex.rgb;

    if (uTranceIntensity > 0.001)
        color = mix(color, applyTrance(color, vUV), uTranceIntensity);
    // ... same for chromatic, pulse, kaleidoscope, invert

    gl_FragColor = vec4(color, tex.a);
}
```

When all intensities are 0, the shader is a no‑op pass‑through.

**Effect descriptions:**

| Effect | Visual |
|--------|--------|
| Trance | Wave-distorted UV re‑sample + hue rotation + audio‑reactive vignette + noise overlay + color tint |
| Chromatic | RGB channel split outward from center (stronger at edges) + scanlines |
| Pulse | Audio‑driven brightness pulse + edge desaturation |
| Kaleidoscope | 6‑segment angular mirroring with edge darkening |
| Invert | Color inversion + scanlines + CRT vignette |

### 6.2 Blur Post Process

Babylon.js built‑in `BlurPostProcess` — two‑pass (horizontal then vertical) for a smooth gaussian‑like blur. Kernel size defaults to 16. Toggled via `a` key or `PostProcessService.toggleBlur()`.

### 6.3 Vertex Shader

**No custom vertex shader.** Babylon.js uses its built-in `postprocess` vertex shader which generates a full‑screen quad and outputs the `vUV` varying (0–1 UV coordinates). The file `trance.vert.glsl` still exists but is unused.

---

## 7. Data Flow

### 7.1 Audio → Visual

```
AudioEngineV2 → AnalyserNode (fftSize=512)
                     │
                     ├── getByteFrequencyData() → Uint8Array[256]
                     └── RMS (manual, over all bins)
                           │
                           ▼
              PostProcessSystem.update(dt)
                     │
                     ├── postProcess.updateAudio(rms)
                     │      ├── uTranceAudioReactivity = rms
                     │      └── uPulseLevel = rms / 255
                     │
                     └── reads PostProcessPipeline / effect components
                           │
                           ▼
              PostProcess.onApply (every frame)
                           │
                           ▼
              tranceUber.frag.glsl + optional BlurPostProcess
```

### 7.1b PD Audio → Visual

```
webpd WASM (running .pd patch)
       │
       ▼
AnalyserNode (fftSize=512)
       │
       ├── getByteFrequencyData() → Uint8Array[256]
       └── PdService.getRMS()         (0–255)
             │
             ▼
PostProcessSystem.update(dt)
       │
       ├── If PdAudioReactive component exists → PdService.getRMS()
       ├── Else → AudioService.getRMS()
       │
       ▼
PostProcessService.updateAudio(rms)
       │
       ├── uTranceAudioReactivity = rms
       └── uPulseLevel = rms / 255
             │
             ▼
  tranceUber.frag.glsl + optional BlurPostProcess
```

### 7.2 Camera Switching (Flat ↔ XR)

```
Flat:  PostProcess (+ blur if enabled) attached to player FreeCamera

XR Enter (state === 2):
  1. If postProcessAttached: attachToCamera(xrCamera) → disposes old, creates new on XR camera
  2. Sync player capsule position to XR camera

XR Exit (state === 0):
  1. If postProcessAttached: attachToCamera(playerFreeCamera) → switches back
```

### 7.3 Level Streaming

```
Player Z position
       │
       ▼
LevelStreamingSystem.update(dt)
       │
       ├── segmentIndex = floor((z + 8) / 16)
       │
       ├── Spawn: for i in [current−3 .. current+3]:
       │     type = MODULE_TYPES[|i| % 4]
       │     offset = i * 16
       │     environment.loadLevel(type, Vector3(0, 0, offset))
       │     → Promise.allSettled (parallel)
       │
       └── Despawn: dispose meshes + destroyEntity for segments outside range
```

> **Pre‑load:** Before the render loop starts, `_loadInitialSegment()` loads the same range directly to ensure the player has ground to stand on.

### 7.4 Post‑Process: Pipeline vs Component Mode

```
PostProcessSystem.update(dt)
       │
       ├── Step 1: Feed audio RMS → postProcess.updateAudio(rms)
       │
       ├── Step 2: queryComponents(PostProcessPipeline)
       │     │
       │     ├── Found? → read all intensities/params from pipeline → DONE
       │     │
       │     └── Not found? → fallback:
       │           ├── maxIntensity(TranceEffect)   → setIntensity("trance", max)
       │           ├── maxIntensity(ChromaticEffect)→ setIntensity("chromatic", max)
       │           ├── maxIntensity(PulseEffect)    → setIntensity("pulse", max)
       │           ├── maxIntensity(KaleidoscopeEffect)→ setIntensity("kaleidoscope", max)
       │           ├── maxIntensity(InvertEffect)   → setIntensity("invert", max)
       │           └── first TranceEffect → setUniform("trance", "HueShift", ...), etc.
```

---

## 8. Keyboard Controls

| Key | Action |
|-----|--------|
| `W A S D` | Move (physics‑driven) |
| `a` / `A` | Toggle blur post‑process (activates PostProcess on first use) |
| `1` | Load `assets/track1.wav` |
| `2` | Load `assets/track2.wav` |
| `3` | Placeholder |
| `4` | Quick-load sample `drone.pd` patch (lazy-inits webpd) |
| `P` | Open file dialog to load a .pd patch |
| `[` | Stop PD DSP |
| `]` | Start/resume PD DSP |
| `O` | Open local audio file |
| `Ctrl+1` | Toggle Trance effect (activates PostProcess on first use) |
| `Ctrl+2` | Toggle Chromatic effect |
| `Ctrl+3` | Toggle Pulse effect |
| `Ctrl+4` | Toggle Kaleidoscope effect |
| `Ctrl+5` | Toggle Invert effect |
| `Ctrl+0` | Disable all effects |
| `Shift+I` | Babylon Inspector |

---

## 9. Player Entity

The player is spawned in `Engine._spawnPlayer()` as a single entity with these components:

| Component | Value |
|-----------|-------|
| `Transform` | `position: (0, 3, 0)` |
| `Physics` | Capsule shape (radius 0.3, height 1.8), mass 80, no rotation inertia |
| `Camera` | FreeCamera parented to capsule, mouselook, near plane 0.1 |
| `Light` | SpotLight (flashlight), intensity 200, range 200, parented to camera |
| `Player` | `moveSpeed: 5` |
| `PostProcessPipeline` | All intensities = 0 (disabled) |

---

## 10. Legacy Files

These files still exist but are no longer imported by the main code path:

| File | Status / Replacement |
|------|---------------------|
| `scenes/MainScene.ts` | Deleted — wiring moved to `Engine.ts` |
| `entities/Player.ts` | `Engine._spawnPlayer()` + `MovementSystem` |
| `entities/LevelManager.ts` | `LevelStreamingSystem` |
| `services/PostProcessManager.ts` | `PostProcessService` |
| `services/ShaderService.ts` | Deprecated |
| `shaders/trance.vert.glsl` | Unused — Babylon.js uses its built‑in `postprocess` vertex shader |
| `shaders/trancePost.frag.glsl` | `tranceUber.frag.glsl` |
| `shaders/chromatic.frag.glsl` | `tranceUber.frag.glsl` |
| `shaders/pulse.frag.glsl` | `tranceUber.frag.glsl` |
| `shaders/kaleidoscope.frag.glsl` | `tranceUber.frag.glsl` |
| `shaders/invert.frag.glsl` | `tranceUber.frag.glsl` |

---

## 11. Known Issues

- **Engine hardcodes scene data.** `_initScene()`, `_spawnPlayer()`, `_initAudioControls()`, `_initEffectShortcuts()`, `_loadInitialSegment()`, and `LevelStreamingSystem` all bake in constants that should come from a scene descriptor. No JSON/YAML scene loader exists.
- **`_loadInitialSegment()` duplicates `LevelStreamingSystem` constants.** `SEGMENT_LENGTH` and `MODULE_TYPES` are defined in two places. Changing one without the other will cause mismatches.
- **Two sources of truth for post‑process state.** `_initEffectShortcuts()` writes directly to both `PostProcessService._values` and `PostProcessPipeline` component fields. The ECS component is a mirror, not the authority.
- **`PostProcessSystem` dual‑mode adds complexity.** Pipeline mode vs. per‑effect component mode with max‑aggregation is non‑obvious behavior. One canonical path would be simpler.
- **`deterministicLockstep` is enabled** in the Babylon `Engine` constructor. This is a multiplayer feature — unnecessary for a single‑player experience.
- **Mixed Romanian/English strings** in `Environment.ts`.
- **O(n²) query** in `LevelStreamingSystem` — `queryComponents(Corridor)` re‑called inside the spawn loop instead of cached once.
- **No error handling for missing assets.** Missing `.glb` or `.wav` files result in unhandled console errors.
- **Render loop starts before XR is ready.** A workaround rather than proper init ordering.
