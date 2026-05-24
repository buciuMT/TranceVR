import { Vector3 } from "@babylonjs/core";
import { World } from "../World";
import { System } from "../System";
import { InputManager } from "../../core/InputManager";
import { Player, Transform, Physics, Camera } from "../components";

/**
 * Reads WASD keyboard input and sets linear velocity on the player's physics body.
 *
 * Query: Player + Transform + Camera + Physics
 */
export class MovementSystem extends System {
  private _input: InputManager;

  constructor(world: World, input: InputManager) {
    super(world);
    this._input = input;
  }

  update(_dt: number): void {
    const entities = this._world.queryComponents(
      Player, Transform, Camera, Physics,
    );

    for (const { components } of entities) {
      const [player, , cam, phys] = components;
      const body = phys.aggregate.body;

      const forward = cam.camera.getDirection(Vector3.Forward());
      forward.y = 0;
      forward.normalize();

      const right = cam.camera.getDirection(Vector3.Right());
      right.y = 0;
      right.normalize();

      let dir = Vector3.Zero();
      if (this._input.isDown("w")) dir.addInPlace(forward);
      if (this._input.isDown("s")) dir.subtractInPlace(forward);
      if (this._input.isDown("a")) dir.subtractInPlace(right);
      if (this._input.isDown("d")) dir.addInPlace(right);

      if (dir.length() > 0) {
        dir.normalize().scaleInPlace(player.moveSpeed);
        const vel = body.getLinearVelocity();
        body.setLinearVelocity(new Vector3(dir.x, vel.y, dir.z));
      } else {
        const vel = body.getLinearVelocity();
        body.setLinearVelocity(new Vector3(0, vel.y, 0));
      }
    }
  }
}
