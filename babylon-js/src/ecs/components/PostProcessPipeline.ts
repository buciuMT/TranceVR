import type { Entity } from "../Entity";

/**
 * Convenience component — bundles all 5 effects into one.
 * Useful when you want the "full trance pipeline" on a single entity.
 *
 * Individual effect components (TranceEffect, ChromaticEffect, …)
 * can also be used separately for fine‑grained control.
 */
export class PostProcessPipeline {
  entity: Entity;

  tranceIntensity: number;
  chromaticIntensity: number;
  pulseIntensity: number;
  kaleidoscopeIntensity: number;
  invertIntensity: number;

  tranceHueShift: number;
  tranceWaveStrength: number;

  constructor(data: {
    entity: Entity;
    tranceIntensity?: number;
    chromaticIntensity?: number;
    pulseIntensity?: number;
    kaleidoscopeIntensity?: number;
    invertIntensity?: number;
    tranceHueShift?: number;
    tranceWaveStrength?: number;
  }) {
    this.entity = data.entity;
    this.tranceIntensity = data.tranceIntensity ?? 0;
    this.chromaticIntensity = data.chromaticIntensity ?? 0;
    this.pulseIntensity = data.pulseIntensity ?? 0;
    this.kaleidoscopeIntensity = data.kaleidoscopeIntensity ?? 0;
    this.invertIntensity = data.invertIntensity ?? 0;
    this.tranceHueShift = data.tranceHueShift ?? 0;
    this.tranceWaveStrength = data.tranceWaveStrength ?? 0.5;
  }
}
