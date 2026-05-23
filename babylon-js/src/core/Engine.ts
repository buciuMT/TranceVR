import { Engine, Scene, Vector3, HavokPlugin } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";

export class GameEngine {
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene: Scene;

  private constructor(canvasId: string) {
    this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this._engine = new Engine(this._canvas, true, {
      deterministicLockstep: true, // util pentru fizica Havok ulterior
    });
    this._engine.disableUniformBuffers = true; // ACEASTA ESTE REZOLVAREA DIRECTĂ
    this._scene = new Scene(this._engine);
  }

  public static async Create(canvasId: string): Promise<GameEngine> {
    const gameInstance = new GameEngine(canvasId);

    // Initializare Fizica Havok
    const havokInstance = await HavokPhysics();
    const havokPlugin = new HavokPlugin(true, havokInstance);
    gameInstance._scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

    gameInstance._handleResize();
    gameInstance._startRenderLoop();

    return gameInstance;
  }

  public get scene(): Scene {
    return this._scene;
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  private _handleResize(): void {
    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }

  private _startRenderLoop(): void {
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
}
