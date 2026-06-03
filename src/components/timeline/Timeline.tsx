import React, { useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { Track, Clip } from '../../types';
import { 
  Scissors, Trash2, Copy, ZoomIn, ZoomOut, 
  Lock, Unlock, Volume2, VolumeX, Eye, EyeOff, Plus
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const { 
    tracks, currentTime, duration, zoomLevel, selectedClipId,
    setCurrentTime, setZoomLevel, setSelectedClipId, splitClip, 
    duplicateClip, removeClip, updateClip, addTrack,
    toggleLockTrack, toggleMuteTrack, toggleHideTrack
  } = useProjectStore();

  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 's') {
        if (selectedClipId) {
          splitClip(selectedClipId, currentTime);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          removeClip(selectedClipId);
        }
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedClipId) {
          duplicateClip(selectedClipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime]);

  // Handle click on timeline ruler to seek playhead
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + rulerRef.current.scrollLeft;
    const clickedTime = clickX / zoomLevel;
    setCurrentTime(clickedTime);
  };

  // Helper to render seconds markings on ruler
  const renderRulerTicks = () => {
    const ticks = [];
    const maxSeconds = Math.max(duration + 10, 30); // Render slightly past duration
    const spacing = zoomLevel > 60 ? 1 : zoomLevel > 30 ? 5 : 10; // Spacing of labels based on zoom

    for (let s = 0; s <= maxSeconds; s++) {
      const isLabeled = s % spacing === 0;
      ticks.push(
        <div 
          key={s} 
          className="absolute border-l border-slate-700 h-2 top-4 flex flex-col justify-end"
          style={{ left: `${s * zoomLevel}px` }}
        >
          {isLabeled && (
            <span className="text-[8px] text-slate-500 -ml-2 -mt-4 absolute">
              {formatTime(s)}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Clip Dragging Logic
  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip, track: Track) => {
    if (track.isLocked) return;
    e.stopPropagation();
    setSelectedClipId(clip.id);

    const startX = e.clientX;
    const initialStart = clip.timelineStart;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoomLevel;
      let newStart = initialStart + deltaSeconds;

      // Snapping to other clips starts or ends, or playhead
      const snapThreshold = 0.2; // 200ms threshold
      let snapped = false;

      // 1. Snap to Playhead
      if (Math.abs(newStart - currentTime) < snapThreshold) {
        newStart = currentTime;
        snapped = true;
      } else if (Math.abs((newStart + clip.duration) - currentTime) < snapThreshold) {
        newStart = currentTime - clip.duration;
        snapped = true;
      }

      // 2. Snap to other clips in all tracks
      if (!snapped) {
        for (const t of tracks) {
          for (const c of t.clips) {
            if (c.id === clip.id) continue;
            // Snap clip start to other clip end
            if (Math.abs(newStart - (c.timelineStart + c.duration)) < snapThreshold) {
              newStart = c.timelineStart + c.duration;
              snapped = true;
              break;
            }
            // Snap clip end to other clip start
            if (Math.abs((newStart + clip.duration) - c.timelineStart) < snapThreshold) {
              newStart = c.timelineStart - clip.duration;
              snapped = true;
              break;
            }
          }
          if (snapped) break;
        }
      }

      newStart = Math.max(0, newStart);
      updateClip(clip.id, { timelineStart: newStart });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Trimming (Resizing) clip edges
  const handleTrimMouseDown = (e: React.MouseEvent, clip: Clip, track: Track, side: 'left' | 'side-right') => {
    if (track.isLocked) return;
    e.stopPropagation();
    
    const startX = e.clientX;
    const initialStart = clip.timelineStart;
    const initialStartTime = clip.startTime;
    const initialEndTime = clip.endTime;
    const speed = clip.speed;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoomLevel;

      if (side === 'left') {
        const deltaSrcSeconds = deltaSeconds * speed;
        let newStartTime = initialStartTime + deltaSrcSeconds;
        newStartTime = Math.max(0, newStartTime);
        
        // Ensure clip doesn't shrink past 0.2s minimum
        if (newStartTime < initialEndTime - 0.2) {
          const actualDeltaSecs = (newStartTime - initialStartTime) / speed;
          updateClip(clip.id, {
            startTime: newStartTime,
            timelineStart: initialStart + actualDeltaSecs
          });
        }
      } else {
        const deltaSrcSeconds = deltaSeconds * speed;
        let newEndTime = initialEndTime + deltaSrcSeconds;
        // Limit newEndTime to max media duration if possible, for images there's no cap or standard is large
        // For simple MVP we cap it or assume standard limits
        const clipSource = useProjectStore.getState().media.find(m => m.id === clip.sourceId);
        const maxSrcDuration = clipSource?.duration || 3600; // default large for images
        
        newEndTime = Math.min(maxSrcDuration, newEndTime);

        if (newEndTime > clip.startTime + 0.2) {
          updateClip(clip.id, {
            endTime: newEndTime
          });
        }
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 border-t border-slate-800">
      
      {/* Timeline Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-850 bg-slate-950/40">
        <div className="flex items-center gap-2">
          {/* Split button */}
          <button
            onClick={() => selectedClipId && splitClip(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
            title="Dividir clip en el cursor (S)"
          >
            <Scissors size={12} />
            Dividir
          </button>

          {/* Duplicate button */}
          <button
            onClick={() => selectedClipId && duplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 transition-colors"
            title="Duplicar clip seleccionado"
          >
            <Copy size={12} />
            Duplicar
          </button>

          {/* Delete button */}
          <button
            onClick={() => selectedClipId && removeClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 rounded bg-red-950/40 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-900 hover:text-red-150 disabled:opacity-40 transition-colors"
            title="Eliminar clip (Delete)"
          >
            <Trash2 size={12} />
            Eliminar
          </button>

          {/* Add Track */}
          <div className="h-4 w-[1px] bg-slate-850 mx-1"></div>
          
          <button
            onClick={() => addTrack('video')}
            className="flex items-center gap-1 rounded bg-slate-850 px-2 py-0.5 text-[9px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Plus size={10} />
            Pista Video
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="flex items-center gap-1 rounded bg-slate-850 px-2 py-0.5 text-[9px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Plus size={10} />
            Pista Audio
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <ZoomOut size={12} className="text-slate-500" />
          <input
            type="range"
            min="10"
            max="120"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <ZoomIn size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-500 font-semibold w-8 text-right">{zoomLevel}px/s</span>
        </div>
      </div>

      {/* Main Track container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden flex relative"
      >
        
        {/* Track Headers (Left sidebar) */}
        <div className="w-48 bg-slate-950 border-r border-slate-850 flex-shrink-0 z-20 select-none">
          {/* Top header corner spacer */}
          <div className="h-8 border-b border-slate-850 bg-slate-950/70"></div>
          
          {tracks.map(track => (
            <div 
              key={track.id} 
              className="h-14 border-b border-slate-850 p-2 flex flex-col justify-between"
            >
              <span className="text-[10px] font-semibold text-slate-300 truncate" title={track.name}>
                {track.name}
              </span>
              <div className="flex gap-2 text-slate-500">
                <button 
                  onClick={() => toggleLockTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isLocked ? 'text-indigo-400' : ''}`}
                  title={track.isLocked ? "Desbloquear pista" : "Bloquear pista"}
                >
                  {track.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
                <button 
                  onClick={() => toggleMuteTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isMuted ? 'text-red-400' : ''}`}
                  title={track.isMuted ? "Activar sonido" : "Silenciar pista"}
                >
                  {track.isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>
                <button 
                  onClick={() => toggleHideTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isHidden ? 'text-amber-400' : ''}`}
                  title={track.isHidden ? "Mostrar pista" : "Ocultar pista"}
                >
                  {track.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tracks Content (Scrollable timeline area) */}
        <div 
          className="flex-1 overflow-x-auto relative"
          onScroll={(e) => {
            // Sync horizontal scroll of headers & ruler if necessary
            if (rulerRef.current) {
              rulerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            }
          }}
        >
          {/* Ruler */}
          <div 
            ref={rulerRef}
            onClick={handleRulerClick}
            className="h-8 border-b border-slate-850 bg-slate-900/50 sticky top-0 cursor-ew-resize z-10 select-none overflow-hidden"
          >
            <div className="relative h-full" style={{ width: `${Math.max(duration + 10, 30) * zoomLevel}px` }}>
              {renderRulerTicks()}
            </div>
          </div>

          {/* Tracks Board */}
          <div 
            className="relative editor-grid-bg bg-[size:32px_32px]"
            style={{ width: `${Math.max(duration + 10, 30) * zoomLevel}px` }}
          >
            
            {tracks.map(track => (
              <div 
                key={track.id} 
                className={`h-14 border-b border-slate-850/50 relative flex items-center ${
                  track.isLocked ? 'bg-slate-950/20' : ''
                } ${track.isHidden ? 'opacity-50' : ''}`}
              >
                {/* Clips in this track */}
                {track.clips.map(clip => {
                  const isSelected = selectedClipId === clip.id;
                  
                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, track)}
                      className={`absolute h-10 rounded border text-left flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-600/35 text-white ring-1 ring-indigo-500' 
                          : track.type === 'text' 
                          ? 'border-amber-700/60 bg-amber-500/20 text-amber-200'
                          : track.type === 'audio'
                          ? 'border-cyan-700/60 bg-cyan-500/20 text-cyan-200'
                          : 'border-emerald-700/60 bg-emerald-500/20 text-emerald-200'
                      }`}
                      style={{
                        left: `${clip.timelineStart * zoomLevel}px`,
                        width: `${clip.duration * zoomLevel}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      {!track.isLocked && (
                        <div 
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'left')}
                          className="w-1.5 h-full bg-slate-400/20 hover:bg-slate-400/60 cursor-col-resize flex-shrink-0 transition-colors"
                          title="Recortar inicio"
                        />
                      )}

                      {/* Clip label info */}
                      <div className="flex-1 px-1.5 truncate text-[9px] pointer-events-none font-semibold">
                        {clip.type === 'text' ? `Text: ${clip.textConfig?.text || 'Empty'}` : clip.id.substring(0, 8)}
                      </div>

                      {/* Right Trim Handle */}
                      {!track.isLocked && (
                        <div 
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'side-right')}
                          className="w-1.5 h-full bg-slate-400/20 hover:bg-slate-400/60 cursor-col-resize flex-shrink-0 transition-colors"
                          title="Recortar final"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead line indicator */}
            <div 
              className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 pointer-events-none z-10"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              {/* Playhead marker pin */}
              <div className="absolute top-0 -ml-[5.5px] w-3 h-3 bg-red-500 border border-white rounded-full shadow-lg shadow-red-500/40"></div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
