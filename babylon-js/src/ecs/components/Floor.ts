import type { Entity } from "../Entity";

/** Tag component: this entity's mesh is a floor (for VR teleportation). */
export class Floor {
  entity: Entity;

  constructor(data: { entity: Entity }) {
    this.entity = data.entity;
  }
}
