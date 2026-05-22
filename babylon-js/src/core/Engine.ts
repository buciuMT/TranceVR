import { Engine, Scene } from "@babylonjs/core";

export class GameEngine {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;

    constructor(canvasId: string) {
        this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        this._handleResize();
        this._startRenderLoop();
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
