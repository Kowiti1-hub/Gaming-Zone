
import { BusSize } from "../types";

class EngineAudioService {
  private ctx: AudioContext | null = null;
  private mainOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private mainGain: GainNode | null = null;
  private loadGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Gain for easy cleanup
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15; // Set base global volume
    this.masterGain.connect(this.ctx.destination);

    // Filter to give a "muffled" mechanical feel
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;
    this.filter.connect(this.masterGain);

    // Main Engine Thrum (Sawtooth for mechanical texture)
    this.mainOsc = this.ctx.createOscillator();
    this.mainOsc.type = 'sawtooth';
    this.mainGain = this.ctx.createGain();
    this.mainOsc.connect(this.mainGain);
    this.mainGain.connect(this.filter);

    // Sub Engine Rumble (Triangle for low-end body)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.loadGain = this.ctx.createGain();
    this.subOsc.connect(this.loadGain);
    this.loadGain.connect(this.filter);

    this.mainOsc.start();
    this.subOsc.start();
    this.initialized = true;
  }

  public update(speed: number, isAccelerating: boolean, size: BusSize) {
    if (!this.ctx || !this.mainOsc || !this.subOsc || !this.mainGain || !this.loadGain) return;

    // Bus specific parameters
    let baseFreq = 40;
    let freqMultiplier = 1.2;
    let loadVolume = 0.2;

    switch (size) {
      case BusSize.SMALL:
        baseFreq = 55;
        freqMultiplier = 1.8;
        loadVolume = 0.15;
        break;
      case BusSize.MEDIUM:
        baseFreq = 45;
        freqMultiplier = 1.4;
        loadVolume = 0.25;
        break;
      case BusSize.LARGE:
        baseFreq = 30;
        freqMultiplier = 1.0;
        loadVolume = 0.4;
        break;
    }

    const targetFreq = baseFreq + (speed * freqMultiplier);
    const time = this.ctx.currentTime + 0.1;

    // Smooth frequency transitions
    this.mainOsc.frequency.exponentialRampToValueAtTime(targetFreq, time);
    this.subOsc.frequency.exponentialRampToValueAtTime(targetFreq / 2, time);

    // Adjust volume based on speed (higher speed = more wind/engine noise)
    const idleVolume = 0.4;
    const speedVolume = Math.min(1.0, idleVolume + (speed / 100));
    this.mainGain.gain.linearRampToValueAtTime(speedVolume, time);

    // Acceleration "load" sound
    const targetLoad = isAccelerating ? loadVolume : 0.05;
    this.loadGain.gain.linearRampToValueAtTime(targetLoad, time);

    // Filter cutoff also opens up as speed increases
    const targetFilter = 400 + (speed * 15);
    this.filter!.frequency.linearRampToValueAtTime(targetFilter, time);
  }

  public stop() {
    if (this.ctx) {
      this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        this.ctx?.close();
        this.initialized = false;
      }, 200);
    }
  }
}

export const audioService = new EngineAudioService();
