import type { Entity } from "../Entity";

/**
 * Tag + data component: marks an entity as using PD audio‑reactive data
 * instead of the main AudioService for driving shader effects.
 *
 * If present on an entity, PostProcessSystem reads PD RMS/bass
 * instead of the main track.
 */
export class PdAudioReactive {
  entity: Entity;

  /** Override RMS (0–255) — 0 means auto‑read from PdService.getRMS(). */
  rmsOverride: number;

  /** Override bass level (0–255) — 0 means auto‑read from PdService.getBassLevel(). */
  bassOverride: number;

  constructor(data: {
    entity: Entity;
    rmsOverride?: number;
    bassOverride?: number;
  }) {
    this.entity = data.entity;
    this.rmsOverride = data.rmsOverride ?? 0;
    this.bassOverride = data.bassOverride ?? 0;
  }
}
