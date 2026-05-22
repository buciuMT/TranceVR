import { Scene, SceneLoader, AbstractMesh } from "@babylonjs/core";

export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public async loadLevel(name: string): Promise<AbstractMesh[]> {
        const result = await SceneLoader.ImportMeshAsync("", "assets/", `${name}.glb`, this._scene);
        return result.meshes;
    }
}
