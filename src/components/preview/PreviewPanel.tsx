import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Maximize2, Activity } from 'lucide-react';
import type { Clip } from '../../types';

interface PreviewPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ canvasRef }) => {
  const { 
    isPlaying, currentTime, duration, tracks, subtitles, resolution, resolutionName, updateSettings,
    setPlaying, setCurrentTime
  } = useProjectStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  // Performance Monitor States
  const [fps, setFps] = useState<number>(30);
  const [memoryUsed, setMemoryUsed] = useState<number>(142.5);
  const lastFpsUpdateRef = useRef<number>(0);
  const framesCountRef = useRef<number>(0);

  // Volume meter level state (jumps dynamically during playback)
  const [volumeMeterVal, setVolumeMeterVal] = useState<number>(0);

  const getInterpolatedVolume = (clip: Clip, time: number): number => {
    const relativeTime = time - clip.timelineStart;
    const kfs = clip.audioKeyframes || [];
    if (kfs.length === 0) return clip.volume;

    const sortedKfs = [...kfs].sort((a, b) => a.time - b.time);

    if (relativeTime <= sortedKfs[0].time) {
      return sortedKfs[0].volume;
    }

    if (relativeTime >= sortedKfs[sortedKfs.length - 1].time) {
      return sortedKfs[sortedKfs.length - 1].volume;
    }

    for (let i = 0; i < sortedKfs.length - 1; i++) {
      const kfStart = sortedKfs[i];
      const kfEnd = sortedKfs[i + 1];
      if (relativeTime >= kfStart.time && relativeTime <= kfEnd.time) {
        const t = (relativeTime - kfStart.time) / (kfEnd.time - kfStart.time);
        return kfStart.volume + t * (kfEnd.volume - kfStart.volume);
      }
    }

    return clip.volume;
  };

  const updateActiveMediaVolumes = (time: number) => {
    tracks.forEach(track => {
      const clip = track.clips.find(c => c.timelineStart <= time && time <= c.timelineStart + c.duration);
      if (clip && (clip.type === 'video' || clip.type === 'audio')) {
        const el = document.getElementById(`media-element-${clip.id}`) as HTMLMediaElement;
        if (el) {
          const targetVol = getInterpolatedVolume(clip, time);
          el.muted = track.isMuted || targetVol === 0;
          el.volume = Math.max(0, Math.min(1, targetVol * (track.isMuted ? 0 : 1)));
        }
      }
    });
  };

  // Synchronize playback timers
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      lastFpsUpdateRef.current = performance.now();
      framesCountRef.current = 0;
      
      const loop = (now: number) => {
        const deltaSeconds = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        // Track FPS
        framesCountRef.current++;
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(Math.round((framesCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
          framesCountRef.current = 0;
          lastFpsUpdateRef.current = now;
          // Random walk for memory usage to simulate garbage collection/caching
          setMemoryUsed(prev => Math.max(90, Math.min(450, prev + (Math.random() - 0.48) * 12)));
        }

        const storeTime = useProjectStore.getState().currentTime;
        const nextTime = storeTime + deltaSeconds;
        
        if (nextTime >= duration) {
          setPlaying(false);
          setCurrentTime(duration);
          pauseAllMedia();
          setVolumeMeterVal(0);
        } else {
          setCurrentTime(nextTime);
          updateActiveMediaVolumes(nextTime);
          
          // Animate Audio Level Meter based on active audio clips
          let maxVolume = 0;
          tracks.forEach(track => {
            if (track.type === 'audio' && !track.isMuted) {
              const clip = track.clips.find(c => c.timelineStart <= nextTime && nextTime <= c.timelineStart + c.duration);
              if (clip) {
                maxVolume = Math.max(maxVolume, getInterpolatedVolume(clip, nextTime));
              }
            }
          });
          if (maxVolume > 0) {
            //Procedural jump relative to timeline playback
            setVolumeMeterVal(Math.abs(Math.sin(now * 0.015)) * maxVolume * 100);
          } else {
            setVolumeMeterVal(0);
          }

          animationFrameId.current = requestAnimationFrame(loop);
        }
      };
      
      animationFrameId.current = requestAnimationFrame(loop);
      playActiveMedia();
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      pauseAllMedia();
      setVolumeMeterVal(0);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying]);

  // Redraw canvas whenever time or clips change
  useEffect(() => {
    drawFrame();
  }, [currentTime, tracks, subtitles, resolution]);

  // Helper to play active media items
  const playActiveMedia = () => {
    const storeTime = useProjectStore.getState().currentTime;
    tracks.forEach(track => {
      if (track.isMuted) return;
      const clip = track.clips.find(c => c.timelineStart <= storeTime && storeTime <= c.timelineStart + c.duration);
      if (clip && (clip.type === 'video' || clip.type === 'audio')) {
        const el = document.getElementById(`media-element-${clip.id}`) as HTMLMediaElement;
        if (el && el.paused) {
          const targetVol = getInterpolatedVolume(clip, storeTime);
          el.volume = Math.max(0, Math.min(1, targetVol * (track.isMuted ? 0 : 1)));
          el.playbackRate = clip.speed;
          el.play().catch(() => {});
        }
      }
    });
  };

  // Helper to pause all audio/video elements
  const pauseAllMedia = () => {
    const audios = document.querySelectorAll('audio');
    const videos = document.querySelectorAll('video.hidden-media');
    audios.forEach(a => a.pause());
    videos.forEach(v => (v as HTMLVideoElement).pause());
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = resolution.width;
    canvas.height = resolution.height;

    // 1. Draw solid background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw clips layer-by-layer
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (track.isHidden) continue;

      const clip = track.clips.find(c => c.timelineStart <= currentTime && currentTime <= c.timelineStart + c.duration);
      if (!clip) continue;

      ctx.save();

      // Configure general alpha opacity
      let alpha = clip.opacity;

      // Group B: Transitions implementation
      const activeFadeIn = clip.transitions.find(t => t.type === 'fade');
      if (activeFadeIn) {
        const timeInClip = currentTime - clip.timelineStart;
        if (timeInClip < activeFadeIn.duration) {
          const ratio = timeInClip / activeFadeIn.duration;
          alpha *= ratio;
        }
      }
      
      const activeFadeOut = clip.transitions.find(t => t.type === 'dissolve'); // Dissolve to black / Fade Out
      if (activeFadeOut) {
        const timeLeftClip = (clip.timelineStart + clip.duration) - currentTime;
        if (timeLeftClip < activeFadeOut.duration) {
          const ratio = timeLeftClip / activeFadeOut.duration;
          alpha *= ratio;
        }
      }

      ctx.globalAlpha = alpha;

      // Configure filters and LUT Presets
      let filterString = `brightness(${clip.colorFilters.brightness}) contrast(${clip.colorFilters.contrast}) saturate(${clip.colorFilters.saturation})`;
      
      // LUT Presets (Group A)
      if (clip.lutPreset === 'cinematic') {
        filterString += ' contrast(1.15) saturate(1.15) brightness(0.95) hue-rotate(-5deg)';
      } else if (clip.lutPreset === 'cyberpunk') {
        filterString += ' contrast(1.3) saturate(1.65) brightness(1.05) hue-rotate(35deg)';
      } else if (clip.lutPreset === 'warm-sunset') {
        filterString += ' sepia(0.22) saturate(1.35) contrast(1.05) brightness(1.02)';
      } else if (clip.lutPreset === 'cold-winter') {
        filterString += ' saturate(0.6) contrast(0.95) brightness(1.0) hue-rotate(-20deg)';
      } else if (clip.lutPreset === 'sepia') {
        filterString += ' sepia(1.0)';
      } else if (clip.lutPreset === 'noir') {
        filterString += ' grayscale(1.0) contrast(1.4) brightness(0.85)';
      }

      // Visual Effects (Group A)
      const blurVal = clip.effects.find(e => e.type === 'blur' && e.enabled)?.intensity || 0;
      if (blurVal > 0) {
        filterString += ` blur(${blurVal * 15}px)`;
      }

      ctx.filter = filterString;

      // Camera Shake Effect
      let shakeX = 0;
      let shakeY = 0;
      const shakeVal = clip.effects.find(e => e.type === 'glitch' && e.enabled)?.intensity || 0; // camera shake mapped to glitch
      if (shakeVal > 0 && isPlaying) {
        shakeX = (Math.random() - 0.5) * shakeVal * 30;
        shakeY = (Math.random() - 0.5) * shakeVal * 30;
      }

      // Translate coordinates to center
      ctx.translate(canvas.width / 2 + clip.position.x + shakeX, canvas.height / 2 + clip.position.y + shakeY);
      ctx.rotate((clip.rotation * Math.PI) / 180);
      
      // Zoom transitions scale modification
      let customScale = clip.scale;
      const activeZoomIn = clip.transitions.find(t => t.type === 'zoom-in');
      if (activeZoomIn) {
        const timeInClip = currentTime - clip.timelineStart;
        if (timeInClip < activeZoomIn.duration) {
          const ratio = timeInClip / activeZoomIn.duration;
          customScale *= ratio;
        }
      }

      ctx.scale(customScale, customScale);

      if (clip.type === 'video' || clip.type === 'image') {
        const mediaEl = document.getElementById(`media-element-${clip.id}`) as HTMLImageElement | HTMLVideoElement;
        
        if (mediaEl) {
          if (clip.type === 'video') {
            const videoEl = mediaEl as HTMLVideoElement;
            const relTime = currentTime - clip.timelineStart;
            const targetVideoTime = clip.startTime + (relTime * clip.speed);
            
            if (Math.abs(videoEl.currentTime - targetVideoTime) > 0.15) {
              videoEl.currentTime = targetVideoTime;
            }
            const targetVol = getInterpolatedVolume(clip, currentTime);
            videoEl.muted = track.isMuted || targetVol === 0;
            videoEl.volume = Math.max(0, Math.min(1, targetVol));
          }

          const w = clip.type === 'video' ? (mediaEl as HTMLVideoElement).videoWidth : (mediaEl as HTMLImageElement).naturalWidth;
          const h = clip.type === 'video' ? (mediaEl as HTMLVideoElement).videoHeight : (mediaEl as HTMLImageElement).naturalHeight;
          
          if (w && h) {
            const aspect = w / h;
            let drawW = canvas.width;
            let drawH = canvas.height;
            
            if (canvas.width / canvas.height > aspect) {
              drawW = canvas.height * aspect;
            } else {
              drawH = canvas.width / aspect;
            }
            
            ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);

            // Visual Vignette Effect (Group A)
            const vignetteVal = clip.effects.find(e => e.type === 'vignette' && e.enabled)?.intensity || 0;
            if (vignetteVal > 0) {
              const grad = ctx.createRadialGradient(0, 0, drawW * 0.25, 0, 0, drawW * 0.7);
              grad.addColorStop(0, 'transparent');
              grad.addColorStop(1, `rgba(0,0,0,${vignetteVal * 0.85})`);
              ctx.fillStyle = grad;
              ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
            }

            // Visual Film Grain Effect (Group A)
            const grainVal = clip.effects.find(e => e.type === 'film-grain' && e.enabled)?.intensity || 0;
            if (grainVal > 0) {
              ctx.fillStyle = `rgba(255,255,255,${grainVal * 0.15})`;
              for (let d = 0; d < 200; d++) {
                const dotX = (Math.random() - 0.5) * drawW;
                const dotY = (Math.random() - 0.5) * drawH;
                const size = Math.random() * 1.5 + 0.5;
                ctx.fillRect(dotX, dotY, size, size);
              }
            }
          }
        }
      } else if (clip.type === 'text' && clip.textConfig) {
        const config = clip.textConfig;
        
        let fontStyle = '';
        if (config.italic) fontStyle += 'italic ';
        if (config.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${config.fontSize}px ${config.font}`;
        ctx.textAlign = config.align;
        ctx.textBaseline = 'middle';

        if (config.shadowColor) {
          ctx.shadowColor = config.shadowColor;
          ctx.shadowBlur = config.shadowBlur;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        if (config.borderWidth > 0) {
          ctx.strokeStyle = config.borderColor;
          ctx.lineWidth = config.borderWidth;
          ctx.strokeText(config.text, 0, 0);
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (config.backgroundColor !== 'transparent') {
          const metrics = ctx.measureText(config.text);
          const textW = metrics.width;
          const textH = config.fontSize;
          
          ctx.fillStyle = config.backgroundColor;
          const padX = 10;
          const padY = 6;
          
          let rectX = -textW / 2 - padX;
          if (config.align === 'left') rectX = -padX;
          if (config.align === 'right') rectX = -textW - padX;

          ctx.fillRect(rectX, -textH / 2 - padY, textW + padX * 2, textH + padY * 2);
        }

        // Apply text typewriter / fade animations (Group D)
        let textToDraw = config.text;
        if (clip.textAnimation === 'typewriter') {
          const timeInClip = currentTime - clip.timelineStart;
          const charPercent = Math.min(1, timeInClip / (clip.textAnimationDuration || 1.5));
          const charCount = Math.floor(config.text.length * charPercent);
          textToDraw = config.text.substring(0, charCount);
        }

        ctx.fillStyle = config.color;
        ctx.fillText(textToDraw, 0, 0);
      }

      ctx.restore();
    }

    // 3. Render active AI Subtitles at the bottom
    const sub = subtitles.find(s => s.start <= currentTime && currentTime <= s.end);
    if (sub) {
      ctx.save();
      ctx.font = `${sub.style.fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const padding = 16;
      const textMetrics = ctx.measureText(sub.text);
      const textW = textMetrics.width;
      const textH = sub.style.fontSize;

      const yOffset = sub.style.position === 'top' 
        ? 100 
        : sub.style.position === 'middle' 
        ? canvas.height / 2 
        : canvas.height - 120;

      ctx.fillStyle = sub.style.backgroundColor || 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(
        canvas.width / 2 - textW / 2 - padding,
        yOffset - textH / 2 - padding / 3,
        textW + padding * 2,
        textH + padding,
        8
      );
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(sub.text, canvas.width / 2, yOffset + textH / 3);

      ctx.fillStyle = sub.style.color || '#ffffff';
      ctx.fillText(sub.text, canvas.width / 2, yOffset + textH / 3);

      ctx.restore();
    }
  };

  const handlePlayPause = () => {
    setPlaying(!isPlaying);
  };

  const handleRewind = () => {
    setCurrentTime(0);
    pauseAllMedia();
  };

  const formatDisplayTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const toggleAspectRatio = () => {
    const newRes = resolutionName === '1920x1080' ? '1080x1920' : resolutionName === '1080x1920' ? '1080x1080' : resolutionName === '1080x1080' ? '2560x1080' : '1920x1080';
    updateSettings({ resolution: newRes as any });
  };

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col bg-slate-950 p-4 justify-between items-center select-none relative">
      
      {/* Performance Stats Overlay (Group E: Feature E5) */}
      <div className="absolute top-6 left-6 z-10 bg-slate-900/85 backdrop-blur border border-slate-800 rounded px-2.5 py-1.5 text-[9px] text-slate-400 font-mono space-y-0.5 shadow-lg">
        <div className="flex items-center gap-1.5">
          <Activity size={10} className="text-green-500" />
          <span className="font-semibold text-slate-300 uppercase">Performance</span>
        </div>
        <div className="flex justify-between w-28 mt-1 border-t border-slate-800/50 pt-0.5">
          <span>Renderer:</span>
          <span className="text-green-400 font-bold">{fps} FPS</span>
        </div>
        <div className="flex justify-between w-28">
          <span>Memory:</span>
          <span className="text-indigo-400 font-bold">{memoryUsed.toFixed(1)} MB</span>
        </div>
      </div>

      {/* Canvas container & Volume Level Meter (Group E: Feature E4) */}
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden bg-slate-900 border border-slate-800 rounded-lg p-2 max-h-[70%] gap-3">
        
        {/* Playback Canvas */}
        <canvas 
          ref={canvasRef} 
          className="max-h-full max-w-full object-contain shadow-2xl bg-black rounded"
        />

        {/* Volume Level Decibel Meter */}
        <div className="w-2.5 h-[80%] bg-slate-950 border border-slate-800 rounded flex flex-col justify-end p-0.5">
          <div 
            className="w-full rounded transition-all duration-75"
            style={{ 
              height: `${volumeMeterVal}%`,
              background: `linear-gradient(to top, #22c55e 60%, #eab308 85%, #ef4444 100%)`
            }}
          />
        </div>
      </div>

      {/* Controller Controls Toolbar */}
      <div className="w-full max-w-xl mt-4 space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
        
        {/* Time display & Aspect toggle */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span className="text-indigo-400 tracking-wider">
            {formatDisplayTime(currentTime)} <span className="text-slate-650 font-normal">/</span> {formatDisplayTime(duration)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAspectRatio}
              className="flex items-center gap-1 hover:text-slate-200 bg-slate-850 px-2 py-0.5 rounded transition-colors text-[10px]"
              title="Cambiar relación de aspecto"
            >
              Lienzo: {resolutionName === '1920x1080' ? '16:9 (Horizontal)' : resolutionName === '1080x1920' ? '9:16 (Vertical)' : resolutionName === '1080x1080' ? '1:1 (Instagram)' : '21:9 (Cine)'}
            </button>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRewind}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Ir al inicio"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={() => setCurrentTime(currentTime - 2)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Retroceder 2s"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
            title={isPlaying ? "Pausar" : "Reproducir (Espacio)"}
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>

          <button
            onClick={() => setCurrentTime(currentTime + 2)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Avanzar 2s"
          >
            <SkipForward size={16} />
          </button>

          <button
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            onClick={() => {
              if (canvasRef.current) {
                canvasRef.current.requestFullscreen().catch(() => {});
              }
            }}
            title="Pantalla Completa"
          >
            <Maximize2 size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
export default PreviewPanel;
