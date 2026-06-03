import React from 'react';
import { useProjectStore } from '../../store/projectStore';
import { 
  Sliders, Type, Volume2, Move, Sun, Sparkles
} from 'lucide-react';

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

  // Visual Effects Sliders Helper (Group A)
  const getEffectVal = (type: string) => clip.effects.find(e => e.type === type)?.intensity || 0;
  const isEffectEnabled = (type: string) => clip.effects.find(e => e.type === type)?.enabled || false;
  
  const handleToggleEffect = (type: string) => {
    const exists = clip.effects.some(e => e.type === type);
    if (exists) {
      handleUpdate({
        effects: clip.effects.map(e => e.type === type ? { ...e, enabled: !e.enabled } : e)
      });
    } else {
      handleUpdate({
        effects: [...clip.effects, { id: `fx_${type}`, type, intensity: 0.5, enabled: true }]
      });
    }
  };

  const handleEffectIntensity = (type: string, val: number) => {
    handleUpdate({
      effects: clip.effects.map(e => e.type === type ? { ...e, intensity: val } : e)
    });
  };

  // Transitions Helper (Group B)
  const isTransitionEnabled = (type: 'fade' | 'zoom-in' | 'dissolve') => {
    return clip.transitions.some(t => t.type === type);
  };

  const handleToggleTransition = (type: 'fade' | 'zoom-in' | 'dissolve') => {
    const exists = clip.transitions.some(t => t.type === type);
    if (exists) {
      handleUpdate({
        transitions: clip.transitions.filter(t => t.type !== type)
      });
    } else {
      handleUpdate({
        transitions: [...clip.transitions, { type, duration: 1.0 }]
      });
    }
  };

  const handleTransitionDuration = (type: 'fade' | 'zoom-in' | 'dissolve', dur: number) => {
    handleUpdate({
      transitions: clip.transitions.map(t => t.type === type ? { ...t, duration: dur } : t)
    });
  };

  // Title templates preset applying (Group D)
  const applyTitlePreset = (preset: 'lower-third' | 'cinematic-title' | 'neon-sign') => {
    if (!clip.textConfig) return;
    
    if (preset === 'lower-third') {
      handleUpdate({
        textConfig: {
          ...clip.textConfig,
          font: 'Montserrat',
          fontSize: 32,
          color: '#ffffff',
          backgroundColor: 'rgba(79, 70, 229, 0.9)', // Solid Indigo
          align: 'left',
          bold: true,
        },
        position: { x: -400, y: 320 },
        textAnimation: 'typewriter',
        textAnimationDuration: 1.5
      });
    } else if (preset === 'cinematic-title') {
      handleUpdate({
        textConfig: {
          ...clip.textConfig,
          font: 'Playfair Display',
          fontSize: 68,
          color: '#f8fafc',
          backgroundColor: 'transparent',
          align: 'center',
          bold: true,
          italic: true,
        },
        position: { x: 0, y: 0 },
        textAnimation: 'fade',
        textAnimationDuration: 2.0
      });
    } else if (preset === 'neon-sign') {
      handleUpdate({
        textConfig: {
          ...clip.textConfig,
          font: 'Outfit',
          fontSize: 48,
          color: '#f472b6',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          align: 'center',
          borderWidth: 2,
          borderColor: '#db2777',
          shadowColor: '#db2777',
          shadowBlur: 12,
        },
        position: { x: 0, y: -50 },
        textAnimation: 'fade',
        textAnimationDuration: 1.0
      });
    }
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
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <Move size={12} /> Transformación
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-405">Posición X</label>
              <input
                type="number"
                value={clip.position.x}
                onChange={(e) => handleUpdate({ position: { ...clip.position, x: parseInt(e.target.value) || 0 } })}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-405">Posición Y</label>
              <input
                type="number"
                value={clip.position.y}
                onChange={(e) => handleUpdate({ position: { ...clip.position, y: parseInt(e.target.value) || 0 } })}
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-405">Escala ({(clip.scale * 100).toFixed(0)}%)</span>
              <button onClick={() => handleUpdate({ scale: 1 })} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
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
              <span className="text-slate-450">Rotación ({clip.rotation}°)</span>
              <button onClick={() => handleUpdate({ rotation: 0 })} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
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
            <span className="text-[10px] text-slate-405">Opacidad ({(clip.opacity * 100).toFixed(0)}%)</span>
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
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Type size={12} /> Ajustes de Texto
            </h4>

            {/* Quick Templates presets (Group D) */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-405 font-bold uppercase block">Plantillas de Título</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => applyTitlePreset('lower-third')}
                  className="rounded bg-indigo-950/30 border border-indigo-900/50 py-1 text-[9px] font-semibold text-indigo-300 hover:bg-indigo-900/40"
                >
                  Tercio Inf.
                </button>
                <button
                  onClick={() => applyTitlePreset('cinematic-title')}
                  className="rounded bg-slate-800 py-1 text-[9px] font-semibold text-slate-350 hover:bg-slate-750"
                >
                  Cinemático
                </button>
                <button
                  onClick={() => applyTitlePreset('neon-sign')}
                  className="rounded bg-pink-950/20 border border-pink-900/40 py-1 text-[9px] font-semibold text-pink-300 hover:bg-pink-900/30"
                >
                  Neón
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-405">Contenido</label>
              <textarea
                value={clip.textConfig.text}
                onChange={(e) => handleTextConfigChange('text', e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* Font selector with premium options (Group D) */}
            <div>
              <label className="text-[10px] text-slate-405">Fuente</label>
              <select
                value={clip.textConfig.font}
                onChange={(e) => handleTextConfigChange('font', e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Arial">Arial</option>
                <option value="Inter">Inter (Estándar)</option>
                <option value="Montserrat">Montserrat (Moderno)</option>
                <option value="Playfair Display">Playfair Display (Elegante)</option>
                <option value="Space Mono">Space Mono (Retro)</option>
                <option value="Outfit">Outfit (Geométrica)</option>
              </select>
            </div>

            {/* Animations (Group D) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-405">Animación</label>
                <select
                  value={clip.textAnimation || 'none'}
                  onChange={(e) => handleUpdate({ textAnimation: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-[10px] text-slate-200 focus:outline-none"
                >
                  <option value="none">Ninguna</option>
                  <option value="fade">Fade In</option>
                  <option value="typewriter">Máquina escribir</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-450">Duración Anim (s)</label>
                <input
                  type="number"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={clip.textAnimationDuration || 1.0}
                  onChange={(e) => handleUpdate({ textAnimationDuration: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-850 pt-2">
              <div>
                <label className="text-[10px] text-slate-405 font-medium">Color Texto</label>
                <input
                  type="color"
                  value={clip.textConfig.color}
                  onChange={(e) => handleTextConfigChange('color', e.target.value)}
                  className="mt-1 block h-7 w-full cursor-pointer rounded bg-slate-950 p-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-405 font-medium">Color Fondo</label>
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
                  Hacer transparente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-405">Tamaño Letra</label>
                <input
                  type="number"
                  min="8"
                  max="150"
                  value={clip.textConfig.fontSize}
                  onChange={(e) => handleTextConfigChange('fontSize', parseInt(e.target.value) || 12)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-405">Espesor Borde</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={clip.textConfig.borderWidth}
                  onChange={(e) => handleTextConfigChange('borderWidth', parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-2">
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

        {/* Transitions config (Group B) */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <Sparkles size={12} /> Transiciones de Entrada/Salida
          </h4>
          
          <div className="space-y-2">
            {/* Fade In */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-350">Fade In (Entrada)</span>
              <input
                type="checkbox"
                checked={isTransitionEnabled('fade')}
                onChange={() => handleToggleTransition('fade')}
                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
              />
            </div>
            {isTransitionEnabled('fade') && (
              <div className="pl-4">
                <label className="text-[9px] text-slate-500">Duración (s)</label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={clip.transitions.find(t => t.type === 'fade')?.duration || 1.0}
                  onChange={(e) => handleTransitionDuration('fade', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}

            {/* Zoom In */}
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-slate-350">Zoom In (Entrada)</span>
              <input
                type="checkbox"
                checked={isTransitionEnabled('zoom-in')}
                onChange={() => handleToggleTransition('zoom-in')}
                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
              />
            </div>
            {isTransitionEnabled('zoom-in') && (
              <div className="pl-4">
                <label className="text-[9px] text-slate-500">Duración (s)</label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={clip.transitions.find(t => t.type === 'zoom-in')?.duration || 1.0}
                  onChange={(e) => handleTransitionDuration('zoom-in', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}

            {/* Fade Out */}
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-slate-350">Fade Out (Salida)</span>
              <input
                type="checkbox"
                checked={isTransitionEnabled('dissolve')}
                onChange={() => handleToggleTransition('dissolve')}
                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
              />
            </div>
            {isTransitionEnabled('dissolve') && (
              <div className="pl-4">
                <label className="text-[9px] text-slate-500">Duración (s)</label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={clip.transitions.find(t => t.type === 'dissolve')?.duration || 1.0}
                  onChange={(e) => handleTransitionDuration('dissolve', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Audio controls (Group C fades/ducking) */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Volume2 size={12} /> Audio & Fades
            </h4>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-405">Volumen ({(clip.volume * 100).toFixed(0)}%)</span>
                <span className="text-[9px] text-slate-500">{clip.volume === 0 ? 'Mutado' : 'Activo'}</span>
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

            {/* EQ Presets (Group C) */}
            <div>
              <label className="text-[10px] text-slate-405">Ecualizador de Audio</label>
              <select
                value={clip.audioEqPreset || 'flat'}
                onChange={(e) => handleUpdate({ audioEqPreset: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200"
              >
                <option value="flat">Estándar (Flat)</option>
                <option value="bass-boost">Refuerzo de Bajos (Bass Boost)</option>
                <option value="vocal-booster">Claridad Vocal (Vocal Boost)</option>
                <option value="treble-boost">Refuerzo Agudos (Treble Boost)</option>
              </select>
            </div>

            {/* Audio Ducking (Group C) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-350">Atenuación Automática (Ducking)</span>
              <input
                type="checkbox"
                checked={clip.audioDucking || false}
                onChange={(e) => handleUpdate({ audioDucking: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
                title="Baja el volumen de otras pistas cuando esta se reproduce"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-850 pt-2">
              <div>
                <label className="text-[9px] text-slate-500">Audio Fade In (s)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={clip.audioFadeIn || 0}
                  onChange={(e) => handleUpdate({ audioFadeIn: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500">Audio Fade Out (s)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={clip.audioFadeOut || 0}
                  onChange={(e) => handleUpdate({ audioFadeOut: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-405">Velocidad ({clip.speed}x)</span>
                <button onClick={() => handleUpdate({ speed: 1 })} className="text-[8px] text-indigo-400 hover:underline">Normal</button>
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

        {/* Color Correction & LUT Presets (Group A) */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Sun size={12} /> Corrección de Color & LUTs
            </h4>

            {/* LUT Presets (Group A) */}
            <div>
              <label className="text-[10px] text-slate-405">Filtros Cinematográficos (LUTs)</label>
              <select
                value={clip.lutPreset || 'none'}
                onChange={(e) => handleUpdate({ lutPreset: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="none">Sin Filtro</option>
                <option value="cinematic">Cinemático (Teal & Orange)</option>
                <option value="cyberpunk">Neón Cyberpunk</option>
                <option value="warm-sunset">Atardecer Cálido</option>
                <option value="cold-winter">Invierno Frío</option>
                <option value="sepia">Sepia Vintage</option>
                <option value="noir">Noir Blanco y Negro</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-405">Brillo ({(clip.colorFilters.brightness * 100).toFixed(0)}%)</span>
                <button onClick={() => handleFilterChange('brightness', 1)} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
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
                <span className="text-slate-405">Contraste ({(clip.colorFilters.contrast * 100).toFixed(0)}%)</span>
                <button onClick={() => handleFilterChange('contrast', 1)} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
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
                <span className="text-slate-405">Saturación ({(clip.colorFilters.saturation * 100).toFixed(0)}%)</span>
                <button onClick={() => handleFilterChange('saturation', 1)} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
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

        {/* Visual Effects Toggles & Sliders (Group A) */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Sparkles size={12} /> Efectos Especiales
            </h4>

            {/* Blur effect */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-350">Desfoque Gaussian (Blur)</span>
                <input
                  type="checkbox"
                  checked={isEffectEnabled('blur')}
                  onChange={() => handleToggleEffect('blur')}
                  className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
                />
              </div>
              {isEffectEnabled('blur') && (
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={getEffectVal('blur')}
                  onChange={(e) => handleEffectIntensity('blur', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              )}
            </div>

            {/* Shake effect */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-350">Movimiento de Cámara (Shake)</span>
                <input
                  type="checkbox"
                  checked={isEffectEnabled('glitch')} // Camera shake mapped to glitch in rendering
                  onChange={() => handleToggleEffect('glitch')}
                  className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
                />
              </div>
              {isEffectEnabled('glitch') && (
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={getEffectVal('glitch')}
                  onChange={(e) => handleEffectIntensity('glitch', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              )}
            </div>

            {/* Vignette effect */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-350">Viñeta (Vignette Shadow)</span>
                <input
                  type="checkbox"
                  checked={isEffectEnabled('vignette')}
                  onChange={() => handleToggleEffect('vignette')}
                  className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
                />
              </div>
              {isEffectEnabled('vignette') && (
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={getEffectVal('vignette')}
                  onChange={(e) => handleEffectIntensity('vignette', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              )}
            </div>

            {/* Film Grain effect */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-350">Grano de Película (Film Grain)</span>
                <input
                  type="checkbox"
                  checked={isEffectEnabled('film-grain')}
                  onChange={() => handleToggleEffect('film-grain')}
                  className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-indigo-500"
                />
              </div>
              {isEffectEnabled('film-grain') && (
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={getEffectVal('film-grain')}
                  onChange={(e) => handleEffectIntensity('film-grain', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PropertiesPanel;
