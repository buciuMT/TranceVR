# Variables
SOUNDFONT_DIR = pure-data/soundfonts
SOUNDFONT_PATH = $(SOUNDFONT_DIR)/SGM-V2.01.sf2
INIT_FILE = fluidsynth.init
MIDI_FILE = pure-data/spiegel_modificat.mid
OUTPUT_FILE = spiegel_sgm_final.wav

# FluidSynth Config
AUDIO_DRIVER = pipewire
MIDI_DRIVER = alsa_seq
GAIN = 0.8

.PHONY: all run-synth bridge-midi export-wav clean help

help:
	@echo "Filtru Cromatic Psaltic - Orchestration Tool"
	@echo ""
	@echo "Commands:"
	@echo "  make run-synth    - Start FluidSynth (Server Mode) for real-time monitoring"
	@echo "  make bridge-midi  - Connect Pure Data MIDI output to FluidSynth"
	@echo "  make export-wav   - Render the recorded $(MIDI_FILE) to $(OUTPUT_FILE)"
	@echo "  make clean        - Stop FluidSynth processes and remove temp MIDI"

run-synth:
	@echo "Cleaning up old processes..."
	@killall -9 fluidsynth 2>/dev/null || true
	@echo "Starting FluidSynth (Server Mode) with $(SOUNDFONT_PATH)..."
	@fluidsynth -s -g $(GAIN) -a $(AUDIO_DRIVER) -m $(MIDI_DRIVER) -R 1 -C 1 -f $(INIT_FILE) $(SOUNDFONT_PATH) &

bridge-midi:
	@echo "Attempting to bridge MIDI..."
	@aconnect "Pure Data":0 "FLUID Synth" || aconnect "plugdata":2 "FLUID Synth" || aconnect "plugdata":1 "FLUID Synth" || echo "Error: Connection failed."
	@aconnect -l | grep -i "FLUID Synth"

export-wav:
	@echo "Rendering $(MIDI_FILE) to $(OUTPUT_FILE)..."
	@fluidsynth -ni -g $(GAIN) -F $(OUTPUT_FILE) -f $(INIT_FILE) $(SOUNDFONT_PATH) $(MIDI_FILE)

clean:
	@killall fluidsynth || true
	@rm -f $(MIDI_FILE)
	@echo "Processes stopped."
