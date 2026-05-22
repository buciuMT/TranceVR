import { Scene, AbstractMesh, ImportMeshAsync, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public async loadLevel(name: string): Promise<AbstractMesh[]> {
    const result = await ImportMeshAsync(`assets/${name}.glb`, this._scene);
    
    result.meshes.forEach(mesh => {
      // Aplicăm fizică doar pentru mesh-urile care au geometrie (nu și pentru transform nodes/empty-uri)
      if (mesh.getClassName() === "Mesh" || mesh.getClassName() === "InstancedMesh") {
        new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0 }, this._scene);
        console.log(`Fizică aplicată pentru: ${mesh.name}`);
      }
    });

    return result.meshes;
  }
}
