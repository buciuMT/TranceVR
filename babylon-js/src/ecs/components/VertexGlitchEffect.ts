import type { Entity } from "../Entity";

export class VertexGlitchEffect {
  entity: Entity;
  enabled: boolean;
  intensity: number; // 0–1
  speed: number;     // pulse frequency multiplier

  constructor(data: {
    entity: Entity;
    enabled?: boolean;
    intensity?: number;
    speed?: number;
  }) {
    this.entity = data.entity;
    this.enabled = data.enabled ?? false;
    this.intensity = data.intensity ?? 0.8;
    this.speed = data.speed ?? 1.0;
  }
}
