import type { Entity } from "../Entity";

/** Tag component: this entity is the player. */
export class Player {
  entity: Entity;
  moveSpeed: number;

  constructor(data: { entity: Entity; moveSpeed?: number }) {
    this.entity = data.entity;
    this.moveSpeed = data.moveSpeed ?? 5;
  }
}
