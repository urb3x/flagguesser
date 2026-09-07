// Web Audio API Sound Generator (No external audio files needed)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("flagguesser_muted") === "true";
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("flagguesser_muted", this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  playTone(freq, type = "sine", duration = 0.15, startTime = 0, gainLevel = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  playCorrect() {
    if (this.muted) return;
    // Pleasant uplifting major chord / arpeggio
    this.playTone(523.25, "triangle", 0.15, 0, 0.15);      // C5
    this.playTone(659.25, "triangle", 0.18, 0.08, 0.15);   // E5
    this.playTone(783.99, "triangle", 0.25, 0.16, 0.18);   // G5
    this.playTone(1046.50, "sine", 0.35, 0.24, 0.2);       // C6
  }

  playWrong() {
    if (this.muted) return;
    // Low buzzer dissonance
    this.playTone(220, "sawtooth", 0.22, 0, 0.15);
    this.playTone(207.65, "sawtooth", 0.28, 0.08, 0.15);
  }

  playClick() {
    if (this.muted) return;
    this.playTone(800, "sine", 0.04, 0, 0.05);
  }

  playStreak() {
    if (this.muted) return;
    // High celebratory fanfare
    [587.33, 739.99, 880.00, 1174.66].forEach((freq, idx) => {
      this.playTone(freq, "triangle", 0.2, idx * 0.08, 0.18);
    });
  }

  playGameOver() {
    if (this.muted) return;
    this.playTone(392, "sawtooth", 0.25, 0, 0.15);
    this.playTone(349.23, "sawtooth", 0.25, 0.18, 0.15);
    this.playTone(329.63, "sawtooth", 0.35, 0.36, 0.15);
    this.playTone(261.63, "sawtooth", 0.5, 0.54, 0.2);
  }
}

const soundManager = new SoundManager();
