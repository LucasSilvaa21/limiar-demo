export class Soundscape {
  constructor() { this.enabled = false; this.context = null; }

  async toggle() {
    if (!this.context) this.setup();
    this.enabled = !this.enabled;
    if (this.enabled) await this.context.resume();
    this.master.gain.setTargetAtTime(this.enabled ? .035 : 0, this.context.currentTime, .3);
    return this.enabled;
  }

  setup() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Áudio indisponível');
    this.context = new Audio();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.ambient = this.context.createGain();
    this.ambient.connect(this.master);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    this.master.connect(filter).connect(this.context.destination);
    this.voices = [110, 164.81, 220.2].map((frequency, index) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const gain = this.context.createGain();
      gain.gain.value = [.5, .22, .1][index];
      oscillator.connect(gain).connect(this.ambient);
      oscillator.start();
      return oscillator;
    });
  }

  update(state) {
    if (!this.context || !this.enabled) return;
    this.voices[1].detune.setTargetAtTime(Math.sin(state.phase) * 14, this.context.currentTime, .4);
    this.voices[2].detune.setTargetAtTime((state.balance - .5) * 40, this.context.currentTime, .4);
  }

  async quiet(quiet) {
    if (!this.context) return;
    this.ambient.gain.setTargetAtTime(quiet ? 0 : 1, this.context.currentTime, .15);
    if (document.hidden) await this.context.suspend();
    else if (this.enabled) await this.context.resume();
  }

  mark(position = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const note = this.context.createOscillator();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    pan.pan.value = Math.max(-.8, Math.min(.8, position / 3));
    note.frequency.value = 440 * 2 ** (Math.round((position + 2) * 2) / 12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.1, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
    note.connect(gain).connect(pan).connect(this.master);
    note.start(now);
    note.stop(now + 1.2);
    note.onended = () => { note.disconnect(); gain.disconnect(); pan.disconnect(); };
  }
}
