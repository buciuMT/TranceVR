import { Vector3 } from "@babylonjs/core";
import { System } from "../System";
import { World } from "../World";
import { Player, Transform, Corridor } from "../components";
import { Environment } from "../../entities/Environment";

const SEGMENT_LENGTH = 16;
const RENDER_DISTANCE = 3;
const MODULE_TYPES = ["coridor0", "coridor1", "coridor2", "coridor3"];

/**
 * Spawns and despawns corridor segments around the player as they move.
 *
 * Query: Player + Transform         (to know where the player is)
 * Query: Corridor                   (to clean up old segments)
 */
export class LevelStreamingSystem extends System {
  private _environment: Environment;
  private _currentSegment = -999;
  private _isUpdating = false;

  constructor(world: World, environment: Environment) {
    super(world);
    this._environment = environment;
  }

  update(_dt: number): void {
    // Find player position
    const players = this._world.queryComponents(Player, Transform);
    if (players.length === 0) return;

    const playerTransform = players[0].components[1] as Transform;
    const playerZ = playerTransform.position.z;

    const segIdx = Math.floor((playerZ + SEGMENT_LENGTH / 2) / SEGMENT_LENGTH);
    if (segIdx !== this._currentSegment && !this._isUpdating) {
      this._currentSegment = segIdx;
      this._manageSegments();
    }
  }

  /** Get all floor meshes from active corridor entities (for VR teleportation). */
  getFloorMeshes(): import("@babylonjs/core").AbstractMesh[] {
    const corridors = this._world.queryComponents(Corridor);
    const floors: import("@babylonjs/core").AbstractMesh[] = [];
    for (const { components } of corridors) {
      const [corridor] = components;
      for (const mesh of corridor.meshes) {
        if (mesh.metadata?.isFloor) {
          floors.push(mesh);
        }
      }
    }
    return floors;
  }

  private async _manageSegments(): Promise<void> {
    this._isUpdating = true;
    const start = this._currentSegment - RENDER_DISTANCE;
    const end = this._currentSegment + RENDER_DISTANCE;

    // Spawn new segments — load all in parallel for speed
    const spawnPromises: Promise<void>[] = [];
    for (let i = start; i <= end; i++) {
      const corridors = this._world.queryComponents(Corridor);
      const alreadySpawned = corridors.some(
        ({ components: [corridor] }) => corridor.segmentIndex === i,
      );
      if (alreadySpawned) continue;

      const type = MODULE_TYPES[Math.abs(i) % MODULE_TYPES.length];
      const offset = i * SEGMENT_LENGTH;

      spawnPromises.push(
        this._environment
          .loadLevel(type, new Vector3(0, 0, offset))
          .then((meshes) => {
            const entity = this._world.createEntity();
            this._world.add(new Corridor({ entity, segmentIndex: i, meshes }));
            console.log(`[LevelStreaming] Spawned segment ${i} (Z: ${offset})`);
          })
          .catch((e) => {
            console.error(`[LevelStreaming] Failed to load segment ${i}:`, e);
          }),
      );
    }

    await Promise.allSettled(spawnPromises);

    // Despawn old segments
    const allCorridors = this._world.queryComponents(Corridor);
    for (const { entity, components } of allCorridors) {
      const [corridor] = components;
      if (corridor.segmentIndex < start || corridor.segmentIndex > end) {
        for (const mesh of corridor.meshes) {
          mesh.dispose();
        }
        this._world.destroyEntity(entity);
        console.log(`[LevelStreaming] Despawned segment ${corridor.segmentIndex}`);
      }
    }

    this._isUpdating = false;
  }
}
