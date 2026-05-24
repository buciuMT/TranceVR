# Variables
SOUNDFONT_DIR = pure-data/soundfonts
SOUNDFONT_PATH = $(SOUNDFONT_DIR)/SGM-V2.01.sf2
INIT_FILE = fluidsynth.init
MIDI_FILE = pure-data/spiegel_modificat.mid
OUTPUT_FILE = spiegel_sgm_final.wav

SLIDES_DIR = slides
SLIDES_SRC = presentation.tex

# FluidSynth Config
AUDIO_DRIVER = pipewire
MIDI_DRIVER = alsa_seq
GAIN = 0.8

.PHONY: all run-synth bridge-midi export-wav clean help slides slides-watch

help:
	@echo "Filtru Cromatic Psaltic - Orchestration Tool"
	@echo ""
	@echo "Commands:"
	@echo "  make run-synth    - Start FluidSynth (Server Mode) for real-time monitoring"
	@echo "  make bridge-midi  - Connect Pure Data MIDI output to FluidSynth"
	@echo "  make export-wav   - Render the recorded $(MIDI_FILE) to $(OUTPUT_FILE)"
	@echo "  make slides       - Build the LaTeX presentation"
	@echo "  make slides-watch - Build and watch the LaTeX presentation for changes"
	@echo "  make clean        - Stop processes and remove temporary files"

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

slides:
	@echo "Building slides..."
	cd $(SLIDES_DIR) && latexmk -xelatex -interaction=nonstopmode $(SLIDES_SRC)

slides-watch:
	@echo "Watching slides for changes..."
	cd $(SLIDES_DIR) && latexmk -xelatex -pvc $(SLIDES_SRC)

clean:
	@killall fluidsynth 2>/dev/null || true
	@rm -f $(MIDI_FILE)
	@echo "Cleaning LaTeX auxiliary files..."
	cd $(SLIDES_DIR) && latexmk -C
	@echo "Processes stopped and files cleaned."
