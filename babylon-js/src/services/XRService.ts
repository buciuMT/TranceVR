import { Scene, Camera, WebXRDefaultExperience, AbstractMesh } from "@babylonjs/core";

type XRState = "flat" | "vr";

type EnterCallback = (xrCamera: Camera) => void;
type ExitCallback = () => void;

/**
 * Manages WebXR lifecycle — initialization, state tracking, callbacks.
 * Owned by the Engine, injected into Systems that need XR awareness.
 *
 * The Scene is a dumb data container. XR logic lives here.
 */
export class XRService {
  private _scene: Scene;
  private _xr: WebXRDefaultExperience | null = null;
  private _state: XRState = "flat";

  private _enterCallbacks: EnterCallback[] = [];
  private _exitCallbacks: ExitCallback[] = [];
  private _pendingFloorMeshes: AbstractMesh[] = [];

  constructor(scene: Scene) {
    this._scene = scene;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /** Create the default XR experience. Call once after scene is ready. */
  public async init(): Promise<void> {
    try {
      this._xr = await this._scene.createDefaultXRExperienceAsync({
        floorMeshes: [],
      });

      // Enable smooth controller-based movement
      try {
        this._xr.baseExperience.featuresManager.enableFeature(
          "xr-controller-movement",
          "latest",
          {
            xrInput: this._xr.input,
            movementOrientationFollowsViewerPose: true,
            movementOrientationFollowsController: false,
            rotationEnabled: false,  // rotation handled by the teleportation module
          },
        );
      } catch (e) {
        console.warn("[XRService] Controller movement not available:", e);
      }

      // Track state transitions
      this._xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 2) {          // Entering VR
          this._state = "vr";
          console.log("[XRService] Entered VR mode");
          for (const cb of this._enterCallbacks) {
            cb(this._xr!.baseExperience.camera);
          }
        } else if (state === 0) {   // Exiting VR (back to inline)
          this._state = "flat";
          console.log("[XRService] Exited VR mode");
          for (const cb of this._exitCallbacks) {
            cb();
          }
        }
      });

      for (const mesh of this._pendingFloorMeshes) {
        this._xr.teleportation?.addFloorMesh(mesh);
      }
      this._pendingFloorMeshes = [];

      console.log("[XRService] WebXR initialized.");
    } catch (e) {
      console.warn("[XRService] WebXR not supported or error:", e);
    }
  }

  // =========================================================================
  // Callback registration
  // =========================================================================

  /** Register a callback invoked when the user enters VR. Receives the XR camera. */
  public onEnter(callback: EnterCallback): void {
    this._enterCallbacks.push(callback);
  }

  /** Register a callback invoked when the user exits VR. */
  public onExit(callback: ExitCallback): void {
    this._exitCallbacks.push(callback);
  }

  /**
   * Register a callback invoked when a motion controller initializes.
   * Provides the input source, motion controller, its handedness, and a grip node for attaching meshes.
   */
  public onControllerAdded(
    callback: (
      inputSource: any,
      motionController: any,
      handedness: "left" | "right",
      gripNode: any,
    ) => void,
  ): void {
    if (!this._xr) return;
    this._xr.input.onControllerAddedObservable.add((controller) => {
      controller.onMotionControllerInitObservable.add((motionController) => {
        callback(
          controller,
          motionController,
          motionController.handness as "left" | "right",
          controller.grip || controller.pointer,
        );
      });
    });
  }

  // =========================================================================
  // Public accessors
  // =========================================================================

  /** The currently active camera (XR camera in VR, null otherwise — use scene camera). */
  get camera(): Camera | null {
    return this._xr?.baseExperience.camera ?? null;
  }

  /** Current XR state. */
  get state(): XRState {
    return this._state;
  }

  /** Whether the user is currently in VR. */
  get isVR(): boolean {
    return this._state === "vr";
  }

  /** Underlying XR experience (for internal wiring: teleportation floors, input, etc.) */
  get xr(): WebXRDefaultExperience | null {
    return this._xr;
  }

  /** Teleportation module (null if XR not initialized). */
  get teleportation() {
    return this._xr?.teleportation ?? null;
  }

  /** XR input (controllers). */
  get input() {
    return this._xr?.input ?? null;
  }

  // =========================================================================
  // Floor mesh registration
  // =========================================================================

  /** Register a mesh as a teleportation target. Safe to call before XR is initialized. */
  public registerFloorMesh(mesh: AbstractMesh): void {
    if (this._xr?.teleportation) {
      this._xr.teleportation.addFloorMesh(mesh);
    } else {
      this._pendingFloorMeshes.push(mesh);
    }
  }

  /** Unregister a mesh as a teleportation target. */
  public unregisterFloorMesh(mesh: AbstractMesh): void {
    this._pendingFloorMeshes = this._pendingFloorMeshes.filter((m) => m !== mesh);
    this._xr?.teleportation?.removeFloorMesh(mesh);
  }

  // =========================================================================
  // Teleportation toggle
  // =========================================================================

  /**
   * Enable or disable the teleportation module.
   * When disabled, only smooth locomotion (xr-controller-movement) is active.
   * Call after init().
   */
  public setTeleportationEnabled(enabled: boolean): void {
    if (!this._xr?.teleportation) return;
    if (!enabled) {
      this._xr.teleportation.detach();
      console.log("[XRService] Teleportation disabled — smooth locomotion only.");
    }
    // Re-enabling after detach is not straightforward;
    // scenes that need teleportation keep it enabled by default.
  }
}
