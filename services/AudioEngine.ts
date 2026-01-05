
import { AudioData } from '../types';

export class AudioEngine {
  private ctx: AudioContext;
  private analyzer: AnalyserNode;
  private source: MediaElementAudioSourceNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private audio: HTMLAudioElement | null = null;
  private dataArray: Uint8Array;
  private prevDataArray: Uint8Array;
  private bins: Uint8Array;
  private destination: MediaStreamAudioDestinationNode;
  
  // Smoothing and peak detection states
  private lastLow = 0;
  private lastMid = 0;
  private lastHigh = 0;
  private beatIntensity = 0;
  
  // Onset detection states
  private fluxHistory: number[] = [];
  private readonly fluxHistorySize = 20;
  private onsetThreshold = 1.5;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 2048; // Increased for better low-end resolution
    this.analyzer.smoothingTimeConstant = 0.5; // Lower for faster transient detection
    this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.prevDataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.bins = new Uint8Array(256);
    this.destination = this.ctx.createMediaStreamDestination();
    this.analyzer.connect(this.destination);
  }

  getStream() {
    return this.destination.stream;
  }

  async loadAudioFile(file: File) {
    if (this.audio) this.audio.pause();
    const url = URL.createObjectURL(file);
    this.audio = new Audio(url);
    this.audio.crossOrigin = "anonymous";
    this.audio.loop = true;
    
    if (this.source) this.source.disconnect();
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.source.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);
    
    return new Promise((resolve) => {
      this.audio!.oncanplaythrough = resolve;
    });
  }

  async startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.micSource) this.micSource.disconnect();
      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.analyzer);
      return true;
    } catch (e) {
      console.error("Mic access denied", e);
      return false;
    }
  }

  stopMic() {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  play() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.audio?.play();
  }

  pause() {
    this.audio?.pause();
  }

  /**
   * Calculates Spectral Flux: the rate of change in the power spectrum.
   * Useful for onset detection (beats).
   */
  private calculateSpectralFlux(): number {
    let flux = 0;
    // We primarily focus on low to mid frequencies for beat detection (up to ~500Hz)
    const fluxEnd = Math.floor(this.analyzer.frequencyBinCount * 0.2); 
    
    for (let i = 0; i < fluxEnd; i++) {
      const value = this.dataArray[i];
      const prevValue = this.prevDataArray[i];
      // Only sum positive changes (increase in energy)
      const diff = value - prevValue;
      if (diff > 0) flux += diff;
    }
    
    // Normalize flux
    flux /= fluxEnd;
    return flux;
  }

  getAudioData(): AudioData {
    this.prevDataArray.set(this.dataArray);
    this.analyzer.getByteFrequencyData(this.dataArray);
    
    // Calculate Spectral Flux for beat detection
    const currentFlux = this.calculateSpectralFlux();
    this.fluxHistory.push(currentFlux);
    if (this.fluxHistory.length > this.fluxHistorySize) {
      this.fluxHistory.shift();
    }

    // Adaptive thresholding: Compare current flux to rolling average
    const avgFlux = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
    const isOnset = currentFlux > avgFlux * this.onsetThreshold;

    if (isOnset) {
      this.beatIntensity = 1.0;
    } else {
      this.beatIntensity *= 0.92; // Smooth decay
    }

    // Dynamic frequency range mapping (weighted for a more musical response)
    const getWeightedRange = (startFactor: number, endFactor: number, power = 1.0) => {
      const start = Math.floor(this.dataArray.length * startFactor);
      const end = Math.floor(this.dataArray.length * endFactor);
      let max = 0;
      for (let i = start; i < end; i++) {
        if (this.dataArray[i] > max) max = this.dataArray[i];
      }
      return Math.pow(max / 255, power);
    };

    // Sub-bass to Bass (20Hz - 250Hz approx)
    const currentLow = getWeightedRange(0, 0.05, 1.1);
    // Mid-range (250Hz - 4kHz approx)
    const currentMid = getWeightedRange(0.05, 0.25, 1.4);
    // High-end (4kHz - 20kHz approx)
    const currentHigh = getWeightedRange(0.25, 0.8, 1.8);
    
    // Smooth the signals
    this.lastLow = Math.max(currentLow, this.lastLow * 0.94);
    this.lastMid = Math.max(currentMid, this.lastMid * 0.88);
    this.lastHigh = Math.max(currentHigh, this.lastHigh * 0.82);

    // Map frequency bins into 256 bands for visualizer RTA
    // Using a logarithmic-ish mapping to better represent musical octaves
    for (let i = 0; i < 256; i++) {
      // Index mapping that favors low-mid resolution
      const index = Math.floor(Math.pow(i / 256, 1.5) * this.dataArray.length);
      this.bins[i] = this.dataArray[index];
    }

    return {
      low: this.lastLow,
      mid: this.lastMid,
      high: this.lastHigh,
      beat: this.beatIntensity,
      bins: this.bins,
      raw: this.dataArray
    };
  }

  getProgress() {
    if (!this.audio || isNaN(this.audio.duration)) return 0;
    return this.audio.currentTime / this.audio.duration;
  }

  cleanup() {
    this.audio?.pause();
    this.ctx.close();
  }
}
