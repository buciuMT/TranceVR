import type { Entity } from "../Entity";

/**
 * Multi-tag component for categorising entities.
 * Enables bulk queries for scene cleanup, filtering, etc.
 *
 * Usage:
 *   world.add(new Tags({ entity, values: ["player", "flashlight"] }));
 *   const comp = world.get(entity, Tags);
 *   comp.has("player");          // → true
 *   comp.add("vr");              // → now has "player", "flashlight", "vr"
 *   comp.remove("flashlight");   // → now has "player", "vr"
 */
export class Tags {
  entity: Entity;
  values: Set<string>;

  constructor(data: { entity: Entity; values: string[] }) {
    this.entity = data.entity;
    this.values = new Set(data.values);
  }

  has(tag: string): boolean {
    return this.values.has(tag);
  }

  add(tag: string): void {
    this.values.add(tag);
  }

  remove(tag: string): void {
    this.values.delete(tag);
  }
}
