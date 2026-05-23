import type { Entity } from "../Entity";

/** Attach this to any entity to apply audio‑reactive brightness pulsing. */
export class PulseEffect {
  entity: Entity;
  intensity: number;  // 0–1

  constructor(data: { entity: Entity; intensity?: number }) {
    this.entity = data.entity;
    this.intensity = data.intensity ?? 0.5;
  }
}
