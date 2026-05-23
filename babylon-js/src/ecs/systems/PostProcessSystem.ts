import { System } from "../System";
import { World } from "../World";
import {
  TranceEffect,
  ChromaticEffect,
  PulseEffect,
  KaleidoscopeEffect,
  InvertEffect,
  PostProcessPipeline,
} from "../components";
import { PostProcessService } from "../../services/PostProcessService";
import { AudioService } from "../../services/AudioService";

/**
 * Drives post‑processing shader uniforms from ECS component state.
 *
 * Two modes (checked in order):
 * 1. **PostProcessPipeline** — a single component bundles all 5 effects.
 *    First pipeline found wins.
 * 2. **Individual effect components** — TranceEffect, ChromaticEffect, …
 *    attached to any entity. Max intensity across all entities wins.
 *
 * Also feeds audio RMS into the shader every frame.
 */
export class PostProcessSystem extends System {
  private _postProcess: PostProcessService;
  private _audio: AudioService;

  constructor(world: World, postProcess: PostProcessService, audio: AudioService) {
    super(world);
    this._postProcess = postProcess;
    this._audio = audio;
  }

  update(_dt: number): void {
    // 1. Feed audio
    const rms = this._audio.getRMS();
    this._postProcess.updateAudio(rms);

    // 2. Try PostProcessPipeline first (convenience mode)
    const pipelines = this._world.queryComponents(PostProcessPipeline);
    if (pipelines.length > 0) {
      const pipe = pipelines[0].components[0]; // first pipeline wins
      this._postProcess.setIntensity("trance", pipe.tranceIntensity);
      this._postProcess.setIntensity("chromatic", pipe.chromaticIntensity);
      this._postProcess.setIntensity("pulse", pipe.pulseIntensity);
      this._postProcess.setIntensity("kaleidoscope", pipe.kaleidoscopeIntensity);
      this._postProcess.setIntensity("invert", pipe.invertIntensity);
      this._postProcess.setUniform("trance", "HueShift", pipe.tranceHueShift);
      this._postProcess.setUniform("trance", "WaveStrength", pipe.tranceWaveStrength);
      return;
    }

    // 3. Fallback: individual effect components (max intensity across all entities)
    this._postProcess.setIntensity("trance", this._maxIntensity(TranceEffect));
    this._postProcess.setIntensity("chromatic", this._maxIntensity(ChromaticEffect));
    this._postProcess.setIntensity("pulse", this._maxIntensity(PulseEffect));
    this._postProcess.setIntensity("kaleidoscope", this._maxIntensity(KaleidoscopeEffect));
    this._postProcess.setIntensity("invert", this._maxIntensity(InvertEffect));

    // Trance‑specific params from the first TranceEffect found
    const tranceEffects = this._world.queryComponents(TranceEffect);
    if (tranceEffects.length > 0) {
      const t = tranceEffects[0].components[0];
      this._postProcess.setUniform("trance", "HueShift", t.hueShift);
      this._postProcess.setUniform("trance", "WaveStrength", t.waveStrength);
      this._postProcess.setUniform("trance", "ColorTint", t.colorTint);
    }
  }

  /** Find the maximum intensity of a given effect component type across all entities. */
  private _maxIntensity(
    componentType: new (...args: any[]) => { intensity: number; entity: number },
  ): number {
    let max = 0;
    const items = this._world.queryComponents(componentType as any);
    for (const { components } of items) {
      const c = components[0] as unknown as { intensity: number };
      max = Math.max(max, c.intensity);
    }
    return max;
  }
}
