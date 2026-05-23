import { World } from "./World";

/**
 * Abstract base for all Systems.
 * A System reads components from the World and mutates them each frame.
 */
export abstract class System {
  protected _world: World;

  constructor(world: World) {
    this._world = world;
  }

  /** Called once per frame. Override in subclasses. */
  abstract update(deltaTime: number): void;
}
