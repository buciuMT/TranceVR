import type { Entity } from "./Entity";

/**
 * Base interface for all components.
 * Components are plain data — no methods, no logic.
 * Every component must reference the entity it belongs to.
 */
export interface Component {
  entity: Entity;
}

/** Constructor type for a component class (used as a key in the World). */
export type ComponentType<T extends Component = Component> = new (...args: any[]) => T;
