import { Vector3, AbstractMesh } from "@babylonjs/core";
import { Environment } from "./Environment";

export class LevelManager {
  private _environment: Environment;

  private _segments: Map<number, AbstractMesh[]> = new Map();
  private _segmentLength = 16; // Lungimea aproximativă a unui coridor
  private _renderDistance = 3; // Câte segmente să randeze în față și în spate

  private _currentSegmentIndex: number = -999; // Forțăm update-ul la prima rulare
  private _isUpdating = false;
  private _availableModuleTypes = [
    "coridor0",
    "coridor1",
    "coridor2",
    "coridor3",
  ];

  constructor(environment: Environment) {
    this._environment = environment;
  }

  /**
   * Actualizează segmentele în funcție de poziția jucătorului.
   */
  public update(playerPosition: Vector3): void {
    const playerZ = playerPosition.z;
    const segmentIndex = Math.floor(
      (playerZ + this._segmentLength / 2) / this._segmentLength,
    );

    if (segmentIndex !== this._currentSegmentIndex && !this._isUpdating) {
      this._currentSegmentIndex = segmentIndex;
      this._manageSegments();
    }
  }

  /**
   * Încarcă segmentele necesare și le șterge pe cele prea îndepărtate.
   */
  private async _manageSegments(): Promise<void> {
    this._isUpdating = true;
    const start = this._currentSegmentIndex - this._renderDistance;
    const end = this._currentSegmentIndex + this._renderDistance;

    // 1. Spawning segmente noi
    for (let i = start; i <= end; i++) {
      if (!this._segments.has(i)) {
        // Alegem un modul random (sau putem face logică mai complexă aici)
        const randomType =
          this._availableModuleTypes[
            Math.abs(i) % this._availableModuleTypes.length
          ];

        // Creăm un placeholder în map ca să nu spawnăm de mai multe ori în timp ce se încarcă asincron
        this._segments.set(i, []);

        const meshes = await this._environment.loadLevel(randomType);

        // Poziționăm toate mesh-urile segmentului
        const offset = i * this._segmentLength;
        meshes.forEach((m) => {
          // Dacă mesh-ul are un părinte care e tot din acest import, nu îi modificăm poziția direct
          // GLTF-urile au de obicei un root node.
          if (!m.parent) {
            m.position.z += offset;
          }
        });

        this._segments.set(i, meshes);
        console.log(`Segment spawned la index ${i} (Z: ${offset})`);
      }
    }

    // 2. Cleanup segmente vechi
    for (const [index, meshes] of this._segments.entries()) {
      if (index < start || index > end) {
        meshes.forEach((m) => m.dispose());
        this._segments.delete(index);
        console.log(`Segment disposed la index ${index}`);
      }
    }

    this._isUpdating = false;
  }
}
