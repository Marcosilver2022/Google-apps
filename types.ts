
export type AudioData = {
  low: number;
  mid: number;
  high: number;
  beat: number;
  bins: Uint8Array;
  raw: Uint8Array;
};

export type VisualizerConfig = {
  sensitivity: number;
  displacement: number;
  pixelDensity: number;
  brightness: number;
  contrast: number;
  hueShift: number;
  animationSpeed: number;
  pointSize: number;
  lowIntensity: number;
  midIntensity: number;
  highIntensity: number;
  rgbMode: boolean;
  glowIntensity: number;
  renderMode: 'points' | 'mesh';
  bassPulse: number;
  glitchIntensity: number;
  trebleSparkle: number;
  invertColors: boolean;
  spectrumDepth: number;
  autoMode: boolean;
  autoHue: boolean;
  tiltX: number;
  tiltY: number;
  rotation: number;
  shadingIntensity: number;
  metallic: number;
  viscosity: number;
};

export type Preset = {
  id: string;
  name: string;
  config: VisualizerConfig;
};
