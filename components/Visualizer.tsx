
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VisualizerConfig, AudioData } from '../types';

interface VisualizerProps {
  config: VisualizerConfig;
  imageUrl: string;
  videoUrl: string | null;
  audioDataRef: React.MutableRefObject<AudioData>;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ config, imageUrl, videoUrl, audioDataRef, onCanvasReady }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const configRef = useRef(config);
  
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const state = useRef({
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(70, 1, 0.1, 1000),
    renderer: null as THREE.WebGLRenderer | null,
    material: null as THREE.ShaderMaterial | null,
    mesh: null as THREE.Mesh | THREE.Points | null,
    texture: null as THREE.Texture | null,
    dataTexture: null as THREE.DataTexture | null,
    clock: new THREE.Clock(),
    frameId: 0,
    initialized: false
  }).current;

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current || state.initialized) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;
    onCanvasReady(renderer.domElement);

    state.camera.aspect = width / height;
    state.camera.position.z = 12;
    state.camera.updateProjectionMatrix();

    const dataTexture = new THREE.DataTexture(new Uint8Array(256), 256, 1, THREE.RedFormat);
    dataTexture.needsUpdate = true;
    state.dataTexture = dataTexture;

    const render = () => {
      if (state.renderer && state.material) {
        const audio = audioDataRef.current;
        const u = state.material.uniforms;
        const time = state.clock.getElapsedTime();
        const isAuto = configRef.current.autoMode;

        // Base Uniforms
        u.uTime.value = time * configRef.current.animationSpeed;
        u.uLow.value = audio.low;
        u.uMid.value = audio.mid;
        u.uHigh.value = audio.high;
        u.uBeat.value = audio.beat;
        u.uBeatAccum.value += audio.beat * 0.05;

        // Auto-Alchemist: Autonomous Modulation
        if (isAuto) {
          // Dynamic Viscosity and Metallic breath (Faster decay/response time)
          u.uViscosity.value = THREE.MathUtils.lerp(u.uViscosity.value, 0.1 + audio.mid * 0.8, 0.15);
          u.uMetallic.value = THREE.MathUtils.lerp(u.uMetallic.value, 0.3 + Math.sin(time * 0.5) * 0.4 + audio.beat * 0.3, 0.1);
          u.uShading.value = THREE.MathUtils.lerp(u.uShading.value, 0.8 + audio.low * 1.5, 0.1);
          
          // Alter Peaks: Dynamic Displacement Pulse
          const targetDisp = configRef.current.displacement * (1.0 + audio.beat * 0.6);
          u.uDisplacement.value = THREE.MathUtils.lerp(u.uDisplacement.value, targetDisp, 0.2);

          // Autonomous Hue Drift acceleration
          if (configRef.current.autoHue) {
             u.uHueShift.value += (0.01 + audio.beat * 0.05);
          }
        } else {
          u.uViscosity.value = configRef.current.viscosity;
          u.uMetallic.value = configRef.current.metallic;
          u.uShading.value = configRef.current.shadingIntensity;
          u.uHueShift.value = configRef.current.hueShift;
          u.uDisplacement.value = configRef.current.displacement;
        }

        if (audio.bins && state.dataTexture) {
          const texData = state.dataTexture.image.data as Uint8Array;
          for (let i = 0; i < 256; i++) texData[i] = audio.bins[i];
          state.dataTexture.needsUpdate = true;
        }

        if (state.mesh) {
          // Unified Rotation/Tilt (No Auto Spin/Orbit overrides)
          state.mesh.rotation.x = THREE.MathUtils.degToRad(configRef.current.tiltX);
          state.mesh.rotation.y = THREE.MathUtils.degToRad(configRef.current.tiltY);
          state.mesh.rotation.z += configRef.current.rotation * 0.01;

          if (isAuto) {
            // Dynamic FOV Punch (Impact without spin)
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 60 + (audio.beat * 20.0), 0.15);
          } else {
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 65, 0.1);
          }
          state.camera.updateProjectionMatrix();
        }
        state.renderer.render(state.scene, state.camera);
      }
      state.frameId = requestAnimationFrame(render);
    };

    state.frameId = requestAnimationFrame(render);
    state.initialized = true;

    const handleResize = () => {
      if (!mountRef.current || !state.renderer) return;
      state.renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      state.camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      state.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(state.frameId); window.removeEventListener('resize', handleResize); };
  }, []);

  // 2. Texture/Video Loading Pipeline
  useEffect(() => {
    if (!state.initialized) return;

    if (videoUrl) {
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.crossOrigin = 'anonymous';
        videoRef.current = video;
      }
      videoRef.current.src = videoUrl;
      videoRef.current.play();
      
      const vTex = new THREE.VideoTexture(videoRef.current);
      state.texture = vTex;
      if (state.material) state.material.uniforms.uTexture.value = vTex;
    } else {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(imageUrl, (tex) => {
        state.texture = tex;
        if (state.material) {
          state.material.uniforms.uTexture.value = tex;
          state.material.uniforms.uHasTexture.value = 1.0;
        }
      });
    }
  }, [imageUrl, videoUrl, state.initialized]);

  // 3. Geometry Construction
  useEffect(() => {
    if (!state.initialized) return;
    if (state.mesh) { state.scene.remove(state.mesh); state.mesh.geometry.dispose(); (state.mesh.material as THREE.Material).dispose(); }

    const density = Math.floor(config.pixelDensity);
    const geometry = new THREE.PlaneGeometry(24, 18, density, density);
    const material = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide,
      uniforms: {
        uTexture: { value: state.texture || new THREE.Texture() },
        uHasTexture: { value: state.texture ? 1.0 : 0.0 },
        uDataTexture: { value: state.dataTexture },
        uTime: { value: 0 }, uLow: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uBeat: { value: 0 }, uBeatAccum: { value: 0 },
        uSensitivity: { value: config.sensitivity }, uDisplacement: { value: config.displacement }, uPointSize: { value: config.pointSize },
        uBrightness: { value: config.brightness }, uContrast: { value: config.contrast }, uHueShift: { value: 0 },
        uRGBMode: { value: config.rgbMode ? 1.0 : 0.0 }, uInvert: { value: config.invertColors ? 1.0 : 0.0 },
        uSpectrumDepth: { value: config.spectrumDepth }, uAutoMode: { value: config.autoMode ? 1.0 : 0.0 }, uAutoHue: { value: config.autoHue ? 1.0 : 0.0 },
        uRenderMode: { value: config.renderMode === 'points' ? 0.0 : 1.0 }, uShading: { value: config.shadingIntensity },
        uMetallic: { value: config.metallic }, uViscosity: { value: config.viscosity },
      },
      vertexShader: `
        uniform sampler2D uDataTexture;
        uniform float uTime, uLow, uBeat, uBeatAccum, uSensitivity, uDisplacement, uAutoMode, uPointSize, uSpectrumDepth, uRenderMode, uViscosity;
        varying vec2 vUv;
        varying float vAudio, vDepth, vBeat;
        varying vec3 vNormal, vViewDir;
        void main() {
          vUv = uv; vBeat = uBeat; vec3 pos = position;
          float freq = texture2D(uDataTexture, vec2(uv.x, 0.5)).r;
          
          // Non-linear fluid smoothing
          float smoothFreq = mix(freq, sin(freq * 8.0 + uTime) * 0.4 + 0.5, uViscosity * 0.5);
          float spectralDrive = pow(smoothFreq, 2.2) * uSensitivity;
          vAudio = spectralDrive;
          
          // Reduced scale factor for 3D displacement
          float zScale = uDisplacement * (uSpectrumDepth * 8.0);
          
          if (uAutoMode > 0.5) {
            // Toned down beat scaling for displacement
            zScale *= (1.0 + uBeat * 1.2);
            // Smoother, less aggressive ripple wave
            pos.z += sin(length(pos.xy) * (1.2 - uViscosity) - uTime * 2.5 + uBeatAccum) * uBeat * 1.5;
          }
          
          float zOffset = spectralDrive * zScale;
          pos.z += zOffset; vDepth = zOffset;
          
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(cameraPosition - (modelMatrix * vec4(pos, 1.0)).xyz);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          if (uRenderMode < 0.5) {
            gl_PointSize = uPointSize * (1.0 + spectralDrive * 0.5) * (350.0 / -mvPosition.z);
          }
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uHasTexture, uBrightness, uContrast, uHueShift, uAutoHue, uRGBMode, uInvert, uBeat, uRenderMode, uShading, uTime, uAutoMode, uMetallic;
        varying vec2 vUv; varying float vAudio, vDepth, vBeat; varying vec3 vNormal, vViewDir;
        
        vec3 hueShift(vec3 color, float hue) {
          const vec3 k = vec3(0.57735, 0.57735, 0.57735);
          float cosAngle = cos(hue);
          return color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle);
        }
        
        void main() {
          vec3 baseColor;
          if (uHasTexture > 0.5) {
            float shift = (uAutoMode > 0.5) ? vBeat * 0.12 : 0.0;
            baseColor = vec3(
              texture2D(uTexture, vUv + vec2(shift, 0.0)).r, 
              texture2D(uTexture, vUv).g, 
              texture2D(uTexture, vUv - vec2(shift, 0.0)).b
            );
          } else { 
            baseColor = vec3(0.05, 0.05, 0.15 + vAudio * 0.6); 
          }
          
          if (uAutoMode > 0.5) { 
            // Aggressive additive Bloom on beats
            baseColor += vec3(1.4, 0.9, 1.8) * pow(vBeat, 4.0); 
            // Spectral strobe on treble peaks
            if (vBeat > 0.94) { 
              baseColor = 1.0 - baseColor; 
              baseColor += vec3(0.5); 
            } 
          }
          
          // Fresnel & Metallic Shading
          vec3 reflectDir = reflect(-vViewDir, vNormal);
          float spec = pow(max(dot(vViewDir, reflectDir), 0.0), 32.0);
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 4.0);
          
          vec3 metalColor = mix(baseColor, vec3(1.0), uMetallic * 0.4) + spec * uMetallic * 2.5 + fresnel * uMetallic * 0.8;
          vec3 color = mix(baseColor * (1.0 + (vDepth * 0.3 * uShading)), metalColor, uMetallic);
          
          if (uRGBMode > 0.5) { 
            color.r *= (1.0 + vAudio * smoothstep(0.4, 0.0, vUv.x)); 
            color.g *= (1.0 + vAudio * smoothstep(0.2, 0.5, vUv.x) * smoothstep(0.8, 0.5, vUv.x)); 
            color.b *= (1.0 + vAudio * smoothstep(0.6, 1.0, vUv.x)); 
          }
          
          // Dynamic Hue: Baseline + Audio Drive + Beat pulse
          float h = uHueShift;
          if (uAutoHue > 0.5) {
             h += (uTime * 0.25) + (vAudio * 1.5);
          }
          
          color = hueShift(color, h); 
          color = (color - 0.5) * uContrast + 0.5 + (uBrightness - 1.0);
          
          if (uInvert > 0.5) color = 1.0 - color;
          
          // Point Sprites
          if (uRenderMode < 0.5 && dot(2.0 * gl_PointCoord - 1.0, 2.0 * gl_PointCoord - 1.0) > 1.0) discard;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    state.material = material;
    state.mesh = config.renderMode === 'points' ? new THREE.Points(geometry, material) : new THREE.Mesh(geometry, material);
    state.scene.add(state.mesh);
  }, [config.pixelDensity, config.renderMode, state.initialized]);

  useEffect(() => {
    if (state.material) {
      const u = state.material.uniforms;
      u.uSensitivity.value = config.sensitivity; 
      u.uDisplacement.value = config.displacement; 
      u.uPointSize.value = config.pointSize;
      u.uBrightness.value = config.brightness; 
      u.uContrast.value = config.contrast;
      u.uRGBMode.value = config.rgbMode ? 1.0 : 0.0; 
      u.uInvert.value = config.invertColors ? 1.0 : 0.0;
      u.uSpectrumDepth.value = config.spectrumDepth; 
      u.uAutoHue.value = config.autoHue ? 1.0 : 0.0; 
      u.uAutoMode.value = config.autoMode ? 1.0 : 0.0;
    }
  }, [config]);

  return <div ref={mountRef} className="w-full h-full bg-[#000]" />;
};
