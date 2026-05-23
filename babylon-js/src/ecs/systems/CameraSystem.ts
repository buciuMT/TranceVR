import { System } from "../System";
import { World } from "../World";
import { Transform } from "../components/Transform";
import { Physics } from "../components/Physics";
import { Player } from "../components/Player";

/**
 * Syncs Transform.position from the physics body (authoritative source).
 * Runs after physics has stepped.
 *
 * Query: Player + Transform + Physics
 */
export class CameraSystem extends System {
  constructor(world: World) {
    super(world);
  }

  update(_dt: number): void {
    const entities = this._world.queryComponents(Player, Transform, Physics);

    for (const { components } of entities) {
      const [, transform, phys] = components;
      const mesh = phys.aggregate.transformNode;
      if (mesh) {
        transform.position.copyFrom(mesh.position);
        transform.rotation.copyFrom(mesh.rotation);
      }
    }
  }
}
