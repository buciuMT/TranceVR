import { CreateAudioEngineAsync, AudioEngineV2, StreamingSound } from "@babylonjs/core/AudioV2";

export interface AudioAnalysis {
  bass:       number;  // 0-1, ~0-250 Hz
  mid:        number;  // 0-1, ~250-2000 Hz
  treble:     number;  // 0-1, ~2000-8000 Hz
  highTone:   number;  // 0-1, ~8000+ Hz
  filterType: 'lowpass' | 'highpass' | 'none';
}

export class AudioService {
  private _engine: AudioEngineV2 | null = null;
  private _currentSound: StreamingSound | null = null;
  private _analyser: AnalyserNode | null = null;
  private _frequencyData: any = null;

  constructor() {
    this._init();
  }

  private async _init() {
    try {
      this._engine = await CreateAudioEngineAsync({
        resumeOnInteraction: true
      });
      
      // Setup Analyser folosind Web Audio API direct, conectat la contextul noului AudioEngineV2
      const ctx = (this._engine as any)._audioContext as AudioContext;
      if (ctx) {
        this._analyser = ctx.createAnalyser();
        this._analyser.fftSize = 512;
        this._analyser.smoothingTimeConstant = 0.85;
        this._frequencyData = new Uint8Array(this._analyser.frequencyBinCount);
        
        // În AudioEngineV2, putem accesa mainOut. 
        // Nota: Conectarea la Analyser în V2 se face prin graful de noduri.
        // Pentru moment, folosim accesul la context pentru a crea hook-urile de analiză.
      }
      
      console.log("[AudioService] AudioEngineV2 inițializat.");
      
      // Play default track once initialized
      this.loadTrack("assets/track1.wav");
    } catch (e) {
      console.error("[AudioService] Eroare la inițializarea AudioEngineV2:", e);
    }
  }

  /**
   * Încarcă și redă o piesă audio folosind sistemul V2.
   */
  public async loadTrack(source: string | File): Promise<void> {
    if (!this._engine) {
        // Dacă nu e gata, așteptăm (sau reîncercăm mai târziu)
        return;
    }

    if (this._currentSound) {
      this._currentSound.dispose();
    }

    let url: string;
    if (source instanceof File) {
      url = URL.createObjectURL(source);
    } else {
      url = source;
    }

    try {
      // StreamingSound este mai eficient pentru piese lungi
      this._currentSound = await this._engine.createStreamingSoundAsync("track", url, {
        loop: true,
        autoplay: true
      });

      // Hook pentru Analyser: conectăm instanța curentă la analyser-ul nostru
      // În V2, accesăm nodurile interne pentru a face conexiuni custom
      const instance = (this._currentSound as any)._preloadedInstances?.[0] || (this._currentSound as any)._instances?.[0];
      if (instance && instance._outNode && this._analyser) {
          instance._outNode.connect(this._analyser);
      }

      console.log(`[AudioService] Redare V2: ${url}`);
    } catch (e) {
      console.error(`[AudioService] Eroare la încărcarea piesei: ${url}`, e);
    }
  }

  /**
   * Returnează datele de frecvență (FFT).
   */
  public getFrequencyData(): Uint8Array {
    if (!this._analyser || !this._frequencyData) return new Uint8Array(0);
    this._analyser.getByteFrequencyData(this._frequencyData);
    return this._frequencyData;
  }

  /**
   * Calculează RMS (Root Mean Square).
   */
  public getRMS(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Returns per-band energy scalars (0-1) and a heuristic filter detection.
   * Bin ranges assume fftSize=512, sampleRate≈44100 Hz (~86 Hz/bin).
   */
  public getAnalysis(): AudioAnalysis {
    const data = this.getFrequencyData();
    if (data.length === 0) {
      return { bass: 0, mid: 0, treble: 0, highTone: 0, filterType: 'none' };
    }

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
    if (bass / (treble + 0.001) > 3.0 && bass > 0.08) {
      filterType = 'lowpass';
    } else if ((treble + highTone) / (bass + 0.001) > 3.0 && treble > 0.08) {
      filterType = 'highpass';
    }

    return { bass, mid, treble, highTone, filterType };
  }

  public get engine(): AudioEngineV2 | null {
    return this._engine;
  }
}
