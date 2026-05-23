import type { Entity } from "../Entity";

/** Attach this to any entity to apply chromatic aberration. */
export class ChromaticEffect {
  entity: Entity;
  intensity: number;  // 0–1

  constructor(data: { entity: Entity; intensity?: number }) {
    this.entity = data.entity;
    this.intensity = data.intensity ?? 0.3;
  }
}
