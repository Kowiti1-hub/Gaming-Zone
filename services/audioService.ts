
import { BusSize, TerrainType, IndicatorType } from "../types";

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
  
  // City Ambient Nodes
  private cityHumGain: GainNode | null = null;
  private cityAirGain: GainNode | null = null;
  private hornGain: GainNode | null = null;
  private hornPanner: PannerNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenPanner: PannerNode | null = null;

  // Feedback Sounds
  private indicatorOsc: OscillatorNode | null = null;
  private indicatorGain: GainNode | null = null;
  private airBrakeGain: GainNode | null = null;
  
  private filter: BiquadFilterNode | null = null;
  private mainGain: GainNode | null = null;
  private loadGain: GainNode | null = null;
  private turbineGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private initialized = false;
  private lastBirdChirp = 0;
  private lastCityEvent = 0;
  private lastIndicatorTime = 0;
  private wasStopped = false;

  public init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.25; 
    this.masterGain.connect(this.ctx.destination);

    // Engine Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 600;
    this.filter.connect(this.masterGain);

    // Engine Oscillators
    this.mainOsc = this.ctx.createOscillator();
    this.mainOsc.type = 'sawtooth';
    this.mainGain = this.ctx.createGain();
    this.mainOsc.connect(this.mainGain);
    this.mainGain.connect(this.filter);

    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.loadGain = this.ctx.createGain();
    this.subOsc.connect(this.loadGain);
    this.loadGain.connect(this.filter);

    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = 'sine';
    this.turbineGain = this.ctx.createGain();
    this.turbineOsc.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);

    // Noise Generation
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    
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

    // Village Ambience
    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 200;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0; 
    this.windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.birdOsc = this.ctx.createOscillator();
    this.birdOsc.type = 'sine';
    this.birdGain = this.ctx.createGain();
    this.birdGain.gain.value = 0;
    this.birdOsc.connect(this.birdGain);
    this.birdGain.connect(this.masterGain);

    // City Ambience - Multi-layered hum
    this.cityHumGain = this.ctx.createGain();
    this.cityHumGain.gain.value = 0;
    const humNoise = this.ctx.createBufferSource();
    humNoise.buffer = noiseBuffer;
    humNoise.loop = true;
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 100; // Deep rumble
    humNoise.connect(humFilter);
    humFilter.connect(this.cityHumGain);
    this.cityHumGain.connect(this.masterGain);
    humNoise.start();

    this.cityAirGain = this.ctx.createGain();
    this.cityAirGain.gain.value = 0;
    const airNoise = this.ctx.createBufferSource();
    airNoise.buffer = noiseBuffer;
    airNoise.loop = true;
    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 2500; // Distant road hiss
    airNoise.connect(airFilter);
    airFilter.connect(this.cityAirGain);
    this.cityAirGain.connect(this.masterGain);
    airNoise.start();

    // Horns with spatial panner
    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.value = 0;
    this.hornPanner = this.ctx.createPanner();
    this.hornGain.connect(this.hornPanner);
    this.hornPanner.connect(this.masterGain);

    // Sirens with spatial panner
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenPanner = this.ctx.createPanner();
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sirenPanner);
    this.sirenPanner.connect(this.masterGain);
    this.sirenOsc.start();

    // Feedback nodes
    this.indicatorGain = this.ctx.createGain();
    this.indicatorGain.gain.value = 0;
    this.indicatorGain.connect(this.masterGain);

    this.airBrakeGain = this.ctx.createGain();
    this.airBrakeGain.gain.value = 0;
    const airBrakeNoise = this.ctx.createBufferSource();
    airBrakeNoise.buffer = noiseBuffer;
    airBrakeNoise.loop = true;
    const airBrakeFilter = this.ctx.createBiquadFilter();
    airBrakeFilter.type = 'highpass';
    airBrakeFilter.frequency.value = 4000;
    airBrakeNoise.connect(airBrakeFilter);
    airBrakeFilter.connect(this.airBrakeGain);
    this.airBrakeGain.connect(this.masterGain);
    airBrakeNoise.start();

    this.mainOsc.start();
    this.subOsc.start();
    this.turbineOsc.start();
    this.noiseNode.start();
    this.windNoise.start();
    this.birdOsc.start();
    
    this.initialized = true;
  }

  private triggerHorn() {
    if (!this.ctx || !this.hornGain || !this.hornPanner) return;
    const now = this.ctx.currentTime;
    const duration = 0.1 + Math.random() * 0.3;
    
    // Random position in stereo field
    this.hornPanner.positionX.setValueAtTime(Math.random() * 10 - 5, now);
    
    // Complex dual-tone horn
    const h1 = this.ctx.createOscillator();
    const h2 = this.ctx.createOscillator();
    const h3 = this.ctx.createOscillator();
    h1.type = h2.type = 'triangle';
    h3.type = 'sawtooth';
    const basePitch = 350 + Math.random() * 100;
    h1.frequency.setValueAtTime(basePitch, now);
    h2.frequency.setValueAtTime(basePitch * 1.25, now);
    h3.frequency.setValueAtTime(basePitch * 2, now);
    
    h1.connect(this.hornGain);
    h2.connect(this.hornGain);
    h3.connect(this.hornGain);
    
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0, now);
    this.hornGain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    this.hornGain.gain.setValueAtTime(0.04, now + duration);
    this.hornGain.gain.linearRampToValueAtTime(0, now + duration + 0.05);
    
    h1.start(now); h2.start(now); h3.start(now);
    h1.stop(now + duration + 0.1); h2.stop(now + duration + 0.1); h3.stop(now + duration + 0.1);
  }

  private triggerSiren() {
    if (!this.ctx || !this.sirenGain || !this.sirenOsc || !this.sirenPanner) return;
    const now = this.ctx.currentTime;
    const duration = 4.0;
    
    // Doppler effect simulation: Panning from one side to the other
    const startSide = Math.random() > 0.5 ? -10 : 10;
    this.sirenPanner.positionX.setValueAtTime(startSide, now);
    this.sirenPanner.positionX.linearRampToValueAtTime(-startSide, now + duration);
    
    this.sirenGain.gain.cancelScheduledValues(now);
    this.sirenGain.gain.setValueAtTime(0, now);
    this.sirenGain.gain.linearRampToValueAtTime(0.03, now + 1.0); 
    this.sirenGain.gain.setValueAtTime(0.03, now + duration - 1.0);
    this.sirenGain.gain.linearRampToValueAtTime(0, now + duration);

    for (let i = 0; i < duration * 2; i++) {
      const time = now + (i * 0.5);
      this.sirenOsc.frequency.exponentialRampToValueAtTime(800, time);
      this.sirenOsc.frequency.exponentialRampToValueAtTime(1200, time + 0.25);
    }
  }

  private playClick() {
    if (!this.ctx || !this.indicatorGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
    
    const clickGain = this.ctx.createGain();
    osc.connect(clickGain);
    clickGain.connect(this.indicatorGain);
    this.indicatorGain.gain.setValueAtTime(0.1, now);
    clickGain.gain.setValueAtTime(1, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.start();
    osc.stop(now + 0.05);
  }

  public update(speed: number, isAccelerating: boolean, size: BusSize, terrain: TerrainType, indicators: IndicatorType, isStopped: boolean) {
    if (!this.ctx || !this.initialized) return;

    const time = this.ctx.currentTime + 0.1;
    const isCity = terrain === TerrainType.CITY;
    const isVillage = terrain === TerrainType.VILLAGE;

    // --- Engine Sounds ---
    let baseFreq = 40, freqMult = 1.2, loadBase = 0.2;
    switch (size) {
      case BusSize.SMALL: baseFreq = 60; freqMult = 2.0; loadBase = 0.15; break;
      case BusSize.MEDIUM: baseFreq = 45; freqMult = 1.4; loadBase = 0.25; break;
      case BusSize.LARGE: baseFreq = 28; freqMult = 0.9; loadBase = 0.45; break;
    }

    const isIdle = speed < 5 && !isAccelerating;
    const pulse = isIdle ? Math.pow(Math.sin(this.ctx.currentTime * 7.5 * Math.PI), 2) : 0;
    const engineFreq = baseFreq + (speed * freqMult);
    this.mainOsc!.frequency.exponentialRampToValueAtTime(engineFreq, time);
    this.mainGain!.gain.linearRampToValueAtTime(0.3 + pulse * 0.15 + (speed / 200), time);
    this.loadGain!.gain.linearRampToValueAtTime(isAccelerating ? loadBase : 0.05, time);

    // --- City Ambience ---
    this.cityHumGain!.gain.linearRampToValueAtTime(isCity ? 0.08 : 0, time);
    this.cityAirGain!.gain.linearRampToValueAtTime(isCity ? 0.04 : 0, time);

    if (isCity && Date.now() - this.lastCityEvent > 3000 + Math.random() * 10000) {
      Math.random() > 0.3 ? this.triggerHorn() : this.triggerSiren();
      this.lastCityEvent = Date.now();
    }

    // --- Village Ambience ---
    this.windGain!.gain.linearRampToValueAtTime(isVillage ? 0.15 : 0, time);
    if (isVillage && Date.now() - this.lastBirdChirp > 5000 + Math.random() * 8000) {
      this.chirpBird();
      this.lastBirdChirp = Date.now();
    }

    // --- Indicators ---
    if (indicators !== IndicatorType.OFF) {
      if (Date.now() - this.lastIndicatorTime > 400) {
        this.playClick();
        this.lastIndicatorTime = Date.now();
      }
    }

    // --- Air Brake Release ---
    if (isStopped && !this.wasStopped && speed < 1) {
      const now = this.ctx.currentTime;
      this.airBrakeGain!.gain.setValueAtTime(0, now);
      this.airBrakeGain!.gain.linearRampToValueAtTime(0.15, now + 0.1);
      this.airBrakeGain!.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    }
    this.wasStopped = isStopped;
  }

  private chirpBird() {
    if (!this.ctx || !this.birdOsc || !this.birdGain) return;
    const now = this.ctx.currentTime;
    this.birdOsc.frequency.setValueAtTime(2500 + Math.random() * 1000, now);
    this.birdGain.gain.setValueAtTime(0, now);
    this.birdGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    this.birdGain.gain.linearRampToValueAtTime(0, now + 0.15);
  }

  public stop() {
    if (this.ctx) {
      this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => { this.ctx?.close(); this.initialized = false; }, 200);
    }
  }
}

export const audioService = new EngineAudioService();
