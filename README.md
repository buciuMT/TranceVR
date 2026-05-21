# TranceVR

Procedural Audio Visualizer in VR using Pure Data for audio analysis/processing and Babylon.js for the XR frontend.

## Orchestration & Recording (FluidSynth)

To export the piece with high-quality SoundFonts and cathedral reverb:

1. **Start FluidSynth:**
   ```bash
   make run-synth
   ```
2. **Bridge MIDI (in a new tab):**
   ```bash
   make bridge-midi
   ```
3. **Start Recording (in a new tab):**
   ```bash
   make record-start
   ```
4. **Play in PlugData:**
   - Select the psaltic scale.
   - Press **Play**.
5. **Stop Recording:**
   - When finished, press `Ctrl+C` in the recording terminal.
   - The result will be saved as `spiegel_sgm_final.wav`.

## Project Structure
...
