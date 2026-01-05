
import React, { useState } from 'react';
import { VisualizerConfig, Preset } from '../types';
import { Sliders, Maximize2, Palette, Activity, Layers, RefreshCcw, Zap, Sparkles, Wand2, Save, Trash2, FolderOpen, Film, ExternalLink } from 'lucide-react';

interface Props {
  config: VisualizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<VisualizerConfig>>;
  resetVisuals: () => void;
  aiPrompt: string;
  setAiPrompt: (val: string) => void;
  handleAIManipulate: () => void;
  handleAIAnimate: () => void;
  isGeneratingAI: boolean;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
}

export const Sidebar: React.FC<Props> = ({ 
  config, 
  setConfig, 
  resetVisuals, 
  aiPrompt, 
  setAiPrompt, 
  handleAIManipulate, 
  handleAIAnimate,
  isGeneratingAI,
  presets,
  onSavePreset,
  onDeletePreset
}) => {
  const [newPresetName, setNewPresetName] = useState('');

  const update = (key: keyof VisualizerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSavePreset(newPresetName);
    setNewPresetName('');
  };

  return (
    <aside className="w-[360px] h-full bg-[#0a0a0a] border-l border-white/5 flex flex-col shadow-2xl z-30 overflow-y-auto custom-scrollbar">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white">PRISM<span className="text-indigo-500">VIBE</span></h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">ALCHEMIST ENGINE</p>
        </div>
        <div className="p-2 bg-indigo-600/10 rounded-lg">
          <Zap size={16} className="text-indigo-500" />
        </div>
      </div>

      <div className="p-8 space-y-10 pb-20">
        <section className="space-y-6">
          <header className="flex items-center gap-2 text-white/50">
            <FolderOpen size={14} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Saved Alchemies</h3>
          </header>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Name current vibe..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
              <button onClick={handleSave} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all active:scale-95 text-white" title="Save Preset">
                <Save size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
              {presets.length === 0 ? (
                <p className="text-[10px] text-white/20 text-center py-4 uppercase font-bold tracking-widest italic">No saved presets</p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="group flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer" onClick={() => setConfig(preset.config)}>
                    <span className="text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">{preset.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeletePreset(preset.id); }} className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 text-white/30 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="p-6 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 space-y-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles size={14} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Neural Alchemist</h3>
            </div>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-white/20 hover:text-indigo-400 transition-colors flex items-center gap-1">
              Billing Setup <ExternalLink size={10} />
            </a>
          </header>
          
          <div className="space-y-4">
            <textarea 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe image edit (e.g. 'Add a retro filter', 'Make it cyberpunk', 'Remove background')..."
              className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/30 transition-all resize-none font-medium"
            />
            
            <div className="flex gap-2">
              <button 
                disabled={!aiPrompt.trim() || isGeneratingAI}
                onClick={handleAIManipulate}
                className={`flex-1 py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${!aiPrompt.trim() || isGeneratingAI ? 'bg-white/5 text-white/10' : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'}`}
              >
                <Wand2 size={12} /> Magic Edit
              </button>
              <button 
                disabled={!aiPrompt.trim() || isGeneratingAI}
                onClick={handleAIAnimate}
                className={`flex-[1.5] py-3.5 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${!aiPrompt.trim() || isGeneratingAI ? 'bg-white/5 text-white/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'}`}
              >
                <Film size={12} /> Neural Motion
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <header className="flex items-center gap-2 text-white/50">
            <Activity size={14} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Spectral Force</h3>
          </header>
          <ControlSlider label="Input Sensitivity" value={config.sensitivity} min={0.5} max={5} step={0.1} onChange={(v) => update('sensitivity', v)} />
          <ControlSlider label="3D Displacement" value={config.displacement} min={0} max={4} step={0.1} onChange={(v) => update('displacement', v)} />
          <ControlSlider label="Spectra Depth" value={config.spectrumDepth} min={0} max={2.0} step={0.01} onChange={(v) => update('spectrumDepth', v)} />
          <div className="flex flex-col gap-3">
             <Toggle label="Auto-Alchemist Mode" active={config.autoMode} onClick={() => update('autoMode', !config.autoMode)} />
             <Toggle label="Spectrum RGB Boost" active={config.rgbMode} onClick={() => update('rgbMode', !config.rgbMode)} />
          </div>
        </section>

        <section className="space-y-6">
          <header className="flex items-center gap-2 text-white/50">
            <Maximize2 size={14} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Geometry & Lens</h3>
          </header>
          <div className="grid grid-cols-2 gap-4">
            <ControlSlider label="Tilt X" value={config.tiltX} min={-90} max={90} step={1} onChange={(v) => update('tiltX', v)} />
            <ControlSlider label="Tilt Y" value={config.tiltY} min={-90} max={90} step={1} onChange={(v) => update('tiltY', v)} />
          </div>
          <ControlSlider label="Spin Rate" value={config.rotation} min={-1} max={1} step={0.1} onChange={(v) => update('rotation', v)} />
          <ControlSlider label="Pixel Segments" value={config.pixelDensity} min={64} max={512} step={32} onChange={(v) => update('pixelDensity', v)} />
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button onClick={() => update('renderMode', 'mesh')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.renderMode === 'mesh' ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white/50'}`}>Mesh</button>
            <button onClick={() => update('renderMode', 'points')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.renderMode === 'points' ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white/50'}`}>Points</button>
          </div>
        </section>

        <section className="space-y-6">
          <header className="flex items-center gap-2 text-white/50">
            <Palette size={14} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Chromatic Array</h3>
          </header>
          <ControlSlider label="Brightness" value={config.brightness} min={0.5} max={2} step={0.01} onChange={(v) => update('brightness', v)} />
          <ControlSlider label="Metallic Shine" value={config.metallic} min={0} max={1} step={0.01} onChange={(v) => update('metallic', v)} />
          <ControlSlider label="Fluid Viscosity" value={config.viscosity} min={0} max={1} step={0.01} onChange={(v) => update('viscosity', v)} />
          <div className="flex flex-col gap-3">
            <Toggle label="Dynamic Hue Cycling" active={config.autoHue} onClick={() => update('autoHue', !config.autoHue)} />
            <Toggle label="Negative Inversion" active={config.invertColors} onClick={() => update('invertColors', !config.invertColors)} />
          </div>
        </section>

        <button onClick={resetVisuals} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/50 transition-all flex items-center justify-center gap-2">
          <RefreshCcw size={14} /> Reset Configuration
        </button>
      </div>
    </aside>
  );
};

const ControlSlider = ({ label, value, min, max, step, onChange }: any) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-center px-1">
      <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">{label}</span>
      <span className="text-[10px] font-mono text-indigo-400 font-bold">{value.toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:bg-white/15 transition-all" />
  </div>
);

const Toggle = ({ label, active, onClick }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer" onClick={onClick}>
    <label className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</label>
    <div className={`w-8 h-4 rounded-full transition-all relative ${active ? 'bg-indigo-600' : 'bg-white/10'}`}>
      <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${active ? 'left-5' : 'left-1'}`} />
    </div>
  </div>
);
