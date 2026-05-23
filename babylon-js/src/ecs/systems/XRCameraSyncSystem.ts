import { Vector3 } from "@babylonjs/core";
import { System } from "../System";
import { World } from "../World";
import { Player, Transform, Physics } from "../components";
import { XRService } from "../../services/XRService";

/**
 * When VR is active, syncs the player's physics capsule position to the XR camera.
 * This ensures collisions work correctly while the player walks around in VR.
 *
 * Query: Player + Transform + Physics
 * Dependency: XRService (for camera position + state)
 */
export class XRCameraSyncSystem extends System {
  private _xr: XRService;

  constructor(world: World, xr: XRService) {
    super(world);
    this._xr = xr;
  }

  update(_dt: number): void {
    if (!this._xr.isVR) return;

    const xrCam = this._xr.camera;
    if (!xrCam) return;

    const entities = this._world.queryComponents(Player, Transform, Physics);

    for (const { components } of entities) {
      const [, transform, phys] = components;
      const body = phys.aggregate.body;

      // Move physics body to XR camera XZ, keep its own Y
      body.disablePreStep = false;
      body.transformNode.position.set(
        xrCam.position.x,
        body.transformNode.position.y,
        xrCam.position.z,
      );
      body.setLinearVelocity(Vector3.Zero());

      // Sync the ECS transform
      transform.position.copyFrom(body.transformNode.position);
    }
  }

  /** Register XR callbacks (called once during setup). */
  registerXRCallbacks(
    onEnter: (xrCamera: import("@babylonjs/core").Camera) => void,
    onExit: () => void,
  ): void {
    this._xr.onEnter(onEnter);
    this._xr.onExit(onExit);
  }
}
