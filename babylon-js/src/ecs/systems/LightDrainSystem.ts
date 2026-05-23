import { System } from "../System";
import { World } from "../World";
import { Light } from "../components";

/**
 * Slowly drains flashlight intensity over time, simulating battery drain.
 *
 * Query: Light
 */
export class LightDrainSystem extends System {
  constructor(world: World) {
    super(world);
  }

  update(_dt: number): void {
    const entities = this._world.queryComponents(Light);

    for (const { components } of entities) {
      const [light] = components;
      if (light.light.intensity > 5) {
        light.light.intensity -= 0.001;
        light.intensity = light.light.intensity;
      }
    }
  }
}
