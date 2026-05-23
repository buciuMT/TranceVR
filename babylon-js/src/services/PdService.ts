import type { Pd } from "webpd";

/**
 * Runs Pure Data patches in the browser via WebAssembly (webpd).
 * Provides audio processing, message passing, and optional
 * FFT analysis for driving visual effects.
 *
 * Owned by the Engine, usable by Systems that need procedural
 * audio generation or real-time patch parameter control.
 */
export class PdService {
  private _pd: Pd | null = null;
  private _patchLoaded = false;
  private _running = false;
  private _audioCtx: AudioContext | null = null;
  private _destination: AudioNode | null = null;

  // Optional analyser for extracting audio data from the PD output
  private _analyser: AnalyserNode | null = null;
  private _frequencyData: Uint8Array | null = null;

  // Message callbacks keyed by receiver symbol
  private _receivers: Map<string, (...args: any[]) => void> = new Map();

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialise the Pure Data engine (async — loads WASM).
   * Call once after audio context is available.
   */
  public async init(audioContext?: AudioContext): Promise<void> {
    if (this._pd) {
      console.warn("[PdService] Already initialised.");
      return;
    }

    try {
      const { Pd: PdClass } = await import("webpd");
      this._pd = new PdClass();

      if (audioContext) {
        this._audioCtx = audioContext;
      } else {
        this._audioCtx = new AudioContext({ sampleRate: 44100 });
      }

      // Setup analyser for FFT data extraction
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 512;
      this._frequencyData = new Uint8Array(this._analyser.frequencyBinCount);

      console.log("[PdService] Pure Data engine initialised.");
    } catch (e) {
      console.error("[PdService] Failed to initialise webpd:", e);
      throw e;
    }
  }

  // =========================================================================
  // Patch management
  // =========================================================================

  /**
   * Load a .pd patch from a URL.
   * @param url Path to the .pd file (e.g. "assets/patches/synth.pd")
   */
  public async loadPatch(url: string): Promise<void> {
    if (!this._pd) {
      throw new Error("[PdService] Call init() before loading a patch.");
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const patchSource = await response.text();

      this._pd.openPatch(patchSource);
      this._patchLoaded = true;
      console.log(`[PdService] Patch loaded: ${url}`);
    } catch (e) {
      console.error(`[PdService] Failed to load patch from ${url}:`, e);
      throw e;
    }
  }

  /**
   * Load a .pd patch from a raw string.
   */
  public loadPatchFromString(patchSource: string): void {
    if (!this._pd) {
      throw new Error("[PdService] Call init() before loading a patch.");
    }

    this._pd.openPatch(patchSource);
    this._patchLoaded = true;
    console.log("[PdService] Patch loaded from string.");
  }

  /**
   * Load a .pd patch from a File object (user upload).
   */
  public loadPatchFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          this.loadPatchFromString(reader.result as string);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  /**
   * Close the currently loaded patch.
   */
  public closePatch(): void {
    if (!this._pd) return;

    this._pd.closePatch();
    this._patchLoaded = false;
    this._receivers.clear();
    console.log("[PdService] Patch closed.");
  }

  // =========================================================================
  // Audio routing
  // =========================================================================

  /**
   * Connect the PD audio output to the Web Audio graph.
   * If no destination is provided, connects to the audio context output
   * via the internal analyser.
   */
  public connectAudio(destination?: AudioNode): void {
    if (!this._pd || !this._audioCtx) return;

    this._destination = destination ?? this._audioCtx.destination;

    // webpd exposes DSP as an AudioWorklet or ScriptProcessor.
    // The exact API depends on the webpd version.
    // Typical pattern: pd.getAudioNode() → connect to destination via analyser.
    try {
      const pdNode = (this._pd as any).getAudioNode?.();
      if (pdNode && this._analyser) {
        pdNode.connect(this._analyser);
        this._analyser.connect(this._destination);
        console.log("[PdService] Audio connected via analyser.");
      } else if (pdNode) {
        pdNode.connect(this._destination);
        console.log("[PdService] Audio connected (no analyser).");
      }
    } catch (e) {
      console.warn("[PdService] Could not connect audio node:", e);
    }
  }

  // =========================================================================
  // Playback control
  // =========================================================================

  /** Start/resume the PD DSP engine. */
  public async start(): Promise<void> {
    if (!this._pd) {
      throw new Error("[PdService] Call init() first.");
    }
    if (!this._patchLoaded) {
      throw new Error("[PdService] No patch loaded.");
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this._audioCtx?.state === "suspended") {
      await this._audioCtx.resume();
    }

    this._pd.start();
    this._running = true;
    console.log("[PdService] DSP started.");
  }

  /** Stop the PD DSP engine. */
  public stop(): void {
    if (!this._pd) return;

    this._pd.stop();
    this._running = false;
    console.log("[PdService] DSP stopped.");
  }

  /** Dispose everything — close patch, stop DSP, release resources. */
  public dispose(): void {
    this.stop();
    this.closePatch();

    if (this._analyser) {
      this._analyser.disconnect();
      this._analyser = null;
    }

    this._pd = null;
    this._audioCtx = null;
    this._destination = null;
    this._frequencyData = null;
    console.log("[PdService] Disposed.");
  }

  // =========================================================================
  // Message passing — send to PD
  // =========================================================================

  /**
   * Send a float to a named receiver in the patch.
   * Use this to control synth parameters, volume, filter cutoff, etc.
   */
  public sendFloat(receiver: string, value: number): void {
    this._pd?.sendFloat(receiver, value);
  }

  /**
   * Send a bang to a named receiver.
   */
  public sendBang(receiver: string): void {
    this._pd?.sendBang(receiver);
  }

  /**
   * Send a symbol to a named receiver.
   */
  public sendSymbol(receiver: string, symbol: string): void {
    this._pd?.sendSymbol(receiver, symbol);
  }

  /**
   * Send a list to a named receiver.
   */
  public sendList(receiver: string, list: (number | string)[]): void {
    this._pd?.sendList(receiver, list);
  }

  /**
   * Send a typed message to a named receiver.
   * @param receiver The [r ...] or [receive ...] object name
   * @param message  E.g. "set 440" or "volume 0.5"
   */
  public sendMessage(receiver: string, message: string): void {
    this._pd?.sendMessage(receiver, message);
  }

  /** Send a MIDI note on event (if the patch uses [notein]). */
  public sendNoteOn(channel: number, pitch: number, velocity: number): void {
    this._pd?.sendNoteOn(channel, pitch, velocity);
  }

  /** Send a MIDI note off event. */
  public sendNoteOff(channel: number, pitch: number): void {
    this._pd?.sendNoteOff(channel, pitch);
  }

  // =========================================================================
  // Message passing — receive from PD
  // =========================================================================

  /**
   * Subscribe to messages from a named [send] / [s] object in the patch.
   * Use this to get analysis data, triggers, or state back from PD.
   */
  public subscribe(receiver: string, callback: (...args: any[]) => void): void {
    if (!this._pd) return;

    this._receivers.set(receiver, callback);
    this._pd.on(receiver, callback);
  }

  /** Unsubscribe a previously registered receiver callback. */
  public unsubscribe(receiver: string): void {
    if (!this._pd) return;

    const cb = this._receivers.get(receiver);
    if (cb) {
      this._pd.off(receiver, cb);
      this._receivers.delete(receiver);
    }
  }

  // =========================================================================
  // Audio analysis (for driving visual effects)
  // =========================================================================

  /**
   * Get raw FFT frequency bins (256 bins, 0–255 each).
   * Returns an empty Uint8Array if no analyser is available.
   */
  public getFrequencyData(): Uint8Array {
    if (!this._analyser || !this._frequencyData) {
      return new Uint8Array(0);
    }
    this._analyser.getByteFrequencyData(this._frequencyData);
    return this._frequencyData;
  }

  /**
   * Get RMS (root mean square) of the PD audio output — useful for
   * driving audio-reactive shader uniforms.
   */
  public getRMS(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Get the dominant bass frequency band value (first ~10 bins averaged).
   * Useful for kick-driven effects.
   */
  public getBassLevel(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;

    const bassBins = Math.min(10, data.length);
    let sum = 0;
    for (let i = 0; i < bassBins; i++) {
      sum += data[i];
    }
    return sum / bassBins;
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  get isRunning(): boolean {
    return this._running;
  }

  get isPatchLoaded(): boolean {
    return this._patchLoaded;
  }

  get audioContext(): AudioContext | null {
    return this._audioCtx;
  }

  get pd(): Pd | null {
    return this._pd;
  }
}
