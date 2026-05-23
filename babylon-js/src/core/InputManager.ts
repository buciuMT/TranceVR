import { Scene, KeyboardEventTypes } from "@babylonjs/core";

/**
 * Tracks keyboard state. Created and owned by the Engine,
 * injected into Systems that need input.
 */
export class InputManager {
  private _keysDown: Set<string> = new Set();
  private _keysJustPressed: Set<string> = new Set();

  constructor(scene: Scene) {
    scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        if (!this._keysDown.has(key)) {
          this._keysJustPressed.add(key);
        }
        this._keysDown.add(key);
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this._keysDown.delete(key);
        this._keysJustPressed.delete(key);
      }
    });
  }

  /** Clear the "just pressed" state at the end of each frame. */
  finishFrame(): void {
    this._keysJustPressed.clear();
  }

  isDown(key: string): boolean {
    return this._keysDown.has(key.toLowerCase());
  }

  wasPressed(key: string): boolean {
    return this._keysJustPressed.has(key.toLowerCase());
  }
}
