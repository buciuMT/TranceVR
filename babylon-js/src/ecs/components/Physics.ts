import type { Entity } from "../Entity";
import { PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Physics {
  entity: Entity;
  aggregate: PhysicsAggregate;
  shapeType: PhysicsShapeType;
  mass: number;

  constructor(data: {
    entity: Entity;
    aggregate: PhysicsAggregate;
    shapeType?: PhysicsShapeType;
    mass?: number;
  }) {
    this.entity = data.entity;
    this.aggregate = data.aggregate;
    this.shapeType = data.shapeType ?? PhysicsShapeType.CAPSULE;
    this.mass = data.mass ?? 80;
  }
}
