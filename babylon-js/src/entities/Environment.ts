import {
  Scene,
  AbstractMesh,
  Mesh,
  ImportMeshAsync,
  PhysicsAggregate,
  PhysicsShapeType,
  Vector3,
  PointLight,
  Color3,
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
  public async loadLevel(
    name: string,
    positionOffset: Vector3 = Vector3.Zero(),
  ): Promise<AbstractMesh[]> {
    const result = await ImportMeshAsync(`assets/${name}.glb`, this._scene);

    // 1. Poziționăm root-ul (sau toate mesh-urile fără părinte)
    result.meshes.forEach((m) => {
      if (!m.parent) {
        m.position.addInPlace(positionOffset);
      }
    });

    // 2. Generăm coliziuni și adăugăm lumini pentru torțe
    result.meshes.forEach((mesh) => {
      // Configurare Coliziuni (Physics)
      if (mesh instanceof Mesh && mesh.geometry) {
        try {
          mesh.computeWorldMatrix(true);
          new PhysicsAggregate(
            mesh,
            PhysicsShapeType.MESH,
            { mass: 0, friction: 0.5, restitution: 0 },
            this._scene,
          );
        } catch (e) {
          console.error(
            `Eroare la crearea colliderului pentru ${mesh.name}:`,
            e,
          );
        }
      }

      // // Configurare Lumini Torțe
      // if (mesh.name.startsWith("torch_lit")) {
      //   const light = new PointLight(
      //     "light_" + mesh.name + "_" + Math.random(),
      //     new Vector3(0, 0.6, 0),
      //     this._scene,
      //   );
      //   light.parent = mesh;
      //   light.intensity = 5;
      //   light.range = 10;
      //   light.diffuse = new Color3(1, 0.6, 0.3); // Portocaliu cald
      //   console.log(`[Environment] Adăugat lumină pentru torța: ${mesh.name}`);
      // }
    });

    console.log(
      `[Environment] Încărcat ${name} la ${positionOffset.z}. Meshes: ${result.meshes.length}`,
    );
    return result.meshes;
  }
}
