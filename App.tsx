
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Visualizer } from './components/Visualizer';
import { Sidebar } from './components/Sidebar';
import { AudioEngine } from './services/AudioEngine';
import { VisualizerConfig, AudioData, Preset } from './types';
import { Music, Image as ImageIcon, Play, Pause, Mic, Video, VideoOff, Sparkles, Loader2, Film } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const PRESETS_KEY = 'prismvibe_presets';

const DEFAULT_CONFIG: VisualizerConfig = {
  sensitivity: 1.2,
  displacement: 2.5,
  pixelDensity: 192,
  brightness: 1.0,
  contrast: 1.1,
  hueShift: 0.0,
  animationSpeed: 1.0,
  pointSize: 3.0,
  lowIntensity: 1.0,
  midIntensity: 1.0,
  highIntensity: 1.0,
  rgbMode: true,
  glowIntensity: 0.0,
  renderMode: 'mesh',
  bassPulse: 0.2,
  glitchIntensity: 0.0,
  trebleSparkle: 0.0,
  invertColors: false,
  spectrumDepth: 0.6,
  autoMode: true,
  autoHue: true,
  tiltX: 35.0,
  tiltY: 0.0,
  rotation: 0.0,
  shadingIntensity: 1.2,
  metallic: 0.7,
  viscosity: 0.4,
};

const App: React.FC = () => {
  const [config, setConfig] = useState<VisualizerConfig>(DEFAULT_CONFIG);
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1200');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useMic, setUseMic] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const audioDataRef = useRef<AudioData>({ 
    low: 0, 
    mid: 0, 
    high: 0, 
    beat: 0, 
    bins: new Uint8Array(256),
    raw: new Uint8Array(0) 
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    }
    return () => audioEngineRef.current?.cleanup();
  }, []);

  const savePreset = (name: string) => {
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: name || `Preset ${presets.length + 1}`,
      config: { ...config }
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setVideoUrl(null); // Clear video if new image uploaded
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (useMic) {
        audioEngineRef.current?.stopMic();
        setUseMic(false);
      }
      setIsPlaying(false);
      audioEngineRef.current?.loadAudioFile(file).then(() => {
        setIsPlaying(true);
        audioEngineRef.current?.play();
      });
    }
  };

  const getBase64Image = async (url: string) => {
    return new Promise<{ data: string, mimeType: string }>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Limit max dimension to 1024 to prevent payload issues causing IMAGE_OTHER
        const maxDim = 1024;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           reject(new Error("Could not get canvas context"));
           return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for optimal size/quality ratio
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = (e) => reject(new Error("Failed to load image for processing"));
      img.src = url;
    });
  };

  const handleAIManipulate = async () => {
    if (!aiPrompt.trim() || isGeneratingAI) return;
    setIsGeneratingAI(true);
    setAiStatus('Alchemizing Image...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { data: base64Data, mimeType } = await getBase64Image(imageUrl);

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: aiPrompt },
          ],
        },
      });

      const candidate = result.candidates?.[0];
      
      if (!candidate) {
        throw new Error("No response candidates returned.");
      }

      let imageFound = false;
      const parts = candidate.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
          setVideoUrl(null);
          imageFound = true;
          break;
        }
      }

      if (!imageFound) {
        // If content exists but no image, check text
        const textPart = parts.find(p => p.text);
        if (textPart?.text) {
           alert(`AI Message: ${textPart.text}`);
        } else if (candidate.finishReason && candidate.finishReason !== 'STOP') {
           // Fallback to finishReason if no content helpful
           throw new Error(`Generation blocked: ${candidate.finishReason}`);
        } else {
           throw new Error("No image generated.");
        }
      }

    } catch (error: any) {
      console.error("AI Transmutation failed:", error);
      alert(`Edit Failed: ${error.message || error}`);
    } finally {
      setIsGeneratingAI(false);
      setAiPrompt('');
    }
  };

  const handleAIAnimate = async () => {
    if (!aiPrompt.trim() || isGeneratingAI) return;

    // Mandatory check for Veo models
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
      // Proceed immediately after triggering the dialog to mitigate race conditions
    }

    setIsGeneratingAI(true);
    setAiStatus('Igniting Neural Motion...');
    try {
      // Create new instance right before call to use the latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { data: base64Data, mimeType } = await getBase64Image(imageUrl);

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: aiPrompt,
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setAiStatus('Evolving Motion (ETA 1-2 mins)...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        setVideoUrl(URL.createObjectURL(videoBlob));
      }
    } catch (error) {
      console.error("Neural Animation failed:", error);
      
      const errorStr = JSON.stringify(error);
      const isNotFoundError = errorStr.includes("Requested entity was not found") || 
                           (error instanceof Error && error.message.includes("Requested entity was not found"));

      if (isNotFoundError) {
        // As per guidelines, reset key selection and prompt again
        alert("The selected API key does not have access to video generation or is from an unpaid project. Please select a valid paid API key.");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert(`Animation Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } finally {
      setIsGeneratingAI(false);
      setAiPrompt('');
    }
  };

  const togglePlayback = () => {
    if (useMic) {
      audioEngineRef.current?.stopMic();
      setUseMic(false);
      setIsPlaying(false);
    } else {
      const newState = !isPlaying;
      setIsPlaying(newState);
      if (newState) audioEngineRef.current?.play();
      else audioEngineRef.current?.pause();
    }
  };

  const toggleMic = async () => {
    if (!useMic) {
      const success = await audioEngineRef.current?.startMic();
      if (success) {
        setUseMic(true);
        setIsPlaying(true);
      }
    } else {
      audioEngineRef.current?.stopMic();
      setUseMic(false);
      setIsPlaying(false);
    }
  };

  const toggleRecording = () => {
    if (!canvasRef.current) return;
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const videoStream = canvasRef.current.captureStream(60);
      const audioStream = audioEngineRef.current?.getStream();
      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) tracks.push(...audioStream.getAudioTracks());
      const combinedStream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      try {
        const recorder = new MediaRecorder(combinedStream, { mimeType });
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `prismvibe-${Date.now()}.webm`;
          a.click();
        };
        recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) { console.error('Recording failed:', err); }
    }
  };

  const updateLoop = useCallback(() => {
    if (audioEngineRef.current) {
      audioDataRef.current = audioEngineRef.current.getAudioData();
      if (!useMic) {
        setAudioProgress(audioEngineRef.current.getProgress());
      }
    }
    requestAnimationFrame(updateLoop);
  }, [useMic]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(frame);
  }, [updateLoop]);

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden relative selection:bg-indigo-500/30">
      <div className="flex-grow relative h-full min-w-0">
        <Visualizer 
          config={config} 
          imageUrl={imageUrl} 
          videoUrl={videoUrl}
          audioDataRef={audioDataRef}
          onCanvasReady={(canvas) => { canvasRef.current = canvas; }}
        />
        
        {isGeneratingAI && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div>
              <div className="w-24 h-24 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin relative z-10" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-black text-white tracking-[0.4em] uppercase">{aiStatus}</h2>
            <p className="text-white/30 text-[11px] font-bold mt-4 uppercase tracking-[0.2em] max-w-xs text-center leading-loose">
              Synthesizing cinematic temporal fragments via Veo 3.1 & Gemini
            </p>
          </div>
        )}

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 px-8 py-5 bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl z-40">
          <label className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group" title="Upload Image">
            <ImageIcon size={20} className="text-white/30 group-hover:text-white transition-colors" />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
          <label className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group" title="Upload Audio">
            <Music size={20} className="text-white/30 group-hover:text-white transition-colors" />
            <input type="file" className="hidden" accept="audio/*" onChange={handleAudioUpload} />
          </label>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button onClick={togglePlayback} className="w-14 h-14 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
            {isPlaying && !useMic ? <Pause size={28} className="text-white fill-white" /> : <Play size={28} className="text-white fill-white translate-x-0.5" />}
          </button>
          <button onClick={toggleMic} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all border ${useMic ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'}`}>
            <Mic size={20} className={useMic ? 'animate-pulse' : ''} />
          </button>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
              <span>{useMic ? 'Live Spectral' : 'Buffer'}</span>
              <span>{Math.round(audioProgress * 100)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden w-full">
              <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${audioProgress * 100}%` }} />
            </div>
          </div>
          <button onClick={toggleRecording} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all border ${isRecording ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'}`} title={isRecording ? "Stop Capture" : "Capture WebM Video"}>
            {isRecording ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        </div>
      </div>

      <Sidebar 
        config={config} 
        setConfig={setConfig} 
        resetVisuals={() => setConfig(DEFAULT_CONFIG)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        handleAIManipulate={handleAIManipulate}
        handleAIAnimate={handleAIAnimate}
        isGeneratingAI={isGeneratingAI}
        presets={presets}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
      />
    </div>
  );
};

export default App;
