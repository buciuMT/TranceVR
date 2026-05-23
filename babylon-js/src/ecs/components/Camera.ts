import type { Entity } from "../Entity";
import { FreeCamera } from "@babylonjs/core";

export class Camera {
  entity: Entity;
  camera: FreeCamera;

  constructor(data: { entity: Entity; camera: FreeCamera }) {
    this.entity = data.entity;
    this.camera = data.camera;
  }
}
