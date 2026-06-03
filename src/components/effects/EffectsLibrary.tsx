import React, { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Sparkles, Check } from 'lucide-react';

interface EffectItem {
  id: string;
  name: string;
  type: 'lut' | 'special';
  key: any; // lutPreset value OR effect type
  description: string;
  previewBg: string; // Tailwind color or CSS gradient
}

const EFFECTS_LIST: EffectItem[] = [
  // LUTS
  {
    id: 'lut_cinematic',
    name: 'Cinemático',
    type: 'lut',
    key: 'cinematic',
    description: 'Teal & Orange vintage vibe',
    previewBg: 'bg-gradient-to-tr from-cyan-600 to-orange-500',
  },
  {
    id: 'lut_cyberpunk',
    name: 'Cyberpunk',
    type: 'lut',
    key: 'cyberpunk',
    description: 'High contrast neon styling',
    previewBg: 'bg-gradient-to-tr from-fuchsia-600 to-cyan-500',
  },
  {
    id: 'lut_warm_sunset',
    name: 'Atardecer Cálido',
    type: 'lut',
    key: 'warm-sunset',
    description: 'Soft warm golden tones',
    previewBg: 'bg-gradient-to-tr from-amber-600 to-rose-500',
  },
  {
    id: 'lut_cold_winter',
    name: 'Invierno Frío',
    type: 'lut',
    key: 'cold-winter',
    description: 'Cool desaturated blue tones',
    previewBg: 'bg-gradient-to-tr from-slate-400 to-sky-700',
  },
  {
    id: 'lut_sepia',
    name: 'Sepia Retro',
    type: 'lut',
    key: 'sepia',
    description: 'Nostalgic warm brown look',
    previewBg: 'bg-gradient-to-tr from-yellow-800 to-amber-900',
  },
  {
    id: 'lut_noir',
    name: 'Noir B&N',
    type: 'lut',
    key: 'noir',
    description: 'High contrast black and white',
    previewBg: 'bg-gradient-to-tr from-slate-900 via-slate-705 to-slate-400',
  },
  // Special Effects
  {
    id: 'fx_blur',
    name: 'Desfoque Gaussian',
    type: 'special',
    key: 'blur',
    description: 'Soft cinematic blur filter',
    previewBg: 'bg-gradient-to-tr from-indigo-500/50 via-slate-800 to-slate-900 blur-[2px]',
  },
  {
    id: 'fx_glitch',
    name: 'Cámara Shake',
    type: 'special',
    key: 'glitch',
    description: 'Dynamic hand-held camera jitter',
    previewBg: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-indigo-950',
  },
  {
    id: 'fx_vignette',
    name: 'Viñeta Negra',
    type: 'special',
    key: 'vignette',
    description: 'Shadow border for focus depth',
    previewBg: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black',
  },
  {
    id: 'fx_film_grain',
    name: 'Grano de Película',
    type: 'special',
    key: 'film-grain',
    description: 'Vintage analog texture overlay',
    previewBg: 'bg-gradient-to-tr from-slate-800 via-zinc-700 to-slate-900',
  },
];

export const EffectsLibrary: React.FC = () => {
  const { selectedClipId, tracks, updateClip } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'all' | 'luts' | 'special'>('all');

  const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  const handleApplyLut = (lutName: any) => {
    if (!clip) return;
    if (clip.type === 'audio') return;
    updateClip(clip.id, {
      lutPreset: clip.lutPreset === lutName ? 'none' : lutName,
    });
  };

  const handleToggleSpecialEffect = (effectType: string) => {
    if (!clip) return;
    if (clip.type === 'audio') return;
    const exists = clip.effects.some((e) => e.type === effectType);
    if (exists) {
      // Toggle enabled state
      updateClip(clip.id, {
        effects: clip.effects.map((e) =>
          e.type === effectType ? { ...e, enabled: !e.enabled } : e
        ),
      });
    } else {
      // Add new effect
      updateClip(clip.id, {
        effects: [
          ...clip.effects,
          { id: `fx_${effectType}_${Date.now()}`, type: effectType as any, intensity: 0.5, enabled: true },
        ],
      });
    }
  };

  const isLutActive = (lutKey: string) => {
    return clip?.lutPreset === lutKey;
  };

  const isSpecialActive = (effKey: string) => {
    return clip?.effects.some((e) => e.type === effKey && e.enabled) || false;
  };

  const filteredEffects = EFFECTS_LIST.filter((eff) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'luts') return eff.type === 'lut';
    return eff.type === 'special';
  });

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200 select-none">
      {/* Category selector */}
      <div className="flex border-b border-slate-800 bg-slate-950/30">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 text-center py-2 text-xs font-semibold transition-all border-b-2 ${
            activeTab === 'all'
              ? 'text-indigo-400 border-indigo-500 bg-slate-850/20'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setActiveTab('luts')}
          className={`flex-1 text-center py-2 text-xs font-semibold transition-all border-b-2 ${
            activeTab === 'luts'
              ? 'text-indigo-400 border-indigo-500 bg-slate-850/20'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Filtros (LUTs)
        </button>
        <button
          onClick={() => setActiveTab('special')}
          className={`flex-1 text-center py-2 text-xs font-semibold transition-all border-b-2 ${
            activeTab === 'special'
              ? 'text-indigo-400 border-indigo-500 bg-slate-850/20'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          Efectos
        </button>
      </div>

      {/* Library Grid scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!clip ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Sparkles size={28} className="mb-2 text-slate-700 animate-pulse" />
            <p className="text-xs">Selecciona un clip de video o imagen en la línea de tiempo para aplicarle efectos visuales.</p>
          </div>
        ) : clip.type === 'audio' ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Sparkles size={28} className="mb-2 text-slate-700" />
            <p className="text-xs">Los efectos visuales no se pueden aplicar a clips de audio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredEffects.map((item) => {
              const active = item.type === 'lut' ? isLutActive(item.key) : isSpecialActive(item.key);
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    item.type === 'lut'
                      ? handleApplyLut(item.key)
                      : handleToggleSpecialEffect(item.key)
                  }
                  className={`group flex flex-col rounded-lg border text-left overflow-hidden transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-indigo-500/5 ${
                    active
                      ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/35'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  {/* Color/Effect visual block preview */}
                  <div className={`h-16 w-full relative ${item.previewBg} flex items-center justify-center transition-all duration-300 group-hover:brightness-110`}>
                    {active && (
                      <div className="absolute top-1 right-1 bg-indigo-650 text-white rounded-full p-0.5 shadow shadow-black flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-slate-950/40 px-2 py-0.5 rounded backdrop-blur-[1px]">
                      {item.type === 'lut' ? 'LUT' : 'FX'}
                    </span>
                  </div>
                  {/* Name and details */}
                  <div className="p-2 space-y-0.5">
                    <span className="text-[10.5px] font-bold text-slate-200 block truncate group-hover:text-white">
                      {item.name}
                    </span>
                    <span className="text-[8.5px] text-slate-500 block leading-tight truncate">
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default EffectsLibrary;
