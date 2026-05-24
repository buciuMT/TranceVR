import { Camera, Effect, Matrix, PostProcess, Scene } from "@babylonjs/core";
import fractalPostFragment from "../shaders/fractalPost.frag.glsl?raw";

const UNIFORMS = ["uTime", "uSpikiness", "uThickness", "uCameraPos", "uInverseViewProj"] as const;

export class FractalPostProcessService {
  private _scene: Scene;
  private _postProcess: PostProcess | null = null;
  private _camera: Camera | null = null;

  private _time = 0;
  private _spikiness = 0.5;
  private _thickness = 0.5;

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
      null,
      1.0,
      camera,
    );

    this._postProcess.onApply = (effect: Effect) => {
      // Use activeCamera so each stereo eye gets its own view matrix
      const cam = this._scene.activeCamera ?? this._camera!;

      effect.setFloat("uTime", this._time);
      effect.setFloat("uSpikiness", this._spikiness);
      effect.setFloat("uThickness", this._thickness);
      effect.setVector3("uCameraPos", cam.globalPosition);

      const invVP = Matrix.Invert(
        cam.getViewMatrix().multiply(cam.getProjectionMatrix()),
      );
      effect.setMatrix("uInverseViewProj", invVP);
    };

    console.log(`[FractalPostProcessService] Attached to camera: ${camera.name}`);
  }

  public detach(): void {
    this._dispose();
    this._camera = null;
  }

  public setSpikiness(v: number): void { this._spikiness = Math.max(0, Math.min(1, v)); }
  public setThickness(v: number): void { this._thickness = Math.max(0, Math.min(1, v)); }

  private _dispose(): void {
    if (this._postProcess) {
      this._postProcess.dispose();
      this._postProcess = null;
    }
  }
}
