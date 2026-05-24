export interface AudioAnalysis {
  bass:       number;  // 0-1, ~0-250 Hz
  mid:        number;  // 0-1, ~250-2000 Hz
  treble:     number;  // 0-1, ~2000-8000 Hz
  highTone:   number;  // 0-1, ~8000+ Hz
  filterType: 'lowpass' | 'highpass' | 'none';
}

export class AudioService {
  private _ctx:           AudioContext | null = null;
  private _analyser:      AnalyserNode | null = null;
  private _frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private _audioElement:  HTMLAudioElement | null = null;
  private _source:        MediaElementAudioSourceNode | null = null;

  // Track to load once the AudioContext is created
  private _pendingUrl: string | null = "assets/track1.wav";

  constructor() {
    // AudioContext must be created inside a user gesture or it stays suspended.
    // Register for the first interaction and start then.
    const onGesture = () => {
      this._ensureContext();
      if (this._pendingUrl) {
        this.loadTrack(this._pendingUrl);
        this._pendingUrl = null;
      }
    };
    document.addEventListener('click',   onGesture, { once: true });
    document.addEventListener('keydown', onGesture, { once: true });
  }

  private _ensureContext(): void {
    if (this._ctx) return;
    this._ctx = new AudioContext();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 512;
    this._analyser.smoothingTimeConstant = 0.85;
    this._frequencyData = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.connect(this._ctx.destination);
    console.log('[AudioService] AudioContext created, state:', this._ctx.state);
  }

  public async loadTrack(source: string | File): Promise<void> {
    this._ensureContext();

    if (this._audioElement) {
      this._audioElement.pause();
      this._source?.disconnect();
      this._audioElement = null;
      this._source = null;
    }

    const url = source instanceof File ? URL.createObjectURL(source) : source;

    this._audioElement = new Audio(url);
    this._audioElement.loop = true;

    this._source = this._ctx!.createMediaElementSource(this._audioElement);
    this._source.connect(this._analyser!);

    this._audioElement.play().catch(e => console.error('[AudioService] play error:', e));
    console.log(`[AudioService] Playing: ${url}`);
  }

  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (!this._analyser || !this._frequencyData) return new Uint8Array(0) as Uint8Array<ArrayBuffer>;
    this._analyser.getByteFrequencyData(this._frequencyData);
    return this._frequencyData;
  }

  public getRMS(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  /**
   * Returns per-band energy scalars (0-1) and a heuristic filter detection.
   * Bin ranges assume fftSize=512, sampleRate≈44100 Hz (~86 Hz/bin).
   */
  public getAnalysis(): AudioAnalysis {
    const data = this.getFrequencyData();

    if (data.length === 0) return { bass: 0, mid: 0, treble: 0, highTone: 0, filterType: 'none' };

    const avg = (from: number, to: number): number => {
      let s = 0;
      for (let i = from; i <= to; i++) s += data[i];
      return s / ((to - from + 1) * 255);
    };

    const bass     = avg(0,  2);
    const mid      = avg(3,  23);
    const treble   = avg(24, 92);
    const highTone = avg(93, 255);

    let filterType: AudioAnalysis['filterType'] = 'none';
    if (bass / (treble + 0.001) > 3.0 && bass > 0.08)                     filterType = 'lowpass';
    else if ((treble + highTone) / (bass + 0.001) > 3.0 && treble > 0.08) filterType = 'highpass';

    return { bass, mid, treble, highTone, filterType };
  }
}
