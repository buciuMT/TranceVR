import { Camera, Color3, Effect, PostProcess, Scene, BlurPostProcess, Vector2 } from "@babylonjs/core";

// Vertex + fragment shaders as raw strings (Vite ?raw imports)
import tranceUberFragment from "../shaders/tranceUber.frag.glsl?raw";

export type EffectName = "trance" | "chromatic" | "pulse" | "kaleidoscope" | "invert";

const EFFECT_NAMES: EffectName[] = ["trance", "chromatic", "pulse", "kaleidoscope", "invert"];

/**
 * Manages a single full‑screen PostProcess with a combined "uber" shader.
 * All 5 effects run in ONE GPU pass via per‑effect intensity uniforms.
 *
 * Camera switching (flat ↔ XR) is trivial: dispose old, create new on new camera.
 * External code can set intensities directly, or they can be driven by an ECS
 * PostProcessSystem that reads effect components from entities.
 */
export class PostProcessService {
  private _scene: Scene;
  private _postProcess: PostProcess | null = null;
  private _blurH: BlurPostProcess | null = null;
  private _blurV: BlurPostProcess | null = null;
  private _camera: Camera | null = null;
  private _time = 0;
  private _blurEnabled = false;

  /** Uniform values cached here — survive PostProcess disposal/recreation. */
  private _values: Record<string, number | Color3> = {};

  constructor(scene: Scene) {
    this._scene = scene;

    // Register fragment shader in ShaderStore — Babylon.js uses its own
    // built-in `postprocess` vertex shader which provides the standard `vUV` varying.
    if (!Effect.ShadersStore["tranceUberFragmentShader"]) {
      Effect.ShadersStore["tranceUberFragmentShader"] = tranceUberFragment;
    }

    // Default uniform values
    this._values["uTime"] = 0;
    for (const name of EFFECT_NAMES) {
      this._values[`u${capitalize(name)}Intensity`] = 0;
    }
    this._values["uTranceHueShift"] = 0;
    this._values["uTranceWaveStrength"] = 0;
    this._values["uTranceAudioReactivity"] = 0;
    this._values["uTranceColorTint"] = new Color3(1, 1, 1);
    this._values["uPulseLevel"] = 0;

    // Advance time each frame
    this._scene.onBeforeRenderObservable.add(() => {
      this._time += this._scene.getEngine().getDeltaTime() / 1000;
      this._values["uTime"] = this._time;
    });

    console.log("[PostProcessService] Ready — call attachToCamera() to activate.");
  }

  // =========================================================================
  // Camera lifecycle
  // =========================================================================

  /** Attach (or re‑attach) the uber PostProcess to a given camera. */
  public attachToCamera(camera: Camera): void {
    if (this._camera === camera) return;

    // Dispose old
    this._disposePostProcesses();

    this._camera = camera;

    // All uniforms the shader expects
    const uniforms = [
      "uTime",
      "uTranceIntensity", "uChromaticIntensity", "uPulseIntensity",
      "uKaleidoscopeIntensity", "uInvertIntensity",
      "uTranceHueShift", "uTranceWaveStrength", "uTranceAudioReactivity",
      "uTranceColorTint",
      "uPulseLevel",
    ];

    this._postProcess = new PostProcess(
      "tranceUber",
      "tranceUber",
      uniforms,
      null,
      1.0,
      camera,
    );

    // Push uniform values every frame
    this._postProcess.onApply = (effect: Effect) => {
      for (const name of uniforms) {
        const val = this._values[name];
        if (val === undefined) continue;
        if (val instanceof Color3) {
          effect.setFloat3(name, val.r, val.g, val.b);
        } else {
          effect.setFloat(name, val as number);
        }
      }
    };

    console.log(`[PostProcessService] Attached to camera: ${camera.name}`);
  }

  /** Detach from current camera (dispose PostProcess). */
  public detach(): void {
    this._disposePostProcesses();
    this._camera = null;
  }

  private _disposePostProcesses(): void {
    if (this._blurH) { this._blurH.dispose(); this._blurH = null; }
    if (this._blurV) { this._blurV.dispose(); this._blurV = null; }
    if (this._postProcess) { this._postProcess.dispose(); this._postProcess = null; }
    this._blurEnabled = false;
  }

  // =========================================================================
  // Public uniform API
  // =========================================================================

  /** Get the current intensity of an effect (0–1). */
  public getIntensity(effect: EffectName): number {
    return (this._values[`u${capitalize(effect)}Intensity`] as number) ?? 0;
  }

  /** Set the intensity of an effect (clamped 0–1). */
  public setIntensity(effect: EffectName, value: number): void {
    this._values[`u${capitalize(effect)}Intensity`] = Math.max(0, Math.min(1, value));
  }

  /** Set a named uniform on a specific effect group. */
  public setUniform(effect: EffectName, uniform: string, value: number | Color3): void {
    const key = `u${capitalize(effect)}${capitalize(uniform)}`;
    this._values[key] = value;
  }

  /** Feed audio RMS into the shader (drives Trance audioReactivity + Pulse pulseLevel). */
  public updateAudio(rms: number): void {
    // Trance audioReactivity: raw 0–255 value
    this._values["uTranceAudioReactivity"] = rms;
    // Pulse level: normalised 0–1
    this._values["uPulseLevel"] = rms / 255;
  }

  /** Reset all intensities to 0 (disable all effects). */
  public disableAll(): void {
    for (const name of EFFECT_NAMES) {
      this.setIntensity(name, 0);
    }
  }

  // =========================================================================
  // Blur post process (toggled with 'a' key)
  // =========================================================================

  get blurEnabled(): boolean {
    return this._blurEnabled;
  }

  /** Toggle a two‑pass directional blur (horizontal + vertical). */
  public toggleBlur(kernelSize = 16): boolean {
    if (!this._camera) {
      console.warn("[PostProcessService] No camera attached — cannot toggle blur.");
      return false;
    }

    if (this._blurEnabled) {
      // Disable blur
      if (this._blurH) { this._blurH.dispose(); this._blurH = null; }
      if (this._blurV) { this._blurV.dispose(); this._blurV = null; }
      this._blurEnabled = false;
      console.log("[PostProcessService] Blur disabled.");
      return false;
    }

    // Enable blur — two passes for a smooth gaussian-like effect
    this._blurH = new BlurPostProcess(
      "blurHorizontal",
      new Vector2(1.0, 0),
      kernelSize,
      1.0,
      this._camera,
    );
    this._blurV = new BlurPostProcess(
      "blurVertical",
      new Vector2(0, 1.0),
      kernelSize,
      1.0,
      this._camera,
    );
    this._blurEnabled = true;
    console.log(`[PostProcessService] Blur enabled (kernel=${kernelSize}).`);
    return true;
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  get camera(): Camera | null {
    return this._camera;
  }

  get effectNames(): readonly EffectName[] {
    return EFFECT_NAMES;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
