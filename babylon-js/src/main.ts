import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight } from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // Activează suportul nativ pentru GLB/GLTF

class App {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    constructor() {
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);

        this.initGame();
    }

    private initGame(): void {
        // 1. Configurare Cameră (Poziționată pe orbită)
        const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), this.scene);
        camera.attachControl(this.canvas, true);

        // 2. Configurare Lumină ambientală
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // 3. Încarcă coridoarele tale din folderul public/assets/
        this.loadEnvironment();

        // 4. Pornirea buclei principale de randare (Render Loop)
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        // Rezolvă problema de redimensionare a ferestrei în Linux/Browser
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private loadEnvironment(): void {
        // Aici pui logica ta de generare din Blender:
        // SceneLoader.ImportMesh("", "assets/", "coridoare.glb", this.scene, (meshes) => { ... });
        console.log("Sistemul Babylon.js a pornit pe cod pur!");
    }
}

// Lansează aplicația
new App();
