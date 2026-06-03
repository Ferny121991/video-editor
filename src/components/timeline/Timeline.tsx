import React, { useRef, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { Track, Clip, MediaType, MediaItem, PropertyKeyframe } from '../../types';
import { 
  Scissors, Trash2, Copy, ZoomIn, ZoomOut, 
  Lock, Unlock, Volume2, VolumeX, Eye, EyeOff, Plus
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const { 
    tracks, currentTime, duration, zoomLevel, selectedClipId, media, settings,
    setCurrentTime, setZoomLevel, setSelectedClipId, splitClip, 
    duplicateClip, removeClip, updateClip, addTrack, addMediaItem, addClipToTrack,
    toggleLockTrack, toggleMuteTrack, toggleHideTrack, detachAudio,
    addAudioKeyframe, updateAudioKeyframe, removeAudioKeyframe,
    updatePropertyKeyframe, removePropertyKeyframe
  } = useProjectStore();

  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    clipId: string;
    type: string;
  } | null>(null);

  // Drag and Drop active highlight track state
  const [activeDragTrackId, setActiveDragTrackId] = useState<string | null>(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const currentTimeRef = useRef(currentTime);
  const selectedClipIdRef = useRef(selectedClipId);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    selectedClipIdRef.current = selectedClipId;
  }, [currentTime, selectedClipId]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 's') {
        if (selectedClipIdRef.current) {
          splitClip(selectedClipIdRef.current, currentTimeRef.current);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipIdRef.current) {
          removeClip(selectedClipIdRef.current);
        }
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedClipIdRef.current) {
          duplicateClip(selectedClipIdRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filmora-style Audio volume envelope keyframe helpers
  const getKeyframePathPoints = (clip: Clip) => {
    const kfs = [...(clip.audioKeyframes || [])].sort((a, b) => a.time - b.time);
    if (kfs.length === 0) {
      const yPercent = (1 - ((clip.volume ?? 1) / 1.5)) * 100;
      return `0,${yPercent} 100,${yPercent}`;
    }
    
    const points = [];
    const firstY = (1 - (kfs[0].volume / 1.5)) * 100;
    points.push(`0,${firstY}`);
    
    kfs.forEach(kf => {
      const x = (kf.time / clip.duration) * 100;
      const y = (1 - (kf.volume / 1.5)) * 100;
      points.push(`${x},${y}`);
    });
    
    const lastY = (1 - (kfs[kfs.length - 1].volume / 1.5)) * 100;
    points.push(`100,${lastY}`);
    
    return points.join(' ');
  };

  const handleKeyframeMouseDown = (
    e: React.MouseEvent, 
    clipId: string, 
    kf: { id: string; time: number; volume: number }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startY = e.clientY;
    const startX = e.clientX;
    const initialVolume = kf.volume;
    const initialTime = kf.time;
    
    const clipContainer = document.getElementById(`clip-container-${clipId}`);
    if (!clipContainer) return;
    
    const rect = clipContainer.getBoundingClientRect();
    const clipWidth = rect.width;
    const clipHeight = rect.height;
    
    const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaX = moveEvent.clientX - startX;
      
      const volumeDelta = -(deltaY / clipHeight) * 1.5;
      let newVolume = initialVolume + volumeDelta;
      newVolume = Math.max(0, Math.min(1.5, newVolume));
      
      const timeDelta = (deltaX / clipWidth) * clip.duration;
      let newTime = initialTime + timeDelta;
      newTime = Math.max(0, Math.min(clip.duration, newTime));
      
      updateAudioKeyframe(clipId, kf.id, { volume: newVolume, time: newTime });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle click-and-drag on timeline ruler to seek playhead continuously (scrubbing)
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;

    const seekToPosition = (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left + rulerRef.current.scrollLeft;
      const clickedTime = Math.max(0, Math.min(duration, clickX / zoomLevel));
      setCurrentTime(clickedTime);
    };

    seekToPosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      seekToPosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Prop keyframe mouse drag handler
  const handlePropKeyframeMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    kf: PropertyKeyframe
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const initialTime = kf.time;

    const clipContainer = document.getElementById(`clip-container-${clipId}`);
    if (!clipContainer) return;

    const rect = clipContainer.getBoundingClientRect();
    const clipWidth = rect.width;

    const clip = tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clip) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const timeDelta = (deltaX / clipWidth) * clip.duration;
      let newTime = initialTime + timeDelta;
      newTime = Math.max(0, Math.min(clip.duration, newTime));

      updatePropertyKeyframe(clipId, kf.id, { time: newTime });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Timeline Scroll Zoom Handler (Ctrl + Scroll)
  const handleTimelineWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 5 : -5;
      setZoomLevel(zoomLevel + zoomDelta);
    } else {
      // Horizontal scroll with scrollwheel
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  // Helper to render seconds markings on ruler
  const renderRulerTicks = () => {
    const ticks = [];
    const maxSeconds = Math.max(duration + 10, 30);
    const spacing = zoomLevel > 60 ? 1 : zoomLevel > 30 ? 5 : 10;

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

      const snapThreshold = 0.25;
      let snapped = false;

      if (Math.abs(newStart - currentTime) < snapThreshold) {
        newStart = currentTime;
        snapped = true;
      } else if (Math.abs((newStart + clip.duration) - currentTime) < snapThreshold) {
        newStart = currentTime - clip.duration;
        snapped = true;
      }

      if (!snapped) {
        for (const t of tracks) {
          for (const c of t.clips) {
            if (c.id === clip.id) continue;
            if (Math.abs(newStart - (c.timelineStart + c.duration)) < snapThreshold) {
              newStart = c.timelineStart + c.duration;
              snapped = true;
              break;
            }
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

  // Trimming clip edges
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
        const clipSource = media.find(m => m.id === clip.sourceId);
        const maxSrcDuration = clipSource?.duration || 3600;
        
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

  // Open right-click context menu
  const handleClipContextMenu = (e: React.MouseEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      clipId: clip.id,
      type: clip.type
    });
  };

  // Desktop/Library drag and drop directly onto a track board
  const handleTrackDrop = async (e: React.DragEvent, track: Track) => {
    e.preventDefault();
    if (track.isLocked) return;

    const libraryItemId = e.dataTransfer.getData('mediaItemId');
    if (libraryItemId) {
      const libraryItem = media.find(m => m.id === libraryItemId);
      if (!libraryItem) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left + e.currentTarget.scrollLeft;
      const dropTime = Math.max(0, dropX / zoomLevel);

      const clipDuration = libraryItem.type === 'image' ? 5 : libraryItem.duration;

      addClipToTrack(track.id, {
        id: `clip_${Date.now()}`,
        type: libraryItem.type,
        sourceId: libraryItem.id,
        startTime: 0,
        endTime: clipDuration,
        timelineStart: dropTime,
        duration: clipDuration,
        position: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        speed: 1,
        colorFilters: { brightness: 1, contrast: 1, saturation: 1 },
        effects: [],
        transitions: [],
        audioFadeIn: 0,
        audioFadeOut: 0
      });
      return;
    }

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = URL.createObjectURL(file);

    let type: MediaType = 'image';
    let category: MediaItem['category'] = 'images';
    if (file.type.startsWith('video/')) {
      type = 'video';
      category = 'videos';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
      category = 'music';
    }

    let duration = 0;
    if (type === 'video' || type === 'audio') {
      const element = document.createElement(type === 'video' ? 'video' : 'audio');
      element.src = url;
      await new Promise<void>((resolve) => {
        element.onloadedmetadata = () => {
          duration = element.duration;
          resolve();
        };
        element.onerror = () => resolve();
      });
    }

    // Register MediaItem
    const mediaItem: MediaItem = {
      id: `media_${Date.now()}`,
      name: file.name,
      type,
      url,
      duration,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      thumbnail: type === 'audio' ? 'music-placeholder' : type === 'image' ? url : '',
      category
    };
    addMediaItem(mediaItem);

    // Calculate drop time relative to track start
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const dropTime = Math.max(0, dropX / zoomLevel);

    const clipDuration = type === 'image' ? 5 : duration;

    addClipToTrack(track.id, {
      id: `clip_${Date.now()}`,
      type,
      sourceId: mediaItem.id,
      startTime: 0,
      endTime: clipDuration,
      timelineStart: dropTime,
      duration: clipDuration,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      speed: 1,
      colorFilters: { brightness: 1, contrast: 1, saturation: 1 },
      effects: [],
      transitions: [],
      audioFadeIn: 0,
      audioFadeOut: 0
    });
  };

  // Render a visual procedural waveform
  const renderWaveform = (clipId: string) => {
    const bars = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const charCode = clipId.charCodeAt(i % clipId.length) || 45;
      const height = Math.abs(Math.sin(i * 0.35) * (charCode % 12)) + 3;
      bars.push(
        <div 
          key={i} 
          className="w-[1.5px] bg-cyan-400/40 rounded-full" 
          style={{ height: `${height * 6}%` }}
        />
      );
    }
    return (
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-40">
        {bars}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 border-t border-slate-800">
      
      {/* Timeline Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-855 bg-slate-950/40">
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

          {/* Detach audio */}
          {selectedClipId && (
            <>
              <div className="h-4 w-[1px] bg-slate-850 mx-1"></div>
              <button
                onClick={() => detachAudio(selectedClipId)}
                className="flex items-center gap-1 rounded bg-indigo-950/30 border border-indigo-900/50 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-900/40 transition-colors"
                title="Separar la pista de audio de este video"
              >
                Separar Audio
              </button>
            </>
          )}

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
          <div className="h-8 border-b border-slate-850 bg-slate-950/70"></div>
          
          {tracks.map(track => (
            <div 
              key={track.id} 
              className="h-14 border-b border-slate-850 p-2 flex flex-col justify-between"
            >
              <span className="text-[10px] font-semibold text-slate-350 truncate" title={track.name}>
                {track.name}
              </span>
              <div className="flex gap-2 text-slate-500">
                <button 
                  onClick={() => toggleLockTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isLocked ? 'text-indigo-400' : ''}`}
                  title={track.isLocked ? "Desbloquear" : "Bloquear"}
                >
                  {track.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
                <button 
                  onClick={() => toggleMuteTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isMuted ? 'text-red-400' : ''}`}
                  title={track.isMuted ? "Activar sonido" : "Silenciar"}
                >
                  {track.isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>
                <button 
                  onClick={() => toggleHideTrack(track.id)} 
                  className={`hover:text-slate-200 ${track.isHidden ? 'text-amber-400' : ''}`}
                  title={track.isHidden ? "Mostrar" : "Ocultar"}
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
          onWheel={handleTimelineWheel}
          onScroll={(e) => {
            if (rulerRef.current) {
              rulerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
            }
          }}
        >
          {/* Ruler */}
          <div 
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-8 border-b border-slate-850 bg-slate-900/50 sticky top-0 cursor-ew-resize z-10 select-none overflow-hidden"
          >
            <div className="relative h-full" style={{ width: `${Math.max(duration + 10, 30) * zoomLevel}px` }}>
              {renderRulerTicks()}
              {settings.markers?.map((marker, idx) => (
                <div 
                  key={idx}
                  className="absolute w-2.5 h-2.5 bg-cyan-400 rotate-45 cursor-pointer z-20 hover:bg-white transition-colors"
                  style={{ 
                    left: `${marker * zoomLevel}px`,
                    marginLeft: '-5px',
                    top: '18px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTime(marker);
                  }}
                  title={`Marcador a los ${marker.toFixed(1)}s (Clic para saltar)`}
                />
              ))}
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
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!track.isLocked && activeDragTrackId !== track.id) {
                    setActiveDragTrackId(track.id);
                  }
                }}
                onDragLeave={() => {
                  if (activeDragTrackId === track.id) {
                    setActiveDragTrackId(null);
                  }
                }}
                onDrop={(e) => {
                  setActiveDragTrackId(null);
                  handleTrackDrop(e, track);
                }}
                className={`h-14 border-b border-slate-850/50 relative flex items-center transition-all ${
                  track.isLocked ? 'bg-slate-955/20' : ''
                } ${track.isHidden ? 'opacity-50' : ''} ${
                  activeDragTrackId === track.id 
                    ? 'bg-indigo-500/10 border-indigo-500/50 border-dashed border-y' 
                    : ''
                }`}
              >
                {/* Clips in this track */}
                {track.clips.map(clip => {
                  const isSelected = selectedClipId === clip.id;
                  const source = media.find(m => m.id === clip.sourceId);
                  
                  return (
                    <div
                      id={`clip-container-${clip.id}`}
                      key={clip.id}
                      onMouseDown={(e) => {
                        if (track.type === 'audio' && (e.altKey || e.ctrlKey)) {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          const relativeTime = (clickX / rect.width) * clip.duration;
                          const volume = (1 - (clickY / rect.height)) * 1.5;
                          addAudioKeyframe(clip.id, Math.max(0, Math.min(clip.duration, relativeTime)), Math.max(0, Math.min(1.5, volume)));
                          return;
                        }
                        handleClipMouseDown(e, clip, track);
                      }}
                      onContextMenu={(e) => handleClipContextMenu(e, clip)}
                      className={`absolute h-10 rounded border text-left flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-650/40 text-white ring-1 ring-indigo-500' 
                          : track.type === 'text' 
                          ? 'border-amber-700/60 bg-amber-500/20 text-amber-200 hover:border-amber-500'
                          : track.type === 'audio'
                          ? 'border-cyan-700/60 bg-cyan-550/20 text-cyan-200 hover:border-cyan-550'
                          : 'border-emerald-700/60 bg-emerald-500/20 text-emerald-250 hover:border-emerald-500'
                      }`}
                      style={{
                        left: `${clip.timelineStart * zoomLevel}px`,
                        width: `${clip.duration * zoomLevel}px`,
                      }}
                      title={track.type === 'audio' ? "Alt + Clic para añadir puntos de volumen (Keyframes)" : undefined}
                    >
                      {/* Left Trim Handle */}
                      {!track.isLocked && (
                        <div 
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'left')}
                          className="w-1.5 h-full bg-slate-400/20 hover:bg-slate-400/60 cursor-col-resize flex-shrink-0 transition-colors z-10"
                        />
                      )}

                      {/* Render Audio Waveform inside audio clip */}
                      {track.type === 'audio' && renderWaveform(clip.id)}

                      {/* Clip label info */}
                      <div className="flex-1 px-1.5 truncate text-[9px] pointer-events-none font-semibold z-10 pr-20">
                        {clip.type === 'text' 
                          ? `Text: ${clip.textConfig?.text || 'Empty'}` 
                          : `${source?.name || 'Clip'} (${clip.duration.toFixed(1)}s)`
                        }
                        {clip.volume === 0 && (
                          <span className="ml-1 text-[8px] text-red-400 font-bold">[MUTED]</span>
                        )}
                      </div>

                      {/* Direct volume controls inside audio timeline clips - Filmora style volume line */}
                      {track.type === 'audio' && (
                        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
                          <svg className="absolute inset-0 w-full h-full">
                            <polyline
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth="1.5"
                              points={getKeyframePathPoints(clip)}
                            />
                          </svg>
                          
                          {/* Keyframe handle dots */}
                          {clip.audioKeyframes?.map(kf => (
                            <div
                              key={kf.id}
                              className="absolute w-2 h-2 rounded-full bg-cyan-400 border border-white cursor-ns-resize -ml-1 -mt-1 hover:bg-white z-30 pointer-events-auto shadow shadow-black"
                              style={{
                                  left: `${(kf.time / clip.duration) * 100}%`,
                                top: `${(1 - (kf.volume / 1.5)) * 100}%`
                              }}
                              onMouseDown={(e) => handleKeyframeMouseDown(e, clip.id, kf)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                removeAudioKeyframe(clip.id, kf.id);
                              }}
                              title={`Volumen: ${Math.round(kf.volume * 100)}% a los ${kf.time.toFixed(1)}s (Doble clic para borrar)`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Filmora-style direct volume line drag (when no keyframes exist) */}
                      {track.type === 'audio' && (!clip.audioKeyframes || clip.audioKeyframes.length === 0) && (
                        <div 
                          className="absolute left-0 right-0 h-1.5 bg-cyan-400/40 hover:bg-cyan-400 cursor-ns-resize z-20 transition-all pointer-events-auto"
                          style={{
                            top: `${(1 - ((clip.volume ?? 1) / 1.5)) * 100}%`,
                            marginTop: '-3px'
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            const startY = e.clientY;
                            const initialVol = clip.volume ?? 1;
                            
                            const clipContainer = document.getElementById(`clip-container-${clip.id}`);
                            if (!clipContainer) return;
                            
                            const clipHeight = clipContainer.getBoundingClientRect().height;
                            
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const deltaY = moveEvent.clientY - startY;
                              const volDelta = -(deltaY / clipHeight) * 1.5;
                              let newVol = initialVol + volDelta;
                              newVol = Math.max(0, Math.min(1.5, newVol));
                              updateClip(clip.id, { volume: newVol });
                            };
                            
                            const handleMouseUp = () => {
                              window.removeEventListener('mousemove', handleMouseMove);
                              window.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                          }}
                          title={`Volumen base: ${Math.round((clip.volume ?? 1) * 100)}% (Arrastra arriba/abajo para cambiar)`}
                        />
                      )}

                      {/* Visual property keyframes - diamond markers */}
                      {isSelected && clip.keyframes && clip.keyframes.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-900/60 flex items-center pointer-events-none z-20">
                          {clip.keyframes.map(kf => (
                            <div
                              key={kf.id}
                              className="absolute w-2 h-2 bg-cyan-400 rotate-45 border border-white cursor-ew-resize -ml-1 pointer-events-auto hover:bg-white z-30 transition-colors shadow shadow-black"
                              style={{
                                left: `${(kf.time / clip.duration) * 100}%`
                              }}
                              onMouseDown={(e) => handlePropKeyframeMouseDown(e, clip.id, kf)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                removePropertyKeyframe(clip.id, kf.id);
                              }}
                              title={`Keyframe visual a los ${kf.time.toFixed(1)}s (Doble clic para borrar)`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Right Trim Handle */}
                      {!track.isLocked && (
                        <div 
                          onMouseDown={(e) => handleTrimMouseDown(e, clip, track, 'side-right')}
                          className="w-1.5 h-full bg-slate-400/20 hover:bg-slate-400/60 cursor-col-resize flex-shrink-0 transition-colors z-10"
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

      {/* 5. CUSTOM RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && contextMenu.visible && (
        <div 
          className="fixed z-50 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden py-1 text-slate-250 select-none text-xs"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <button 
            onClick={() => {
              splitClip(contextMenu.clipId, currentTime);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 hover:text-white flex justify-between"
          >
            <span>Dividir Clip</span>
            <span className="text-[10px] text-slate-500">S</span>
          </button>
          
          <button 
            onClick={() => {
              duplicateClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 hover:text-white flex justify-between"
          >
            <span>Duplicar Clip</span>
            <span className="text-[10px] text-slate-500">Ctrl+D</span>
          </button>

          {contextMenu.type === 'video' && (
            <button 
              onClick={() => {
                detachAudio(contextMenu.clipId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-950/45 hover:text-indigo-300 border-t border-slate-850/50"
            >
              Separar Audio (Detach)
            </button>
          )}

          <button 
            onClick={() => {
              removeClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-950/30 hover:text-red-400 border-t border-slate-850/50 flex justify-between"
          >
            <span>Eliminar Clip</span>
            <span className="text-[10px] text-red-500">Del</span>
          </button>
        </div>
      )}

    </div>
  );
};
export default Timeline;
