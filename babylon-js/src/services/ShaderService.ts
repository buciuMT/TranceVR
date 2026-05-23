import { Effect, PostProcess, Scene, Color3, Camera } from "@babylonjs/core";

import tranceVertex from "../shaders/trance.vert.glsl?raw";
import tranceFragment from "../shaders/trancePost.frag.glsl?raw";

/**
 * Full-screen PostProcess with uniforms settable from TypeScript.
 * Automatically switches camera when entering/exiting XR.
 */
export class ShaderService {
  private _scene: Scene;
  private _postProcess: PostProcess | null = null;
  private _time = 0;

  private _intensity = 0.0;
  private _hueShift = 0.0;
  private _waveStrength = 0.0;
  private _audioReactivity = 0.0;
  private _colorTint = new Color3(1, 1, 1);

  constructor(scene: Scene) {
    this._scene = scene;

    // Register shaders globally (once)
    if (!Effect.ShadersStore["trancePostVertexShader"]) {
      Effect.ShadersStore["trancePostVertexShader"] = tranceVertex;
    }
    if (!Effect.ShadersStore["trancePostFragmentShader"]) {
      Effect.ShadersStore["trancePostFragmentShader"] = tranceFragment;
    }

    // Time + uniform push loop
    this._scene.onBeforeRenderObservable.add(() => {
      this._time += scene.getEngine().getDeltaTime() / 1000;
      if (this._postProcess) {
        this._postProcess.onApply = (effect: Effect) => {
          effect.setFloat("time", this._time);
          effect.setFloat("intensity", this._intensity);
          effect.setFloat("hueShift", this._hueShift);
          effect.setFloat("waveStrength", this._waveStrength);
          effect.setFloat("audioReactivity", this._audioReactivity);
          effect.setColor3("colorTint", this._colorTint);
        };
      }
    });

    console.log("[ShaderService] Gata. Apelează attachToCamera() pentru a activa.");
  }

  /**
   * Attach (or reattach) the post-process to a specific camera.
   * Pass the XR camera for VR, or the default camera for non-VR.
   */
  public attachToCamera(camera: Camera): void {
    if (this._postProcess) {
      this._postProcess.dispose();
    }

    this._postProcess = new PostProcess(
      "trancePost",
      "trancePost",
      ["time", "intensity", "hueShift", "waveStrength", "audioReactivity", "colorTint"],
      null,
      1.0,
      camera,
    );

    console.log(`[ShaderService] Atașat la camera: ${camera.name}`);
  }

  /** Detach post-process (e.g. when switching cameras) */
  public detach(): void {
    if (this._postProcess) {
      this._postProcess.dispose();
      this._postProcess = null;
    }
  }

  // --- Public uniform API ---

  public set intensity(value: number) { this._intensity = value; }
  public get intensity(): number { return this._intensity; }

  public set hueShift(value: number) { this._hueShift = value; }
  public get hueShift(): number { return this._hueShift; }

  public set waveStrength(value: number) { this._waveStrength = value; }
  public get waveStrength(): number { return this._waveStrength; }

  public setAudioReactivity(value: number): void {
    this._audioReactivity = Math.max(0, Math.min(255, value));
  }

  public set colorTint(color: Color3) { this._colorTint = color; }
  public get colorTint(): Color3 { return this._colorTint; }

  public get postProcess(): PostProcess | null { return this._postProcess; }
}
