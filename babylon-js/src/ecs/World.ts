import type { Entity } from "./Entity";
import type { Component, ComponentType } from "./Component";

/**
 * ECS container.
 *
 * Stores entities as numeric IDs and components as type-indexed maps.
 * Systems query for entities with specific component sets.
 *
 * Usage:
 *   const world = new World();
 *   const e = world.createEntity();
 *   world.add(e, new Transform({ entity: e, position: Vector3.Zero() }));
 *   world.get(e, Transform);  // → Transform component
 *   world.query(Transform, Player);  // → entities with both
 */
export class World {
  private _nextEntity: Entity = 1;

  /** componentType → Map<Entity, Component> */
  private _store = new Map<ComponentType, Map<Entity, Component>>();

  // ---- Entity lifecycle ---------------------------------------------------

  /** Create a new empty entity. Returns its numeric ID. */
  createEntity(): Entity {
    return this._nextEntity++;
  }

  /** Remove an entity and all its components. */
  destroyEntity(entity: Entity): void {
    for (const [, map] of this._store) {
      map.delete(entity);
    }
  }

  // ---- Component CRUD -----------------------------------------------------

  /** Add a component to an entity. */
  add<T extends Component>(component: T): void {
    const ct = component.constructor as ComponentType<T>;
    if (!this._store.has(ct)) {
      this._store.set(ct, new Map());
    }
    this._store.get(ct)!.set(component.entity, component);
  }

  /** Get a component of type T from an entity. Returns undefined if not found. */
  get<T extends Component>(entity: Entity, type: ComponentType<T>): T | undefined {
    return this._store.get(type)?.get(entity) as T | undefined;
  }

  /** Check whether an entity has a specific component type. */
  has(entity: Entity, type: ComponentType): boolean {
    return this._store.get(type)?.has(entity) ?? false;
  }

  /** Remove a component of a given type from an entity. */
  remove(entity: Entity, type: ComponentType): void {
    this._store.get(type)?.delete(entity);
  }

  // ---- Queries ------------------------------------------------------------

  /**
   * Find all entities that have ALL of the given component types.
   * Returns an array of entities (no components — use world.get() to fetch them).
   */
  query(...types: ComponentType[]): Entity[] {
    if (types.length === 0) return [];

    // Start with the smallest map for performance
    let smallest: { type: ComponentType; entities: Entity[] } | null = null;

    for (const ct of types) {
      const map = this._store.get(ct);
      if (!map || map.size === 0) return []; // One type missing → no match
      const entities = Array.from(map.keys());
      if (!smallest || entities.length < smallest.entities.length) {
        smallest = { type: ct, entities };
      }
    }

    // Filter the smallest set against all other types
    let result = smallest!.entities;

    for (const ct of types) {
      if (ct === smallest!.type) continue;
      const map = this._store.get(ct)!;
      result = result.filter((e) => map.has(e));
    }

    return result;
  }

  /** Get the full set of entities that have all queried types, paired with their components. */
  queryComponents<T extends Component[]>(
    ...types: { [K in keyof T]: ComponentType<T[K]> }
  ): Array<{ entity: Entity; components: T }> {
    const entities = this.query(...types);
    return entities.map((entity) => {
      const components = types.map((ct) => this.get(entity, ct)!) as T;
      return { entity, components };
    });
  }
}
