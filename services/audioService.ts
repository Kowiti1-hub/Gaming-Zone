
import { BusSize, TerrainType, IndicatorType, WeatherType } from "../types";

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
  private cityTireHissGain: GainNode | null = null; // New rain-specific hiss
  private hornGain: GainNode | null = null;
  private hornPanner: PannerNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenPanner: PannerNode | null = null;

  // Feedback Sounds
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

    // Shared Noise Buffer
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

    // City Ambience - Multi-layered
    this.cityHumGain = this.ctx.createGain();
    this.cityHumGain.gain.value = 0;
    const humNoise = this.ctx.createBufferSource();
    humNoise.buffer = noiseBuffer;
    humNoise.loop = true;
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 120; // Deep city rumble
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
    airFilter.frequency.value = 2200; // Distant city bustle
    airNoise.connect(airFilter);
    airFilter.connect(this.cityAirGain);
    this.cityAirGain.connect(this.masterGain);
    airNoise.start();

    this.cityTireHissGain = this.ctx.createGain();
    this.cityTireHissGain.gain.value = 0;
    const hissNoise = this.ctx.createBufferSource();
    hissNoise.buffer = noiseBuffer;
    hissNoise.loop = true;
    const hissFilter = this.ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 5000; // Tire-on-wet-road hiss
    hissNoise.connect(hissFilter);
    hissFilter.connect(this.cityTireHissGain);
    this.cityTireHissGain.connect(this.masterGain);
    hissNoise.start();

    // Horns with spatial panner
    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.value = 0;
    this.hornPanner = this.ctx.createPanner();
    this.hornGain.connect(this.hornPanner);
    this.hornPanner.connect(this.masterGain);

    // Sirens with spatial panner
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square'; // Harsh emergency sound
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
    
    // Random duration and type
    const isLongBlast = Math.random() > 0.7;
    const duration = isLongBlast ? 0.8 : 0.15;
    const basePitch = 280 + Math.random() * 200;
    
    // Random position in stereo field
    this.hornPanner.positionX.setValueAtTime(Math.random() * 20 - 10, now);
    
    // Dual tone for harmonic richness
    const h1 = this.ctx.createOscillator();
    const h2 = this.ctx.createOscillator();
    h1.type = 'sawtooth';
    h2.type = 'triangle';
    h1.frequency.setValueAtTime(basePitch, now);
    h2.frequency.setValueAtTime(basePitch * 1.5, now);
    
    const individualGain = this.ctx.createGain();
    h1.connect(individualGain);
    h2.connect(individualGain);
    individualGain.connect(this.hornGain);
    
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0, now);
    this.hornGain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    this.hornGain.gain.setValueAtTime(0.06, now + duration);
    this.hornGain.gain.linearRampToValueAtTime(0, now + duration + 0.05);
    
    h1.start(now); h2.start(now);
    h1.stop(now + duration + 0.1); h2.stop(now + duration + 0.1);
  }

  private triggerSiren() {
    if (!this.ctx || !this.sirenGain || !this.sirenOsc || !this.sirenPanner) return;
    const now = this.ctx.currentTime;
    const duration = 5.0;
    
    // Doppler effect simulation: Panning
    const startSide = Math.random() > 0.5 ? -15 : 15;
    this.sirenPanner.positionX.setValueAtTime(startSide, now);
    this.sirenPanner.positionX.linearRampToValueAtTime(-startSide, now + duration);
    
    this.sirenGain.gain.cancelScheduledValues(now);
    this.sirenGain.gain.setValueAtTime(0, now);
    this.sirenGain.gain.linearRampToValueAtTime(0.04, now + 1.5); 
    this.sirenGain.gain.setValueAtTime(0.04, now + duration - 1.5);
    this.sirenGain.gain.linearRampToValueAtTime(0, now + duration);

    // Siren pitch oscillation
    const isWail = Math.random() > 0.5;
    const cycleTime = isWail ? 2.0 : 0.5;
    const steps = (duration / cycleTime) * 2;
    
    for (let i = 0; i < steps; i++) {
      const t = now + (i * (cycleTime / 2));
      const freq = (i % 2 === 0) ? 600 : 1100;
      this.sirenOsc.frequency.exponentialRampToValueAtTime(freq, t);
    }
  }

  private playClick() {
    if (!this.ctx || !this.indicatorGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.015);
    
    const clickGain = this.ctx.createGain();
    osc.connect(clickGain);
    clickGain.connect(this.indicatorGain);
    this.indicatorGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.setValueAtTime(1, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    osc.start();
    osc.stop(now + 0.05);
  }

  public update(speed: number, isAccelerating: boolean, size: BusSize, terrain: TerrainType, indicators: IndicatorType, isStopped: boolean, weather?: WeatherType) {
    if (!this.ctx || !this.initialized) return;

    const time = this.ctx.currentTime + 0.1;
    const isCity = terrain === TerrainType.CITY;
    const isVillage = terrain === TerrainType.VILLAGE;
    const isRaining = weather === WeatherType.RAIN;

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
    const humVolume = isCity ? (0.08 + (speed / 500)) : 0;
    const airVolume = isCity ? 0.05 : 0;
    const hissVolume = (isCity && isRaining) ? (0.04 + (speed / 400)) : 0;
    
    this.cityHumGain!.gain.linearRampToValueAtTime(humVolume, time);
    this.cityAirGain!.gain.linearRampToValueAtTime(airVolume, time);
    this.cityTireHissGain!.gain.linearRampToValueAtTime(hissVolume, time);

    if (isCity && Date.now() - this.lastCityEvent > 4000 + Math.random() * 12000) {
      Math.random() > 0.3 ? this.triggerHorn() : this.triggerSiren();
      this.lastCityEvent = Date.now();
    }

    // --- Village Ambience ---
    this.windGain!.gain.linearRampToValueAtTime(isVillage ? 0.15 : 0, time);
    if (isVillage && Date.now() - this.lastBirdChirp > 6000 + Math.random() * 10000) {
      this.chirpBird();
      this.lastBirdChirp = Date.now();
    }

    // --- Indicators ---
    if (indicators !== IndicatorType.OFF) {
      if (Date.now() - this.lastIndicatorTime > 450) {
        this.playClick();
        this.lastIndicatorTime = Date.now();
      }
    }

    // --- Air Brake Release ---
    if (isStopped && !this.wasStopped && speed < 1) {
      const now = this.ctx.currentTime;
      this.airBrakeGain!.gain.setValueAtTime(0, now);
      this.airBrakeGain!.gain.linearRampToValueAtTime(0.18, now + 0.05);
      this.airBrakeGain!.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    }
    this.wasStopped = isStopped;
  }

  private chirpBird() {
    if (!this.ctx || !this.birdOsc || !this.birdGain) return;
    const now = this.ctx.currentTime;
    this.birdOsc.frequency.setValueAtTime(3200 + Math.random() * 1500, now);
    this.birdGain.gain.setValueAtTime(0, now);
    this.birdGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
    this.birdGain.gain.linearRampToValueAtTime(0, now + 0.12);
  }

  public stop() {
    if (this.ctx) {
      this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      setTimeout(() => { this.ctx?.close(); this.initialized = false; }, 300);
    }
  }
}

export const audioService = new EngineAudioService();
