import { MaterialPluginBase, Material, type Scene, type AbstractEngine, type SubMesh, type UniformBuffer } from "@babylonjs/core";

/**
 * Injects explosive scatter vertex displacement into any PBR or Standard material.
 * Original textures, lighting, and shadows are fully preserved — only geometry moves.
 *
 * Injection points used:
 *   CUSTOM_VERTEX_DEFINITIONS  → hash helper function
 *   CUSTOM_VERTEX_UPDATE_POSITION → displaces `positionUpdated`
 */
export class VertexGlitchPlugin extends MaterialPluginBase {
  private _time = 0;
  private _intensity = 0.0;

  constructor(material: Material) {
    super(material, "VertexGlitch", 200);
    this.registerForExtraEvents = true; // required for hardBindForSubMesh to fire every frame
  }

  override getClassName(): string {
    return "VertexGlitchPlugin";
  }

  override getUniforms() {
    return {
      ubo: [
        { name: "vg_time",      size: 1, type: "float" },
        { name: "vg_intensity", size: 1, type: "float" },
      ],
      // Fallback declaration for engines without UBO support
      vertex: "uniform float vg_time; uniform float vg_intensity;",
    };
  }

  override hardBindForSubMesh(
    uniformBuffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    _subMesh: SubMesh,
  ): void {
    uniformBuffer.updateFloat("vg_time",      this._time);
    uniformBuffer.updateFloat("vg_intensity", this._intensity);
  }

  override getCustomCode(shaderType: string) {
    if (shaderType !== "vertex") return null;

    return {
      // Hash helper injected once into the definitions block
      "CUSTOM_VERTEX_DEFINITIONS": /* glsl */ `
        float vg_hash(float n) {
          return fract(sin(n) * 43758.5453);
        }
      `,

      // Modifies positionUpdated — runs after `vec3 positionUpdated = position;`
      "CUSTOM_VERTEX_UPDATE_POSITION": /* glsl */ `
        if (vg_intensity > 0.001) {
          float vg_len = length(positionUpdated);
          vec3 vg_outward = vg_len > 0.001
            ? positionUpdated / vg_len
            : vec3(0.0, 1.0, 0.0);

          float vg_seed = positionUpdated.x * 13.7
                        + positionUpdated.y *  7.3
                        + positionUpdated.z * 31.1;
          float vg_r1 = vg_hash(vg_seed);
          float vg_r2 = vg_hash(vg_seed + 57.3);
          float vg_r3 = vg_hash(vg_seed + 113.5);

          vec3 vg_rand = normalize(vec3(
            vg_r1 * 2.0 - 1.0,
            vg_r2 * 2.0 - 1.0,
            vg_r3 * 2.0 - 1.0
          ));
          vec3 vg_dir = normalize(vg_outward + vg_rand * 0.6);

          float vg_phase   = vg_r1 * 6.28318;
          float vg_pulse   = sin(vg_time * 3.0 + vg_phase) * 0.5 + 0.5;
          float vg_scatter = vg_pulse * vg_intensity * (1.0 + vg_r1 * 2.0) * 3.0;

          positionUpdated += vg_dir * vg_scatter;
        }
      `,
    };
  }

  set time(v: number)      { this._time = v; }
  set intensity(v: number) { this._intensity = v; }
}
