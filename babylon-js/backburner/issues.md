# TranceVR — Issues

## 🔴 Critical: The Engine Should Load Scenes, Not Hardcode Them

The architecture confuses **engine** with **game**. `GameEngine` is not a reusable runtime — it's a monolithic game app that directly instantiates one specific experience. Everything is welded together at compile time. To make a different level with this engine, you'd have to fork `Engine.ts`. That defeats the purpose of having an ECS.

A real engine should: **(1)** boot the runtime (renderer, physics, ECS), **(2)** load a scene descriptor that defines entities, components, systems, assets, and bindings, **(3)** run the configured systems.

---

### 1. Level modules are hardcoded
**File:** `src/ecs/systems/LevelStreamingSystem.ts:5`
```ts
const MODULE_TYPES = ["coridor0", "coridor1", "coridor2", "coridor3"];
```
The streamable corridor modules are baked into the system as a constant. The engine should accept a level descriptor that defines which GLB modules to stream, in what order, and with what patterns.

**Also duplicated in:** `src/core/Engine.ts:170` — `_loadInitialSegment()` copies the same array and constants. Two copies to keep in sync.

### 2. Level parameters are hardcoded
**File:** `src/ecs/systems/LevelStreamingSystem.ts:3-4`
```ts
const SEGMENT_LENGTH = 16;
const RENDER_DISTANCE = 3;
```
Segment size and draw distance are level-specific. Different levels could have different segment lengths, render distances, or entirely different streaming strategies. These should come from scene data.

**Also duplicated in:** `src/core/Engine.ts:169` — `_loadInitialSegment()` has its own `SEGMENT_LENGTH = 16`.

### 3. Scene environment is hardcoded
**File:** `src/core/Engine.ts:197-211` — `_initScene()`
```ts
this._scene.fogColor = new Color3(0.06, 0.06, 0.06);
this._scene.clearColor = new Color4(0.06, 0.06, 0.06, 1.0);
this._scene.fogStart = 20.0;
this._scene.fogEnd = 60.0;
// ambient.intensity = 0.15;
```
Fog, clear color, and ambient light are engine defaults, not per-scene data. A different level (e.g. outdoor, or lit dungeon) cannot override these without changing engine code.

### 4. The player is fully hardcoded
**File:** `src/core/Engine.ts:233-274` — `_spawnPlayer()`
```ts
// capsule radius 0.3, height 1.8, mass 80
// camera parented at (0, 0.6, 0), near plane 0.1
// flashlight intensity 200, range 200, angle π/3
// moveSpeed 5
```
The entire player entity — physics shape, camera properties, flashlight parameters, movement speed — is written directly in engine code. These should be defined by scene data so different levels can have different player setups (e.g. crawling vs. walking, no flashlight, different speeds).

### 5. Audio tracks are hardcoded
**File:** `src/core/Engine.ts:371-391` — `_initAudioControls()`
```ts
case "1": this._audio.loadTrack("assets/track1.wav");
case "2": this._audio.loadTrack("assets/track2.wav");
// Auto-plays track1 on boot
this._audio.loadTrack("assets/track1.wav");
```
Track paths are literally hardcoded strings in an event listener. There is no track list, playlist, or configurability. The engine should load audio from the scene descriptor.

### 6. Keyboard shortcuts are hardcoded
**File:** `src/core/Engine.ts:398-447` — `_initEffectShortcuts()`
- Keys `1`/`2`/`3`/`O` for audio control
- Key `a`/`A` for blur toggle
- `Ctrl+1..5` for effect toggling
- `Shift+I` for inspector
- Toggle-on intensity hardcoded to `0.7`

These should be a configurable input map, not inline `switch` statements in the engine constructor. A release build shouldn't even have an inspector keybind.

### 7. No scene descriptor exists
There is **zero mechanism** to describe a level in data. `main.ts` boots with no parameters:
```ts
await GameEngine.Create("renderCanvas");
```
Every modern engine (Unity scenes, Godot .tscn, Unreal .umap) defines scenes as data that the engine loads. Here, the "scene" *is* the engine constructor.

---

## 🟠 High: Design Issues

### 8. Engine is a God Object
`GameEngine` owns and directly creates everything: `Engine`, `Scene`, `World`, 4 services, 6 systems, environment loader, player entity, keyboard handlers, resize handler, render loop, XR init, post-process activator, initial segment loader. ~380 lines of private methods handle concerns it shouldn't own.

Adding a new system or service requires modifying the engine class. This violates the Open/Closed principle — the engine should accept systems and services rather than constructing them.

### 9. No dependency injection or plugin architecture
**File:** `src/core/Engine.ts:213-227` — `_initSystems()`
```ts
this._systems = [
  new MovementSystem(this._world, this._input),
  new CameraSystem(this._world),
  new LightDrainSystem(this._world),
  new LevelStreamingSystem(this._world, this._environment),
  new XRCameraSyncSystem(this._world, this._xr),
  new PostProcessSystem(this._world, this._postProcess, this._audio),
];
```
Systems are instantiated inside the engine with `new` and specific constructor arguments. There is no way to register systems from outside, swap one implementation for another, or configure system ordering without editing engine code.

### 10. Mixed ECS and direct manipulation (two sources of truth)
**File:** `src/core/Engine.ts:399-447` — `_initEffectShortcuts()`
```ts
// Writes directly to PostProcessService
this._postProcess.setIntensity(name, next);
// ...then separately syncs to ECS component
pipe.tranceIntensity = 0;
pipe.chromaticIntensity = 0;
// etc.
```
The `PostProcessPipeline` ECS component is not the source of truth — it's a mirror that gets manually synced whenever the service is touched directly. Either the ECS should drive post-process state (systems read components → write to service), or the service should own state directly. Having both paths creates inconsistency.

### 11. `PostProcessSystem` dual-mode is fragile
The system has two modes:
1. **Pipeline mode:** reads one `PostProcessPipeline` component, sets all 5 intensities
2. **Component mode:** queries individual effect components, takes **max** intensity per type

Fallback logic that does per-effect max-aggregation across entities adds complexity and non-obvious behavior. There should be one canonical way to drive post-process effects.

---

## 🟡 Medium: Architecture Smells

### 12. `Environment` hardcodes GLB path and extension
**File:** `src/entities/Environment.ts:31`
```ts
ImportMeshAsync(`assets/${name}.glb`, this._scene);
```
The `assets/` prefix and `.glb` extension are hardcoded. No support for different asset roots, alternative formats, or bundle configurations.

### 13. `Environment` applies uniform physics to all meshes
**File:** `src/entities/Environment.ts:43-57`
```ts
new PhysicsAggregate(mesh, PhysicsShapeType.MESH, {
  mass: 0, friction: 0.5, restitution: 0
}, this._scene);
```
Every mesh in every GLB gets a mesh collider with identical parameters. There is no way for a level asset to specify which meshes get physics, what shape type they use, or what their physical properties are. This is wasteful (mesh colliders are expensive) and inflexible.

### 14. Legacy files still exist
Files listed as legacy/deprecated remain in the tree:
- `entities/Player.ts`
- `entities/LevelManager.ts`
- `services/PostProcessManager.ts`
- `services/ShaderService.ts`
- `shaders/trance.vert.glsl` — no longer used (Babylon.js uses its own `postprocess` vertex shader)
- `shaders/trancePost.frag.glsl`
- `shaders/chromatic.frag.glsl`
- `shaders/pulse.frag.glsl`
- `shaders/kaleidoscope.frag.glsl`
- `shaders/invert.frag.glsl`

Dead code invites accidental imports and confuses contributors.

### 15. Dead torch light code
**File:** `src/entities/Environment.ts:60-74` — A full block of commented-out torch light logic with Romanian messages. Either ship the feature or remove the code.

### 16. Mixed languages
Romanian strings (`"Eroare la crearea colliderului"`, `"Încarcă un modul de nivel"`, `"Adăugat lumină pentru torța"`) mixed with English everywhere else. Pick one language for consistency.

### 17. O(n²) query in level streaming
**File:** `src/ecs/systems/LevelStreamingSystem.ts:60-64`
```ts
for (let i = start; i <= end; i++) {
  const corridors = this._world.queryComponents(Corridor);  // ← re-queried every iteration
  const alreadySpawned = corridors.some(/* ... */);
}
```
`queryComponents(Corridor)` is called inside the spawn loop on every iteration. Should be queried once before the loop. The despawn pass makes a third query. Cache the result.

### 18. `deterministicLockstep` is wrong for single-player
**File:** `src/core/Engine.ts:70`
```ts
this._engine = new Engine(this._canvas, true, {
  deterministicLockstep: true,
});
```
`deterministicLockstep` is a multiplayer feature that synchronizes game state across clients. This is a single-player experience. It adds unnecessary latency and complexity.

### 19. No error handling for missing assets
If `assets/coridor0.glb` or `assets/track1.wav` doesn't exist, the user gets a console error at best. The engine doesn't handle missing/corrupt assets gracefully — no fallback, no user-facing message, no retry.

### 20. Render loop starts before XR is ready
**Bootstrap flow** — `_startRenderLoop()` fires before `_initXR()`. The comment in code explains: *"MUST start before XR — XR init can hang waiting for interaction."* This is a symptom of poor initialization ordering, not a proper solution. XR-dependent systems will run before XR is available, wasting frames on no-ops.

---

## ✅ Fixed

### 21. ~~PostProcess causes black screen~~
**Fixed 2026-05-23.** Root cause: the custom fragment shader used the varying name `vUv`, but Babylon.js' built-in PostProcess vertex shader outputs `vUV` (capital V). The varying names didn't match → WebGL linker error → black screen. Fix: renamed `vUv` to `vUV` in `tranceUber.frag.glsl`, removed the custom vertex shader override (Babylon.js' default is correct).

### 22. ~~Player spawns before world loads → falls through floor~~
**Fixed 2026-05-23.** `_spawnPlayer()` ran before `LevelStreamingSystem` could load corridor floor meshes. The player physics body (mass 80, gravity -9.81) would fall through empty space. Fix: added `_loadInitialSegment()` which loads corridor segments -3..3 before the player entity is created.

---

## Summary

| Category | Count | Core problem |
|----------|-------|-------------|
| 🔴 Critical | 7 | Engine hardcodes scene data — should load scene descriptors |
| 🟠 High | 4 | God object, no DI/plugins, two sources of truth |
| 🟡 Medium | 9 | Hardcoded paths, dead code, performance, config mistakes |
| ✅ Fixed | 2 | PostProcess black screen, player-through-floor |
| **Total open** | **20** | |

**Root cause:** `GameEngine` was designed as a game, not an engine. The ECS architecture is technically sound, but it's trapped inside a monolithic constructor that owns everything and hardcodes every decision. The fix is to separate **engine** (boot runtime + ECS, load scene descriptor, run systems) from **scene data** (JSON/YAML describing entities, components, systems, assets) and **game config** (input bindings, audio playlists).
