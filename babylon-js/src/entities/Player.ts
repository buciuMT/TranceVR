import {
  Scene,
  Vector3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  FreeCamera,
  AbstractMesh,
  KeyboardEventTypes,
  SpotLight,
} from "@babylonjs/core";

export class Player {
  private _scene: Scene;
  private _camera!: FreeCamera;
  private _capsule!: AbstractMesh;
  private _aggregate!: PhysicsAggregate;
  private _flashlight!: SpotLight;

  // State pentru taste
  private _input: { [key: string]: boolean } = {};
  private _moveSpeed = 5;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._setupPlayer(canvas);
    this._setupMovement();
  }

  private _setupPlayer(canvas: HTMLCanvasElement): void {
    // 1. Creăm un mesh invizibil (capsulă) pentru fizică
    this._capsule = MeshBuilder.CreateCapsule(
      "playerCapsule",
      { radius: 0.3, height: 1.8 },
      this._scene,
    );
    this._capsule.position = new Vector3(0, 3, 0);
    this._capsule.isVisible = false;

    // 2. Adăugăm agregatul de fizică (Dynamic)
    this._aggregate = new PhysicsAggregate(
      this._capsule,
      PhysicsShapeType.CAPSULE,
      { mass: 80, friction: 0.5, restitution: 0 },
      this._scene,
    );

    // Blocăm rotația
    this._aggregate.body.setMassProperties({
      inertia: new Vector3(0, 0, 0),
    });

    // 3. Configurăm Camera
    this._camera = new FreeCamera(
      "playerCamera",
      new Vector3(0, 0.6, 0),
      this._scene,
    );
    this._camera.parent = this._capsule;
    this._camera.attachControl(canvas, true);

    // Dezactivăm controalele default de mișcare ale camerei (le facem noi prin fizică)
    this._camera.keysUp = [];
    this._camera.keysDown = [];
    this._camera.keysLeft = [];
    this._camera.keysRight = [];

    this._camera.minZ = 0.1;
    this._camera.checkCollisions = false;
    this._camera.applyGravity = false;
    this._camera.setTarget(new Vector3(0, 0.6, 10));

    // 4. Configurăm Lanterna (Flashlight)
    // O atașăm direct de cameră ca părinte pentru a se mișca automat cu ea
    this._flashlight = new SpotLight(
      "playerFlashlight",
      Vector3.Zero(), // Poziție relativă la cameră
      new Vector3(0, 0, 1), // Direcție relativă (în față)
      Math.PI / 3, // Unghiul conului
      10, // Exponent (concentrarea fasciculului)
      this._scene,
    );
    this._flashlight.parent = this._camera;
    this._flashlight.intensity = 100; // Intensitate mult mai mare pentru vizibilitate
    this._flashlight.range = 100; // Distanța maximă a luminii
  }

  private _setupMovement(): void {
    // Ascultăm tastele
    this._scene.onKeyboardObservable.add((kbInfo) => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          this._input[kbInfo.event.key.toLowerCase()] = true;
          break;
        case KeyboardEventTypes.KEYUP:
          this._input[kbInfo.event.key.toLowerCase()] = false;
          break;
      }
    });

    // Loop de actualizare fizică
    this._scene.onBeforeRenderObservable.add(() => {
      // Consum Baterie Lanternă
      if (this._flashlight.intensity > 5) {
        this._flashlight.intensity -= 0.01; // Scade încet
      }

      const forward = this._camera.getDirection(Vector3.Forward());
      forward.y = 0; // Nu vrem să zburăm sus/jos
      forward.normalize();

      const right = this._camera.getDirection(Vector3.Right());
      right.y = 0;
      right.normalize();

      let moveDirection = Vector3.Zero();

      if (this._input["w"]) moveDirection.addInPlace(forward);
      if (this._input["s"]) moveDirection.subtractInPlace(forward);
      if (this._input["a"]) moveDirection.subtractInPlace(right);
      if (this._input["d"]) moveDirection.addInPlace(right);

      if (moveDirection.length() > 0) {
        moveDirection.normalize().scaleInPlace(this._moveSpeed);

        // Aplicăm viteza pe corpul fizic
        const currentVelocity = this._aggregate.body.getLinearVelocity();
        this._aggregate.body.setLinearVelocity(
          new Vector3(moveDirection.x, currentVelocity.y, moveDirection.z),
        );
      } else {
        // Oprim mișcarea orizontală dacă nu apăsăm nimic
        const currentVelocity = this._aggregate.body.getLinearVelocity();
        this._aggregate.body.setLinearVelocity(
          new Vector3(0, currentVelocity.y, 0),
        );
      }
    });
  }

  public setPosition(position: Vector3): void {
    this._aggregate.body.disablePreStep = false;
    this._capsule.position.copyFrom(position);
    this._aggregate.body.setLinearVelocity(Vector3.Zero());
  }

  public get position(): Vector3 {
    return this._capsule.position;
  }
}
