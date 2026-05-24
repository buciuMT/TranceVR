import type { Entity } from "../Entity";
import { SpotLight } from "@babylonjs/core";

export class Light {
  entity: Entity;
  light: SpotLight;
  intensity: number;
  range: number;

  constructor(data: {
    entity: Entity;
    light: SpotLight;
    intensity?: number;
    range?: number;
  }) {
    this.entity = data.entity;
    this.light = data.light;
    this.intensity = data.intensity ?? 200;
    this.range = data.range ?? 200;
  }
}
