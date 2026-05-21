# TranceVR

Procedural Audio Visualizer in VR using Pure Data for audio analysis/processing and Babylon.js for the XR frontend.

## Orchestration & Recording (FluidSynth)

To export the piece with high-quality SoundFonts and cathedral reverb:

1. **Start FluidSynth (for monitoring):**
   ```bash
   make run-synth
   ```
2. **Bridge MIDI (in a new tab):**
   ```bash
   make bridge-midi
   ```
3. **Record in Pure Data:**
   - Press **Record** (butonul nou adăugat în patch).
   - Press **Play** pe transportul principal.
   - Când piesa se termină, apasă **Stop** și apoi **Save**.
4. **Export final WAV:**
   ```bash
   make export-wav
   ```
   Fișierul rezultat va fi `spiegel_sgm_final.wav`.

## Project Structure
...
