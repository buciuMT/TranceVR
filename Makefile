# Variables
SOUNDFONT_DIR = pure-data/soundfonts
SOUNDFONT_PATH = $(SOUNDFONT_DIR)/SGM-V2.01.sf2
INIT_FILE = fluidsynth.init
OUTPUT_FILE = spiegel_sgm_final.wav

# FluidSynth Config
AUDIO_DRIVER = pulseaudio
MIDI_DRIVER = alsa_seq

# Audio Recording Target (Monitor of the default sink)
DEFAULT_SINK = $(shell wpctl inspect @DEFAULT_AUDIO_SINK@ | grep 'node.name' | cut -d '"' -f 2)

.PHONY: all run-synth bridge-midi record-start clean help

help:
	@echo "Filtru Cromatic Psaltic - Orchestration Tool"
	@echo ""
	@echo "Commands:"
	@echo "  make run-synth    - Start FluidSynth with cathedral reverb settings"
	@echo "  make bridge-midi  - Connect Pure Data MIDI output to FluidSynth"
	@echo "  make record-start - Start recording system audio to $(OUTPUT_FILE)"
	@echo "  make clean        - Stop FluidSynth and recording processes"

run-synth:
	@echo "Cleaning up old processes..."
	@killall -9 fluidsynth 2>/dev/null || true
	@echo "Starting FluidSynth with $(SOUNDFONT_PATH) and $(INIT_FILE)..."
	@fluidsynth -a $(AUDIO_DRIVER) -m $(MIDI_DRIVER) -R 1 -C 1 -f $(INIT_FILE) $(SOUNDFONT_PATH)

bridge-midi:
	@echo "Attempting to bridge Pure Data -> FluidSynth..."
	@aconnect "Pure Data":0 "FLUID Synth":0 || aconnect "plugdata":2 "FLUID Synth":0 || echo "Error: Connection failed."

record-start:
	@echo "Recording from $(DEFAULT_SINK) to $(OUTPUT_FILE)..."
	@pw-record --target $(DEFAULT_SINK) --format s16 --rate 44100 --channels 2 $(OUTPUT_FILE)

clean:
	@killall fluidsynth || true
	@killall pw-record || true
	@echo "Processes stopped."
