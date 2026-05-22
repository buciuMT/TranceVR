import {
  Scene,
  AbstractMesh,
  Mesh,
  ImportMeshAsync,
  PhysicsAggregate,
  PhysicsShapeType,
  Vector3,
} from "@babylonjs/core";

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public get scene(): Scene {
    return this._scene;
  }

  /**
   * Încarcă un modul de nivel și îi configurează coliziunile.
   * @param name Numele fișierului .glb
   * @param positionOffset Poziția unde trebuie plasat segmentul
   */
  public async loadLevel(name: string, positionOffset: Vector3 = Vector3.Zero()): Promise<AbstractMesh[]> {
    const result = await ImportMeshAsync(`assets/${name}.glb`, this._scene);

    // 1. Poziționăm root-ul (sau toate mesh-urile fără părinte)
    result.meshes.forEach((m) => {
      if (!m.parent) {
        m.position.addInPlace(positionOffset);
      }
    });

    // 2. Generăm coliziuni după ce am poziționat obiectele
    result.meshes.forEach((mesh) => {
      // Verificăm dacă mesh-ul are geometrie (să nu fie TransformNode sau Root)
      if (mesh instanceof Mesh && mesh.geometry) {
        try {
          // Forțăm calcularea matricii de lume pentru a ne asigura că physics shape-ul e la locul lui
          mesh.computeWorldMatrix(true);

          // Folosim MESH pentru obiecte concave (coridoare) 
          // Havok creează automat un Static Mesh Collider dacă mass e 0
          new PhysicsAggregate(
            mesh,
            PhysicsShapeType.MESH,
            { mass: 0, friction: 0.5, restitution: 0 },
            this._scene,
          );
        } catch (e) {
          console.error(`Eroare la crearea colliderului pentru ${mesh.name}:`, e);
        }
      }
    });

    console.log(`[Environment] Încărcat ${name} la ${positionOffset.z}. Meshes: ${result.meshes.length}`);
    return result.meshes;
  }
}
