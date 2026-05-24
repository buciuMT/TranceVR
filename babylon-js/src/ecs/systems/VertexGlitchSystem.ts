import { type Material } from "@babylonjs/core";
import { System } from "../System";
import { World } from "../World";
import { Corridor } from "../components/Corridor";
import { VertexGlitchEffect } from "../components/VertexGlitchEffect";
import { VertexGlitchPlugin } from "./VertexGlitchPlugin";

export class VertexGlitchSystem extends System {
  private _time = 0;
  private _plugins = new Map<Material, VertexGlitchPlugin>();

  constructor(world: World) {
    super(world);
  }

  update(dt: number): void {
    this._time += dt;

    const effects = this._world.queryComponents(VertexGlitchEffect);
    if (!effects.length) return;
    const effect = effects[0].components[0];

    // Add plugin to any corridor materials not yet tracked (handles streamed-in segments)
    for (const { components: [corridor] } of this._world.queryComponents(Corridor)) {
      for (const mesh of corridor.meshes) {
        const mat = mesh.material as Material | null;
        if (!mat || this._plugins.has(mat)) continue;
        this._plugins.set(mat, new VertexGlitchPlugin(mat));
      }
    }

    // Drive all plugins — intensity 0 when disabled (no shader recompile on toggle)
    const intensity = effect.enabled ? effect.intensity : 0;
    for (const plugin of this._plugins.values()) {
      plugin.time = this._time;
      plugin.intensity = intensity;
    }
  }
}
