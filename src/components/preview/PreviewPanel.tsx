import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Maximize2, Ratio } from 'lucide-react';

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

  // Synchronize playback timers
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      
      const loop = (now: number) => {
        const deltaSeconds = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        const nextTime = currentTime + deltaSeconds;
        
        if (nextTime >= duration) {
          setPlaying(false);
          setCurrentTime(duration);
          // Pause all media elements
          pauseAllMedia();
        } else {
          setCurrentTime(nextTime);
          animationFrameId.current = requestAnimationFrame(loop);
        }
      };
      
      animationFrameId.current = requestAnimationFrame(loop);
      
      // Play matching media elements
      playActiveMedia();
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      pauseAllMedia();
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
    tracks.forEach(track => {
      if (track.isMuted) return;
      const clip = track.clips.find(c => c.timelineStart <= currentTime && currentTime <= c.timelineStart + c.duration);
      if (clip && (clip.type === 'video' || clip.type === 'audio')) {
        const el = document.getElementById(`media-element-${clip.sourceId}`) as HTMLMediaElement;
        if (el && el.paused) {
          el.volume = clip.volume * (track.isMuted ? 0 : 1);
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

    // Set canvas dimensions to project resolution
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    // 1. Draw solid background
    ctx.fillStyle = '#020617'; // slate-950 background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw clips layer-by-layer (bottom-up: index tracks.length - 1 down to 0)
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (track.isHidden) continue;

      const clip = track.clips.find(c => c.timelineStart <= currentTime && currentTime <= c.timelineStart + c.duration);
      if (!clip) continue;

      ctx.save();

      // Configure general alpha opacity and filters
      ctx.globalAlpha = clip.opacity;
      ctx.filter = `brightness(${clip.colorFilters.brightness}) contrast(${clip.colorFilters.contrast}) saturate(${clip.colorFilters.saturation})`;

      // Translate coordinates to center of canvas
      ctx.translate(canvas.width / 2 + clip.position.x, canvas.height / 2 + clip.position.y);
      ctx.rotate((clip.rotation * Math.PI) / 180);
      ctx.scale(clip.scale, clip.scale);

      if (clip.type === 'video' || clip.type === 'image') {
        const mediaEl = document.getElementById(`media-element-${clip.sourceId}`) as HTMLImageElement | HTMLVideoElement;
        
        if (mediaEl) {
          // Sync video currentTime
          if (clip.type === 'video') {
            const videoEl = mediaEl as HTMLVideoElement;
            const relTime = currentTime - clip.timelineStart;
            const targetVideoTime = clip.startTime + (relTime * clip.speed);
            
            // Sync time if out of step
            if (Math.abs(videoEl.currentTime - targetVideoTime) > 0.2) {
              videoEl.currentTime = targetVideoTime;
            }

            // Sync mute/volume
            videoEl.muted = track.isMuted || clip.volume === 0;
            videoEl.volume = clip.volume;
          }

          // Calculate aspect fit sizing centered on translated coordinates
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
          }
        }
      } else if (clip.type === 'text' && clip.textConfig) {
        const config = clip.textConfig;
        
        // Font setup
        let fontStyle = '';
        if (config.italic) fontStyle += 'italic ';
        if (config.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${config.fontSize}px ${config.font}`;
        ctx.textAlign = config.align;
        ctx.textBaseline = 'middle';

        // Draw shadow properties
        if (config.shadowColor) {
          ctx.shadowColor = config.shadowColor;
          ctx.shadowBlur = config.shadowBlur;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        // Draw border if set
        if (config.borderWidth > 0) {
          ctx.strokeStyle = config.borderColor;
          ctx.lineWidth = config.borderWidth;
          ctx.strokeText(config.text, 0, 0);
        }

        // Disable shadow for text background fill
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw background rectangle if not transparent
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

        // Draw main filled text
        ctx.fillStyle = config.color;
        ctx.fillText(config.text, 0, 0);
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

      // Position bottom, middle or top
      const yOffset = sub.style.position === 'top' 
        ? 100 
        : sub.style.position === 'middle' 
        ? canvas.height / 2 
        : canvas.height - 120;

      // Draw background capsule
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

      // Draw shadow border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(sub.text, canvas.width / 2, yOffset + textH / 3);

      // Draw white text
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
    const newRes = resolutionName === '1920x1080' ? '1080x1920' : resolutionName === '1080x1920' ? '1080x1080' : '1920x1080';
    updateSettings({ resolution: newRes as any });
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-slate-950 p-4 justify-between items-center select-none">
      {/* Canvas container */}
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden bg-slate-900 border border-slate-800 rounded-lg p-2 max-h-[70%]">
        <canvas 
          ref={canvasRef} 
          className="max-h-full max-w-full object-contain shadow-2xl bg-black rounded"
        />
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
              <Ratio size={12} />
              Lienzo: {resolutionName === '1920x1080' ? '16:9 (Horizontal)' : resolutionName === '1080x1920' ? '9:16 (Vertical)' : '1:1 (Cuadrado)'}
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
