
import { BusSize, TerrainType } from "../types";

class EngineAudioService {
  private ctx: AudioContext | null = null;
  private mainOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private turbineOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  
  // Ambient Nodes
  private windNoise: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private birdOsc: OscillatorNode | null = null;
  private birdGain: GainNode | null = null;
  
  private filter: BiquadFilterNode | null = null;
  private mainGain: GainNode | null = null;
  private loadGain: GainNode | null = null;
  private turbineGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private initialized = false;
  private lastBirdChirp = 0;

  public init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Gain for safe volume levels
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.2; 
    this.masterGain.connect(this.ctx.destination);

    // Main Engine Filter (Muffled mechanical character)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 600;
    this.filter.connect(this.masterGain);

    // 1. Main Engine Thrum (Cylinders)
    this.mainOsc = this.ctx.createOscillator();
    this.mainOsc.type = 'sawtooth';
    this.mainGain = this.ctx.createGain();
    this.mainOsc.connect(this.mainGain);
    this.mainGain.connect(this.filter);

    // 2. Sub Engine Rumble (Deep Bass)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.loadGain = this.ctx.createGain();
    this.subOsc.connect(this.loadGain);
    this.loadGain.connect(this.filter);

    // 3. High-pitched Whine (Turbo/Transmission)
    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = 'sine';
    this.turbineGain = this.ctx.createGain();
    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);

    // 4. Road & Wind Noise (White Noise)
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    // Engine Noise Source
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;
    this.noiseNode.connect(this.noiseGain);
    this.noiseGain.connect(noiseFilter);
    noiseFilter.connect(this.masterGain);

    // 5. Ambient Village Wind
    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 200;
    this.windFilter.Q.value = 5;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0; // Starts silent
    this.windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    // 6. Bird Chirps
    this.birdOsc = this.ctx.createOscillator();
    this.birdOsc.type = 'sine';
    this.birdGain = this.ctx.createGain();
    this.birdGain.gain.value = 0;
    this.birdOsc.connect(this.birdGain);
    this.birdGain.connect(this.masterGain);

    this.mainOsc.start();
    this.subOsc.start();
    this.turbineOsc.start();
    this.noiseNode.start();
    this.windNoise.start();
    this.birdOsc.start();
    
    this.initialized = true;
  }

  private chirpBird() {
    if (!this.ctx || !this.birdOsc || !this.birdGain) return;
    const now = this.ctx.currentTime;
    
    // Frequency slide for a "tweet"
    const startFreq = 2500 + Math.random() * 1500;
    this.birdOsc.frequency.setValueAtTime(startFreq, now);
    this.birdOsc.frequency.exponentialRampToValueAtTime(startFreq + 500, now + 0.1);
    
    // Quick gain envelope
    this.birdGain.gain.cancelScheduledValues(now);
    this.birdGain.gain.setValueAtTime(0, now);
    this.birdGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    this.birdGain.gain.linearRampToValueAtTime(0, now + 0.15);
  }

  public update(speed: number, isAccelerating: boolean, size: BusSize, terrain: TerrainType) {
    if (!this.ctx || !this.mainOsc || !this.subOsc || !this.turbineOsc || !this.mainGain || !this.loadGain || !this.turbineGain || !this.noiseGain || !this.windGain) return;

    let baseFreq = 40;
    let freqMultiplier = 1.2;
    let loadVolumeBase = 0.2;
    let turbineIntensity = 0.05;

    switch (size) {
      case BusSize.SMALL:
        baseFreq = 60;
        freqMultiplier = 2.0; 
        loadVolumeBase = 0.15;
        turbineIntensity = 0.02;
        break;
      case BusSize.MEDIUM:
        baseFreq = 45;
        freqMultiplier = 1.4;
        loadVolumeBase = 0.25;
        turbineIntensity = 0.08;
        break;
      case BusSize.LARGE:
        baseFreq = 28;
        freqMultiplier = 0.9; 
        loadVolumeBase = 0.45;
        turbineIntensity = 0.12;
        break;
    }

    const time = this.ctx.currentTime + 0.1;

    // Pitch follows speed
    const engineFreq = baseFreq + (speed * freqMultiplier);
    this.mainOsc.frequency.exponentialRampToValueAtTime(engineFreq, time);
    this.subOsc.frequency.exponentialRampToValueAtTime(engineFreq * 0.5, time);
    this.turbineOsc.frequency.exponentialRampToValueAtTime(engineFreq * 4, time);

    // Idle Logic - Distinct diesel thrumming when stopped or very slow
    const isIdle = speed < 5 && !isAccelerating;
    const now = this.ctx.currentTime;
    
    // Volume modulation for "chug-chug" idle feel
    let idleThrob = 0;
    if (isIdle) {
      // 8Hz throb for a large diesel engine
      idleThrob = Math.sin(now * 12) * 0.08;
    }

    const idleVol = 0.3 + idleThrob;
    const speedVol = idleVol + (speed / 200);
    this.mainGain.gain.linearRampToValueAtTime(Math.max(0.1, speedVol), time);

    const targetLoad = isAccelerating ? loadVolumeBase : 0.05;
    this.loadGain.gain.linearRampToValueAtTime(targetLoad, time);

    const targetWhine = isAccelerating ? turbineIntensity * (1 + speed/50) : 0.01;
    this.turbineGain.gain.linearRampToValueAtTime(targetWhine, time);

    const roadNoiseVol = (speed * speed) / 15000;
    this.noiseGain.gain.linearRampToValueAtTime(roadNoiseVol, time);

    const filterFreq = 400 + (speed * 10) + (isAccelerating ? 200 : (isIdle ? -100 : 0));
    this.filter!.frequency.linearRampToValueAtTime(Math.min(3000, Math.max(200, filterFreq)), time);

    // --- Ambient Village Logic ---
    const isVillage = terrain === TerrainType.VILLAGE;
    const targetWindVol = isVillage ? 0.15 + (Math.sin(Date.now() / 2000) * 0.05) : 0;
    this.windGain.gain.linearRampToValueAtTime(targetWindVol, time);
    
    if (isVillage) {
      // Modulate wind filter for "whistling" through trees/grass
      const windFreq = 200 + (Math.sin(Date.now() / 1500) * 150);
      this.windFilter!.frequency.linearRampToValueAtTime(windFreq, time);

      // Randomly trigger chirps when in village
      if (Date.now() - this.lastBirdChirp > 3000 + Math.random() * 7000) {
        this.chirpBird();
        this.lastBirdChirp = Date.now();
      }
    }
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
