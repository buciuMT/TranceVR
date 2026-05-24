import { World } from "./World";

/**
 * Abstract base for all Systems.
 * A System reads components from the World and mutates them each frame.
 */
export abstract class System {
  protected _world: World;

  /** Toggle to pause/resume this system. Checked before every update(). */
  public enabled = true;

  constructor(world: World) {
    this._world = world;
  }

  /** Called once per frame. Override in subclasses. */
  abstract update(deltaTime: number): void;
}
