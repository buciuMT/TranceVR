import { Camera, Effect, Matrix, PostProcess, Scene, Texture } from "@babylonjs/core";
import fractalPostFragment from "../shaders/fractalPost.frag.glsl?raw";
import type { AudioAnalysis } from "./AudioService";

const UNIFORMS = ["uTime", "uSpikiness", "uThickness", "uScale", "uColor", "uWeirdness", "uEnvMapAvailable", "uCameraPos", "uInverseViewProj", "uBass", "uTreble", "uHighTone", "uFilterType", "uKick", "uSnare"] as const;
const SAMPLERS = ["envSampler"] as const;

export class FractalPostProcessService {
  private _scene: Scene;
  private _postProcess: PostProcess | null = null;
  private _camera: Camera | null = null;

  private _time = 0;
  private _spikiness = 0.5;
  private _thickness = 0.5;
  private _scale = 1.0;
  private _color = { r: 1, g: 1, b: 1 };
  private _weirdness = 0.0;
  private _envTexture: Texture | null = null;
  private _envReady = false;

  private _bass = 0;
  private _treble = 0;
  private _highTone = 0;
  private _filterType = 0;
  private _kick = 0;
  private _snare = 0;

  constructor(scene: Scene) {
    this._scene = scene;

    if (!Effect.ShadersStore["fractalPostFragmentShader"]) {
      Effect.ShadersStore["fractalPostFragmentShader"] = fractalPostFragment;
    }

    scene.onBeforeRenderObservable.add(() => {
      this._time += scene.getEngine().getDeltaTime() / 1000;
    });
  }

  public attachToCamera(camera: Camera): void {
    if (this._camera === camera) return;
    this._dispose();
    this._camera = camera;

    this._postProcess = new PostProcess(
      "fractalPost",
      "fractalPost",
      [...UNIFORMS],
      [...SAMPLERS],
      1.0,
      camera,
    );

    this._postProcess.onApply = (effect: Effect) => {
      // Use activeCamera so each stereo eye gets its own view matrix
      const cam = this._scene.activeCamera ?? this._camera!;
      console.log(this._treble);
      effect.setFloat("uTime", this._time);
      effect.setFloat("uSpikiness", this._spikiness);
      effect.setFloat("uThickness", this._thickness);
      effect.setFloat("uScale", this._scale);
      effect.setFloat3("uColor", this._color.r, this._color.g, this._color.b);
      effect.setFloat("uWeirdness", this._weirdness);
      effect.setFloat("uEnvMapAvailable", this._envReady ? 1 : 0);
      if (this._envReady && this._envTexture) {
        effect.setTexture("envSampler", this._envTexture);
      }
      effect.setVector3("uCameraPos", cam.globalPosition);
      effect.setFloat("uBass", this._bass);
      effect.setFloat("uTreble", this._treble);
      effect.setFloat("uHighTone", this._highTone);
      effect.setFloat("uFilterType", this._filterType);
      effect.setFloat("uKick", this._kick);
      effect.setFloat("uSnare", this._snare);

      const invVP = Matrix.Invert(
        cam.getViewMatrix().multiply(cam.getProjectionMatrix()),
      );
      effect.setMatrix("uInverseViewProj", invVP);
    };

    console.log(`[FractalPostProcessService] Attached to camera: ${camera.name}`);
  }

  public loadEnvMap(url: string): void {
    this._envReady = false;
    if (this._envTexture) { this._envTexture.dispose(); }
    this._envTexture = new Texture(url, this._scene);
    this._envTexture.onLoadObservable.addOnce(() => {
      this._envReady = true;
      console.log("[FractalPostProcessService] Env map loaded.");
    });
  }

  public detach(): void {
    this._dispose();
    if (this._envTexture) { this._envTexture.dispose(); this._envTexture = null; }
    this._envReady = false;
    this._camera = null;
  }

  public setSpikiness(v: number): void { this._spikiness = Math.max(0, Math.min(1, v)); }
  public setThickness(v: number): void { this._thickness = Math.max(0, Math.min(1, v)); }
  public setScale(v: number): void { this._scale = v; }
  public setColor(r: number, g: number, b: number): void { this._color = { r, g, b }; }
  public setWeirdness(v: number): void { this._weirdness = v; }

  public setAudio(a: AudioAnalysis): void {
    this._bass = a.bass;
    this._treble = a.treble;
    this._highTone = a.highTone;
    this._filterType = a.filterType === 'lowpass' ? 1 : a.filterType === 'highpass' ? -1 : 0;
    this._kick = a.kick;
    this._snare = a.snare;
  }

  private _dispose(): void {
    if (this._postProcess) {
      this._postProcess.dispose();
      this._postProcess = null;
    }
  }
}
