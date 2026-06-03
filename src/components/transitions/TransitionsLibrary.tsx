import React from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Sparkles, Check, Clock } from 'lucide-react';

interface TransitionItem {
  id: string;
  name: string;
  type: 'fade' | 'zoom-in' | 'dissolve';
  category: 'in' | 'out';
  description: string;
  previewBg: string;
}

const TRANSITIONS_LIST: TransitionItem[] = [
  {
    id: 'tr_fade_in',
    name: 'Fade In (Entrada)',
    type: 'fade',
    category: 'in',
    description: 'Fade from transparent to visible',
    previewBg: 'bg-gradient-to-r from-black via-slate-800 to-indigo-950',
  },
  {
    id: 'tr_zoom_in',
    name: 'Zoom In (Entrada)',
    type: 'zoom-in',
    category: 'in',
    description: 'Zoom from small to full size',
    previewBg: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/50 via-slate-900 to-slate-950',
  },
  {
    id: 'tr_fade_out',
    name: 'Fade Out (Salida)',
    type: 'dissolve',
    category: 'out',
    description: 'Fade from visible to black screen',
    previewBg: 'bg-gradient-to-l from-black via-slate-800 to-indigo-950',
  },
];

export const TransitionsLibrary: React.FC = () => {
  const { selectedClipId, tracks, updateClip } = useProjectStore();

  const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  const handleToggleTransition = (type: 'fade' | 'zoom-in' | 'dissolve') => {
    if (!clip) return;
    const exists = clip.transitions.some((t) => t.type === type);
    if (exists) {
      updateClip(clip.id, {
        transitions: clip.transitions.filter((t) => t.type !== type),
      });
    } else {
      updateClip(clip.id, {
        transitions: [...clip.transitions, { type, duration: 1.0 }],
      });
    }
  };

  const handleDurationChange = (type: 'fade' | 'zoom-in' | 'dissolve', value: number) => {
    if (!clip) return;
    updateClip(clip.id, {
      transitions: clip.transitions.map((t) =>
        t.type === type ? { ...t, duration: value } : t
      ),
    });
  };

  const getTransition = (type: 'fade' | 'zoom-in' | 'dissolve') => {
    return clip?.transitions.find((t) => t.type === type);
  };

  const isTransitionActive = (type: 'fade' | 'zoom-in' | 'dissolve') => {
    return clip?.transitions.some((t) => t.type === type) || false;
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200 select-none">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!clip ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Sparkles size={28} className="mb-2 text-slate-700 animate-pulse" />
            <p className="text-xs">Selecciona un clip en la línea de tiempo para aplicarle transiciones de entrada y salida.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transiciones de Video</div>
            <div className="grid grid-cols-1 gap-3">
              {TRANSITIONS_LIST.map((item) => {
                const active = isTransitionActive(item.type);
                const tr = getTransition(item.type);

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col rounded-lg border overflow-hidden transition-all duration-200 ${
                      active
                        ? 'border-indigo-500 bg-indigo-950/15'
                        : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTransition(item.type)}
                      className="group flex w-full text-left items-center justify-between p-3 transition-colors hover:bg-slate-850"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-20 rounded border border-slate-800 relative overflow-hidden ${item.previewBg}`}>
                          {active && (
                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                              <div className="bg-indigo-650 text-white rounded-full p-0.5 shadow shadow-black flex items-center justify-center">
                                <Check size={8} strokeWidth={4} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[11.5px] font-bold text-slate-200 block group-hover:text-white">
                            {item.name}
                          </span>
                          <span className="text-[9px] text-slate-500 block leading-tight">
                            {item.description}
                          </span>
                        </div>
                      </div>
                      <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        active 
                          ? 'border-indigo-500 bg-indigo-600' 
                          : 'border-slate-800 bg-slate-900 group-hover:border-slate-650'
                      }`}>
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>

                    {/* Transition Duration Slider if Active */}
                    {active && tr && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-900/60 bg-slate-950/30 space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] text-slate-450">
                          <span className="flex items-center gap-1"><Clock size={10} /> Duración de la transición</span>
                          <span className="font-semibold text-indigo-400">{tr.duration.toFixed(1)}s</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="4"
                          step="0.1"
                          value={tr.duration}
                          onChange={(e) => handleDurationChange(item.type, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TransitionsLibrary;
