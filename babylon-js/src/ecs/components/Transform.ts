import type { Entity } from "../Entity";
import { Vector3 } from "@babylonjs/core";

export class Transform {
  entity: Entity;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;

  constructor(data: {
    entity: Entity;
    position?: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
  }) {
    this.entity = data.entity;
    this.position = data.position?.clone() ?? Vector3.Zero();
    this.rotation = data.rotation?.clone() ?? Vector3.Zero();
    this.scale = data.scale?.clone() ?? Vector3.One();
  }
}
