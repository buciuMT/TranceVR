import type { Entity } from "../Entity";
import { Color3 } from "@babylonjs/core";

/** Attach this to any entity to apply the Trance effect. */
export class TranceEffect {
  entity: Entity;
  intensity: number;       // 0–1
  hueShift: number;        // 0–1
  waveStrength: number;    // 0–2
  colorTint: Color3;

  constructor(data: {
    entity: Entity;
    intensity?: number;
    hueShift?: number;
    waveStrength?: number;
    colorTint?: Color3;
  }) {
    this.entity = data.entity;
    this.intensity = data.intensity ?? 0.5;
    this.hueShift = data.hueShift ?? 0;
    this.waveStrength = data.waveStrength ?? 0.5;
    this.colorTint = data.colorTint ?? new Color3(1, 1, 1);
  }
}
