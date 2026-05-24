import type { GameEngine } from "../core/Engine";

/**
 * Abstract base for all game scenes.
 *
 * A Scene owns the "what" — what entities exist, what keyboard shortcuts
 * are active, what XR callbacks fire, what audio plays.
 *
 * The Engine owns the "how" — Babylon infrastructure, ECS world, services,
 * systems, render loop, and the player factory.
 */
export abstract class Scene {
  /**
   * Spawn entities, wire callbacks, load audio.
   * Called by engine.loadScene() after the engine and all services are ready.
   */
  abstract init(engine: GameEngine): void | Promise<void>;

  /**
   * Tear down: dispose all entities created by this scene, remove listeners.
   * Called by engine.loadScene() before switching to a new scene.
   */
  abstract unload(engine: GameEngine): void;
}
