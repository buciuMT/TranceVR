import type { Entity } from "../Entity";

/** Attach this to any entity to apply color inversion + scanlines. */
export class InvertEffect {
  entity: Entity;
  intensity: number;  // 0–1

  constructor(data: { entity: Entity; intensity?: number }) {
    this.entity = data.entity;
    this.intensity = data.intensity ?? 0.3;
  }
}
