import { Scene, AbstractMesh, ImportMeshAsync, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public async loadLevel(name: string): Promise<AbstractMesh[]> {
    const result = await ImportMeshAsync(`assets/${name}.glb`, this._scene);
    
    // Debug: Să vedem câte mesh-uri am importat
    console.log(`Importate ${result.meshes.length} noduri pentru ${name}`);

    result.meshes.forEach(mesh => {
      // Verificăm dacă mesh-ul are geometrie și nu e doar un root node
      if (mesh.getClassName() === "Mesh" && (mesh as any).geometry) {
        try {
          // Folosim CONVEX_HULL pentru tiles - e mult mai stabil și performant
          new PhysicsAggregate(mesh, PhysicsShapeType.CONVEX_HULL, { mass: 0, friction: 0.5 }, this._scene);
        } catch (e) {
          console.error(`Eroare la collider ${mesh.name}:`, e);
        }
      }
    });

    return result.meshes;
  }
}
