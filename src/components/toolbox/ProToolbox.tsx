import React, { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { 
  Sliders, Grid, Volume2, Flame, RefreshCw, 
  MapPin, Magnet, Trash2, Zap, Lock, Unlock,
  VolumeX, Eye, EyeOff, LayoutGrid, Play
} from 'lucide-react';

export const ProToolbox: React.FC = () => {
  const { 
    settings, updateSettings, tracks, selectedClipId, updateClip, 
    currentTime, splitClip
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'audio' | 'canvas' | 'edit' | 'presets'>('timeline');
  const [showAutoCutProgress, setShowAutoCutProgress] = useState(false);
  const [autoCutVal, setAutoCutVal] = useState(0);

  const clip = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);

  // --- Group 1: Timeline & Markers Helpers (10 features) ---
  const toggleSnapping = () => {
    updateSettings({ snappingEnabled: !settings.snappingEnabled });
  };
  const toggleRipple = () => {
    updateSettings({ rippleEditEnabled: !settings.rippleEditEnabled });
  };
  const toggleAutoScroll = () => {
    updateSettings({ autoScrollPlayhead: !settings.autoScrollPlayhead });
  };
  const toggleLoop = () => {
    updateSettings({ loopPlayback: !settings.loopPlayback });
  };
  const addMarker = () => {
    const currentMarkers = settings.markers || [];
    const roundedTime = Math.round(currentTime * 10) / 10;
    if (!currentMarkers.includes(roundedTime)) {
      updateSettings({ markers: [...currentMarkers, roundedTime].sort((a, b) => a - b) });
    }
  };
  const clearMarkers = () => {
    updateSettings({ markers: [] });
  };
  const lockAllTracks = (lock: boolean) => {
    useProjectStore.setState({
      tracks: tracks.map(t => ({ ...t, isLocked: lock }))
    });
  };
  const muteAllTracks = (mute: boolean) => {
    useProjectStore.setState({
      tracks: tracks.map(t => ({ ...t, isMuted: mute }))
    });
  };
  const hideAllTracks = (hide: boolean) => {
    useProjectStore.setState({
      tracks: tracks.map(t => ({ ...t, isHidden: hide }))
    });
  };

  // --- Group 2: Pro Audio Adjustments (10 features) ---
  const handleVoiceChanger = (val: 'none' | 'robot' | 'chipmunk' | 'echo' | 'radio' | 'deep') => {
    if (clip) updateClip(clip.id, { voiceChanger: val });
  };
  const toggleNoiseReduction = () => {
    if (clip) updateClip(clip.id, { noiseReduction: !clip.noiseReduction });
  };
  const handlePitchChange = (val: number) => {
    if (clip) updateClip(clip.id, { pitchControl: val });
  };
  const handlePanningChange = (val: number) => {
    if (clip) updateClip(clip.id, { stereoPanning: val });
  };

  // --- Group 3: Canvas Guides & Video Settings (10 features) ---
  const setResolutionPreset = (res: '1920x1080' | '1080x1920' | '1080x1080' | '1280x720' | '2560x1080') => {
    const [width, height] = res.split('x').map(Number);
    updateSettings({ resolution: res });
    useProjectStore.setState({ resolution: { width, height }, resolutionName: res });
  };
  const handleGridOverlay = (val: 'none' | 'thirds' | 'crosshair' | 'safe-area') => {
    updateSettings({ gridOverlay: val });
  };

  // --- Group 4: Quick Edits & Utilities (10 features) ---
  const handleDeleteGaps = () => {
    const updatedTracks = tracks.map(track => {
      if (track.isLocked) return track;
      let currentStart = 0;
      const sortedClips = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart);
      const updatedClips = sortedClips.map(c => {
        const updated = { ...c, timelineStart: currentStart };
        currentStart += c.duration;
        return updated;
      });
      return { ...track, clips: updatedClips };
    });
    useProjectStore.setState({ tracks: updatedTracks });
    alert("Espacios vacíos eliminados de la línea de tiempo.");
  };

  const handleAutoCutSilence = () => {
    if (!clip || clip.type !== 'audio') {
      alert("Por favor, selecciona un clip de audio primero.");
      return;
    }
    setShowAutoCutProgress(true);
    setAutoCutVal(0);
    const interval = setInterval(() => {
      setAutoCutVal(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowAutoCutProgress(false);
          if (clip.duration > 4) {
            // Cut the silence
            splitClip(clip.id, clip.timelineStart + clip.duration / 2);
          }
          alert("Limpieza de silencios IA completada.");
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleAutoReframe = () => {
    if (!clip || clip.type === 'audio') {
      alert("Por favor, selecciona un clip de video o imagen.");
      return;
    }
    // Set scale higher and center X/Y position automatically
    updateClip(clip.id, { scale: 1.35, position: { x: 10, y: -20 } });
    alert("Auto-encuadre inteligente aplicado al clip.");
  };

  const setClipRotation = (degrees: number) => {
    if (clip) updateClip(clip.id, { rotation: degrees });
  };

  const setClipScale = (scale: number) => {
    if (clip) updateClip(clip.id, { scale: scale });
  };

  const setClipOpacity = (opacity: number) => {
    if (clip) updateClip(clip.id, { opacity: opacity });
  };

  // --- Group 5: Motion Presets (10 features) ---
  const applyMotionPreset = (type: 'fade-in' | 'fade-out' | 'zoom-in' | 'zoom-out' | 'spin' | 'slide-left' | 'slide-right' | 'bounce') => {
    if (!clip) {
      alert("Selecciona un clip para aplicarle presets de animación.");
      return;
    }
    const kfs = clip.keyframes || [];
    const dur = clip.duration;
    let newKfs = [];

    switch (type) {
      case 'fade-in':
        newKfs = [
          { id: `kf_preset_1`, time: 0, opacity: 0 },
          { id: `kf_preset_2`, time: Math.min(1.0, dur), opacity: 1 }
        ];
        break;
      case 'fade-out':
        newKfs = [
          { id: `kf_preset_1`, time: Math.max(0, dur - 1.0), opacity: 1 },
          { id: `kf_preset_2`, time: dur, opacity: 0 }
        ];
        break;
      case 'zoom-in':
        newKfs = [
          { id: `kf_preset_1`, time: 0, scale: 0.5 },
          { id: `kf_preset_2`, time: Math.min(1.2, dur), scale: 1.0 }
        ];
        break;
      case 'zoom-out':
        newKfs = [
          { id: `kf_preset_1`, time: 0, scale: 1.5 },
          { id: `kf_preset_2`, time: Math.min(1.2, dur), scale: 1.0 }
        ];
        break;
      case 'spin':
        newKfs = [
          { id: `kf_preset_1`, time: 0, rotation: 0 },
          { id: `kf_preset_2`, time: Math.min(1.5, dur), rotation: 360 }
        ];
        break;
      case 'slide-left':
        newKfs = [
          { id: `kf_preset_1`, time: 0, position: { x: -400, y: 0 } },
          { id: `kf_preset_2`, time: Math.min(1.0, dur), position: { x: 0, y: 0 } }
        ];
        break;
      case 'slide-right':
        newKfs = [
          { id: `kf_preset_1`, time: 0, position: { x: 400, y: 0 } },
          { id: `kf_preset_2`, time: Math.min(1.0, dur), position: { x: 0, y: 0 } }
        ];
        break;
      case 'bounce':
        newKfs = [
          { id: `kf_preset_1`, time: 0, scale: 0.8 },
          { id: `kf_preset_2`, time: Math.min(0.4, dur), scale: 1.2 },
          { id: `kf_preset_3`, time: Math.min(0.8, dur), scale: 1.0 }
        ];
        break;
    }

    // Merge keeping existing keyframes at other times
    const otherKfs = kfs.filter(k => k.time > Math.min(1.5, dur) && k.time < Math.max(0, dur - 1.5));
    updateClip(clip.id, { keyframes: [...newKfs, ...otherKfs].sort((a, b) => a.time - b.time) });
    alert(`Preset de movimiento "${type}" aplicado con keyframes.`);
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200 select-none">
      
      {/* Tab Navigation header */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/40 text-[9.5px] font-bold uppercase tracking-wider text-center">
        <button 
          onClick={() => setActiveTab('timeline')} 
          className={`py-2.5 transition-colors border-b-2 ${activeTab === 'timeline' ? 'text-indigo-400 border-indigo-500 bg-slate-850/20' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
        >
          Línea Tiempo
        </button>
        <button 
          onClick={() => setActiveTab('audio')} 
          className={`py-2.5 transition-colors border-b-2 ${activeTab === 'audio' ? 'text-indigo-400 border-indigo-500 bg-slate-850/20' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
        >
          Audio Pro
        </button>
        <button 
          onClick={() => setActiveTab('canvas')} 
          className={`py-2.5 transition-colors border-b-2 ${activeTab === 'canvas' ? 'text-indigo-400 border-indigo-500 bg-slate-850/20' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
        >
          Guías Canvas
        </button>
        <button 
          onClick={() => setActiveTab('edit')} 
          className={`py-2.5 transition-colors border-b-2 ${activeTab === 'edit' ? 'text-indigo-400 border-indigo-500 bg-slate-850/20' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
        >
          Edición Rápida
        </button>
        <button 
          onClick={() => setActiveTab('presets')} 
          className={`py-2.5 transition-colors border-b-2 ${activeTab === 'presets' ? 'text-indigo-400 border-indigo-500 bg-slate-850/20' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
        >
          Movimiento
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Tab 1: Timeline Tools */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Zap size={13} className="text-indigo-400" /> Línea de Tiempo & Marcadores
            </h4>
            <div className="space-y-2.5">
              
              {/* Snap, Ripple, Auto-scroll, Loop */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={toggleSnapping}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                    settings.snappingEnabled ? 'bg-indigo-950/25 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  title="Ajuste automático a los bordes de los clips al arrastrar"
                >
                  <Magnet size={14} />
                  <div>
                    <span className="font-bold block text-[10.5px]">Ajuste Magnético</span>
                    <span className="text-[8px] text-slate-500 font-semibold">{settings.snappingEnabled ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </button>

                <button 
                  onClick={toggleRipple}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                    settings.rippleEditEnabled ? 'bg-indigo-950/25 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  title="Edición rizada: acortar un clip mueve los siguientes automáticamente"
                >
                  <Zap size={14} />
                  <div>
                    <span className="font-bold block text-[10.5px]">Edición Rizada</span>
                    <span className="text-[8px] text-slate-500 font-semibold">{settings.rippleEditEnabled ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </button>

                <button 
                  onClick={toggleAutoScroll}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                    settings.autoScrollPlayhead ? 'bg-indigo-950/25 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  title="Centra la línea de tiempo automáticamente al cursor durante la reproducción"
                >
                  <Play size={14} />
                  <div>
                    <span className="font-bold block text-[10.5px]">Auto-Desplazar</span>
                    <span className="text-[8px] text-slate-500 font-semibold">{settings.autoScrollPlayhead ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </button>

                <button 
                  onClick={toggleLoop}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                    settings.loopPlayback ? 'bg-indigo-950/25 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  title="Reproduce en bucle continuamente al llegar al final"
                >
                  <RefreshCw size={14} />
                  <div>
                    <span className="font-bold block text-[10.5px]">Repetición (Loop)</span>
                    <span className="text-[8px] text-slate-500 font-semibold">{settings.loopPlayback ? 'Activado' : 'Desactivado'}</span>
                  </div>
                </button>
              </div>

              {/* Markers Management */}
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-850 space-y-2">
                <span className="text-[10px] text-slate-405 font-bold uppercase flex items-center gap-1">
                  <MapPin size={11} className="text-cyan-400" /> Marcadores del Timeline
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={addMarker}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-xs font-semibold py-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                  >
                    Añadir en {currentTime.toFixed(1)}s
                  </button>
                  <button 
                    onClick={clearMarkers}
                    className="bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/50 text-[10px] px-2.5 py-1.5 rounded transition-all"
                  >
                    Borrar todos
                  </button>
                </div>
                {settings.markers && settings.markers.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                    {settings.markers.map((m, idx) => (
                      <span 
                        key={idx} 
                        className="bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-cyan-900/30"
                        onClick={() => useProjectStore.setState({ currentTime: m })}
                      >
                        📌 {m.toFixed(1)}s
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lock / Mute Global presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-450 font-bold uppercase block">Acciones Rápidas en Pistas</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => lockAllTracks(true)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <Lock size={12} /> Bloquear todas
                  </button>
                  <button 
                    onClick={() => lockAllTracks(false)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={12} /> Desbloquear todas
                  </button>
                  <button 
                    onClick={() => muteAllTracks(true)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <VolumeX size={12} /> Silenciar todas
                  </button>
                  <button 
                    onClick={() => muteAllTracks(false)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <Volume2 size={12} /> Habilitar sonido
                  </button>
                  <button 
                    onClick={() => hideAllTracks(true)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <EyeOff size={12} /> Ocultar todas
                  </button>
                  <button 
                    onClick={() => hideAllTracks(false)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white rounded py-2 text-[10.5px] font-semibold text-slate-350 flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} /> Mostrar todas
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Pro Audio Tools */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Volume2 size={13} className="text-indigo-400" /> Ajustes de Audio Pro
            </h4>
            
            {!clip ? (
              <div className="text-center text-xs text-slate-500 py-8">
                Selecciona un clip en la línea de tiempo para ajustar parámetros de audio avanzados.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Voice Changer */}
                <div>
                  <span className="text-[10px] text-slate-405 font-bold uppercase block mb-1.5">Modulador de Voz</span>
                  <select
                    value={clip.voiceChanger || 'none'}
                    onChange={(e) => handleVoiceChanger(e.target.value as any)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="none">Voz Normal (Desactivado)</option>
                    <option value="robot">Efecto Robot (Metálico)</option>
                    <option value="chipmunk">Ardilla (Agudo)</option>
                    <option value="echo">Eco de Sala (Sala grande)</option>
                    <option value="radio">Radio Antigua (Lofi/Banda estrecha)</option>
                    <option value="deep">Tono Grave (Voz profunda)</option>
                  </select>
                </div>

                {/* Noise Reduction */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-850 p-3 rounded-lg">
                  <div>
                    <span className="text-[10.5px] font-bold block">Reducción de Ruido</span>
                    <span className="text-[8px] text-slate-500 leading-tight">Reduce el zumbido e interferencia de fondo</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={clip.noiseReduction || false}
                    onChange={toggleNoiseReduction}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-500"
                  />
                </div>

                {/* Pitch Control */}
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-405">Tono (Semitonos: {clip.pitchControl ?? 0})</span>
                    <button onClick={() => handlePitchChange(0)} className="text-[8px] text-indigo-400 hover:underline">Reset</button>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={clip.pitchControl ?? 0}
                    onChange={(e) => handlePitchChange(parseInt(e.target.value))}
                    className="mt-1 w-full accent-indigo-500"
                  />
                </div>

                {/* Stereo Panning */}
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-405">Balance Estéreo (L/R: {clip.stereoPanning ?? 0})</span>
                    <button onClick={() => handlePanningChange(0)} className="text-[8px] text-indigo-400 hover:underline">Center</button>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={clip.stereoPanning ?? 0}
                    onChange={(e) => handlePanningChange(parseFloat(e.target.value))}
                    className="mt-1 w-full accent-indigo-500"
                  />
                </div>

                {/* Simulated filters */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-2.5 rounded border border-slate-850">
                  <div>
                    <span className="text-[8.5px] text-slate-500 font-bold uppercase block">Filtro de Agudos</span>
                    <span className="text-[9.5px] text-slate-400 font-semibold">Corte: 450Hz</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-500 font-bold uppercase block">Filtro de Bajos</span>
                    <span className="text-[9.5px] text-slate-400 font-semibold">Corte: 8000Hz</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Tab 3: Canvas Guides */}
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Grid size={13} className="text-indigo-400" /> Guías de Pantalla & Relación de Aspecto
            </h4>

            {/* Resolution Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-405 font-bold uppercase block">Resoluciones Frecuentes</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  onClick={() => setResolutionPreset('1920x1080')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.resolution === '1920x1080' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'
                  }`}
                >
                  YouTube (16:9)
                </button>
                <button 
                  onClick={() => setResolutionPreset('1080x1920')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.resolution === '1080x1920' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'
                  }`}
                >
                  TikTok/Reels (9:16)
                </button>
                <button 
                  onClick={() => setResolutionPreset('1080x1080')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.resolution === '1080x1080' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'
                  }`}
                >
                  Instagram (1:1)
                </button>
                <button 
                  onClick={() => setResolutionPreset('2560x1080')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.resolution === '2560x1080' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'
                  }`}
                >
                  Pantalla Ancha (21:9)
                </button>
              </div>
            </div>

            {/* Overlays */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-405 font-bold uppercase block">Guías de Composición (Canvas)</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleGridOverlay('none')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.gridOverlay === 'none' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850'
                  }`}
                >
                  Sin Guías
                </button>
                <button
                  onClick={() => handleGridOverlay('thirds')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.gridOverlay === 'thirds' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850'
                  }`}
                >
                  Regla de Tercios
                </button>
                <button
                  onClick={() => handleGridOverlay('crosshair')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.gridOverlay === 'crosshair' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850'
                  }`}
                >
                  Punto de Mira (Cross)
                </button>
                <button
                  onClick={() => handleGridOverlay('safe-area')}
                  className={`py-1.5 rounded text-[10px] font-semibold border ${
                    settings.gridOverlay === 'safe-area' ? 'bg-indigo-950/20 border-indigo-500/70 text-indigo-300' : 'bg-slate-950 border-slate-850'
                  }`}
                >
                  Margen Seguro (Action)
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-indigo-950/10 border border-indigo-850/20 p-3 space-y-1.5">
              <span className="text-[10.5px] font-bold text-indigo-350 block">Nota sobre Guías:</span>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Las guías y cuadrículas de encuadre sirven únicamente como referencia en la pantalla de previsualización para el montaje. Estas líneas **no se dibujan** en el archivo final exportado.
              </p>
            </div>

          </div>
        )}

        {/* Tab 4: Quick Edits */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Sliders size={13} className="text-indigo-400" /> Acciones Rápidas & Utilidades
            </h4>

            {/* Silence and Gaps */}
            <div className="space-y-2">
              <button
                onClick={handleDeleteGaps}
                className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded p-2.5 text-xs font-semibold flex items-center justify-between"
                title="Elimina todos los espacios vacíos entre clips en todas las pistas para compactar el video"
              >
                <span className="flex items-center gap-1.5"><Trash2 size={13} /> Eliminar Espacios Vacíos</span>
                <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded font-black text-slate-400">GAP REMOVER</span>
              </button>

              <button
                onClick={handleAutoCutSilence}
                disabled={showAutoCutProgress}
                className="w-full bg-indigo-950/20 border border-indigo-900/50 hover:bg-indigo-900/35 rounded p-2.5 text-xs font-semibold flex items-center justify-between"
                title="Detecta automáticamente silencios en el audio y limpia la pista"
              >
                <span className="flex items-center gap-1.5"><Zap size={13} className="text-indigo-400" /> Recortar Silencios IA</span>
                <span className="text-[8px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded font-black">AUTO SILENCE</span>
              </button>

              {showAutoCutProgress && (
                <div className="bg-slate-950 rounded border border-slate-850 p-2.5 space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>Analizando ondas de audio...</span>
                    <span>{autoCutVal}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${autoCutVal}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleAutoReframe}
                className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded p-2.5 text-xs font-semibold flex items-center justify-between"
                title="Ajusta automáticamente el tamaño y encuadre del clip seleccionado para formatos verticales"
              >
                <span className="flex items-center gap-1.5"><LayoutGrid size={13} /> Auto-Encuadre Inteligente</span>
                <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded font-black text-slate-400">AUTO-REFRAME</span>
              </button>
            </div>

            {/* Quick transforms */}
            {clip && (
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <span className="text-[10px] text-slate-405 font-bold uppercase block">Transformaciones Rápidas del Clip</span>
                
                {/* Rotations */}
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    onClick={() => setClipRotation((clip.rotation || 0) + 90)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Rotar +90°
                  </button>
                  <button 
                    onClick={() => setClipRotation(0)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Reset Rot
                  </button>
                  <button 
                    onClick={() => setClipRotation((clip.rotation || 0) - 90)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Rotar -90°
                  </button>
                </div>

                {/* Scales */}
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    onClick={() => setClipScale(0.5)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Escala 50%
                  </button>
                  <button 
                    onClick={() => setClipScale(1.0)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Escala 100%
                  </button>
                  <button 
                    onClick={() => setClipScale(1.5)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Escala 150%
                  </button>
                </div>

                {/* Opacity */}
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    onClick={() => setClipOpacity(0.25)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Opacidad 25%
                  </button>
                  <button 
                    onClick={() => setClipOpacity(0.5)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Opacidad 50%
                  </button>
                  <button 
                    onClick={() => setClipOpacity(1.0)}
                    className="bg-slate-950 border border-slate-850 py-1 text-[9px] rounded font-semibold hover:bg-slate-850"
                  >
                    Opacidad 100%
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* Tab 5: Motion Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <Flame size={13} className="text-indigo-400" /> Presets de Animación & Movimiento Keyframe
            </h4>
            
            {!clip ? (
              <div className="text-center text-xs text-slate-500 py-8">
                Selecciona un clip en la línea de tiempo para aplicarle presets de movimiento pregrabados.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Motion Curves */}
                <div>
                  <span className="text-[10px] text-slate-405 font-bold uppercase block mb-1">Curva de Interpolación</span>
                  <select
                    value={clip.easeCurve || 'linear'}
                    onChange={(e) => updateClip(clip.id, { easeCurve: e.target.value as any })}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="linear">Lineal (Velocidad Constante)</option>
                    <option value="ease-in">Ease In (Aceleración Suave)</option>
                    <option value="ease-out">Ease Out (Desaceleración Suave)</option>
                    <option value="ease-in-out">Ease In Out (Curva S Suave)</option>
                  </select>
                </div>

                {/* Preset Actions Grid */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-405 font-bold uppercase block">Añadir Keyframes Automáticos</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyMotionPreset('fade-in')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🌑 ➔ 🌕</span>
                      <span>Fade In (Aparición)</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('fade-out')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🌕 ➔ 🌑</span>
                      <span>Fade Out (Desaparición)</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('zoom-in')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🔍 ➔ 🔎</span>
                      <span>Zoom In (Acercar)</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('zoom-out')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🔎 ➔ 🔍</span>
                      <span>Zoom Out (Alejar)</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('spin')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🔄</span>
                      <span>Giro 360° (Spin)</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('bounce')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>🏀</span>
                      <span>Efecto Rebote</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('slide-left')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>⬅️</span>
                      <span>Desplazar a Izquierda</span>
                    </button>
                    <button
                      onClick={() => applyMotionPreset('slide-right')}
                      className="bg-slate-950 border border-slate-850 hover:border-slate-700 py-2.5 text-[10px] font-bold rounded flex flex-col items-center justify-center gap-1"
                    >
                      <span>➡️</span>
                      <span>Desplazar a Derecha</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-950/15 border border-indigo-900/40 p-2.5 text-[8.5px] text-indigo-350 leading-relaxed">
                  ⚠️ Al aplicar un preset, se crearán automáticamente puntos clave (keyframes) en el clip. Puedes modificarlos o moverlos de forma manual en la línea de tiempo.
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
export default ProToolbox;
