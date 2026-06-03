import React from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Sliders, Type, Volume2, Move, Sun } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const { selectedClipId, tracks, updateClip } = useProjectStore();
  
  // Find selected clip
  const clip = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);

  if (!clip) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-900 p-4 text-center text-slate-500">
        <Sliders size={32} className="mb-2 text-slate-700" />
        <p className="text-xs">Selecciona un clip en la línea de tiempo para ver y editar sus propiedades.</p>
      </div>
    );
  }

  const handleUpdate = (updates: any) => {
    updateClip(clip.id, updates);
  };

  const handleFilterChange = (filterName: string, value: number) => {
    handleUpdate({
      colorFilters: {
        ...clip.colorFilters,
        [filterName]: value
      }
    });
  };

  const handleTextConfigChange = (key: string, value: any) => {
    if (!clip.textConfig) return;
    handleUpdate({
      textConfig: {
        ...clip.textConfig,
        [key]: value
      }
    });
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Sliders size={16} className="text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Propiedades del Elemento</h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Transform / Layout (for Video/Image/Text) */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Move size={12} /> Transformación
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Posición X</label>
              <input
                type="number"
                value={clip.position.x}
                onChange={(e) => handleUpdate({ position: { ...clip.position, x: parseInt(e.target.value) || 0 } })}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Posición Y</label>
              <input
                type="number"
                value={clip.position.y}
                onChange={(e) => handleUpdate({ position: { ...clip.position, y: parseInt(e.target.value) || 0 } })}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Escala ({(clip.scale * 100).toFixed(0)}%)</span>
              <button 
                onClick={() => handleUpdate({ scale: 1 })}
                className="text-[8px] text-indigo-400 hover:underline"
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={clip.scale}
              onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
              className="mt-1 w-full accent-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Rotación ({clip.rotation}°)</span>
              <button 
                onClick={() => handleUpdate({ rotation: 0 })}
                className="text-[8px] text-indigo-400 hover:underline"
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={clip.rotation}
              onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value) })}
              className="mt-1 w-full accent-indigo-500"
            />
          </div>

          <div>
            <span className="text-[10px] text-slate-400">Opacidad ({(clip.opacity * 100).toFixed(0)}%)</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={clip.opacity}
              onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
              className="mt-1 w-full accent-indigo-500"
            />
          </div>
        </div>

        {/* Text Configuration (Only if selected clip is type 'text') */}
        {clip.type === 'text' && clip.textConfig && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Type size={12} /> Ajustes de Texto
            </h4>

            <div>
              <label className="text-[10px] text-slate-400">Contenido</label>
              <textarea
                value={clip.textConfig.text}
                onChange={(e) => handleTextConfigChange('text', e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400">Fuente</label>
              <select
                value={clip.textConfig.font}
                onChange={(e) => handleTextConfigChange('font', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-250 focus:outline-none"
              >
                <option value="Arial">Arial</option>
                <option value="Inter">Inter (Sans-Serif)</option>
                <option value="Impact">Impact (Negrita/Título)</option>
                <option value="Courier New">Courier New (Mono)</option>
                <option value="Georgia">Georgia (Serif)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Color Texto</label>
                <input
                  type="color"
                  value={clip.textConfig.color}
                  onChange={(e) => handleTextConfigChange('color', e.target.value)}
                  className="mt-1 block h-7 w-full cursor-pointer rounded bg-slate-950 p-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Color Fondo</label>
                <input
                  type="color"
                  value={clip.textConfig.backgroundColor === 'transparent' ? '#000000' : clip.textConfig.backgroundColor}
                  onChange={(e) => handleTextConfigChange('backgroundColor', e.target.value)}
                  className="mt-1 block h-7 w-full cursor-pointer rounded bg-slate-950 p-0.5"
                />
                <button
                  onClick={() => handleTextConfigChange('backgroundColor', 'transparent')}
                  className="text-[8px] text-indigo-400 mt-1 hover:underline"
                >
                  Fondo transparente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Tamaño Fuente</label>
                <input
                  type="number"
                  min="8"
                  max="150"
                  value={clip.textConfig.fontSize}
                  onChange={(e) => handleTextConfigChange('fontSize', parseInt(e.target.value) || 12)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Borde</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={clip.textConfig.borderWidth}
                  onChange={(e) => handleTextConfigChange('borderWidth', parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleTextConfigChange('bold', !clip.textConfig?.bold)}
                className={`flex-1 rounded py-1 text-xs font-semibold ${clip.textConfig.bold ? 'bg-indigo-650 text-white' : 'bg-slate-950 text-slate-400'}`}
              >
                N
              </button>
              <button
                onClick={() => handleTextConfigChange('italic', !clip.textConfig?.italic)}
                className={`flex-1 rounded py-1 text-xs italic ${clip.textConfig.italic ? 'bg-indigo-650 text-white' : 'bg-slate-950 text-slate-400'}`}
              >
                K
              </button>
            </div>
          </div>
        )}

        {/* Audio controls (for Video/Audio clips) */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 size={12} /> Audio
            </h4>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Volumen ({(clip.volume * 100).toFixed(0)}%)</span>
                <span className="text-[9px] text-slate-500">{clip.volume === 0 ? 'Silencio' : clip.volume > 1 ? 'Amplificado' : 'Normal'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={clip.volume}
                onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                className="mt-1 w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Velocidad ({clip.speed}x)</span>
                <button 
                  onClick={() => handleUpdate({ speed: 1 })}
                  className="text-[8px] text-indigo-400 hover:underline"
                >
                  Normal
                </button>
              </div>
              <input
                type="range"
                min="0.25"
                max="4"
                step="0.25"
                value={clip.speed}
                onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) })}
                className="mt-1 w-full accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Color Correction (for Video/Image clips) */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sun size={12} /> Corrección de Color
            </h4>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Brillo ({(clip.colorFilters.brightness * 100).toFixed(0)}%)</span>
                <button 
                  onClick={() => handleFilterChange('brightness', 1)}
                  className="text-[8px] text-indigo-400 hover:underline"
                >
                  Reset
                </button>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={clip.colorFilters.brightness}
                onChange={(e) => handleFilterChange('brightness', parseFloat(e.target.value))}
                className="mt-1 w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Contraste ({(clip.colorFilters.contrast * 100).toFixed(0)}%)</span>
                <button 
                  onClick={() => handleFilterChange('contrast', 1)}
                  className="text-[8px] text-indigo-400 hover:underline"
                >
                  Reset
                </button>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={clip.colorFilters.contrast}
                onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
                className="mt-1 w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Saturación ({(clip.colorFilters.saturation * 100).toFixed(0)}%)</span>
                <button 
                  onClick={() => handleFilterChange('saturation', 1)}
                  className="text-[8px] text-indigo-400 hover:underline"
                >
                  Reset
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={clip.colorFilters.saturation}
                onChange={(e) => handleFilterChange('saturation', parseFloat(e.target.value))}
                className="mt-1 w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
