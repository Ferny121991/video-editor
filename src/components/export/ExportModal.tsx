import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { X, Film, Play, Download, Loader2, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, canvasRef }) => {
  const { projectName, duration, tracks, resolutionName, fps } = useProjectStore();
  const [exportPreset, setExportPreset] = useState<string>('youtube-1080p');
  const [format, setFormat] = useState<string>('mp4');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const renderIntervalRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const startExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setProgress(0);
    setExportUrl(null);
    recordedChunksRef.current = [];

    const canvas = canvasRef.current;
    
    // 1. Capture the canvas stream at the desired FPS
    const videoStream = canvas.captureStream(fps);
    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

    // 2. Web Audio mix integration (optional/fallback in browser)
    // Create combined stream
    let combinedStream: MediaStream;
    try {
      // In a full implementation, we mix audio tracks. 
      // For now, if we have active audio elements, we can capture from the audio destination node.
      // As a fallback, we record the canvas video stream directly.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      
      // Look for playing media elements and hook them to the audio context
      tracks.forEach(track => {
        if (track.type === 'audio' && !track.isMuted) {
          track.clips.forEach(clip => {
            const el = document.getElementById(`media-element-${clip.id}`) as HTMLAudioElement;
            if (el) {
              try {
                const source = audioCtx.createMediaElementSource(el);
                source.connect(dest);
                source.connect(audioCtx.destination);
              } catch (err) {
                // Already connected, ignore
              }
            }
          });
        }
      });
      
      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedTracks.push(audioTracks[0]);
      }
    } catch (e) {
      console.warn('Audio mix context could not be initialized or already bound:', e);
    }

    combinedStream = new MediaStream(combinedTracks);

    // 3. Select Mime Type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Default browser choice
        }
      }
    }

    try {
      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setExportUrl(url);
        setIsExporting(false);
        setProgress(100);
        
        // Celebrate!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#ec4899', '#3b82f6']
        });
      };

      // 4. Start recording and simulate progress
      recorder.start();
      
      const startTime = Date.now();
      const exportDurationMs = duration * 1000;

      renderIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(99, Math.floor((elapsed / exportDurationMs) * 100));
        setProgress(currentProgress);

        if (elapsed >= exportDurationMs) {
          stopExport();
        }
      }, 200);

    } catch (err) {
      console.error('Failed to initialize MediaRecorder:', err);
      alert('Tu navegador no soporta la grabación directa de Canvas/Audio en este formato.');
      setIsExporting(false);
    }
  };

  const stopExport = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDownload = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_render.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Film size={20} />
            <h2 className="text-lg font-semibold text-slate-100">Exportar Proyecto</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={isExporting} 
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isExporting && !exportUrl ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Ajustes Predefinidos</label>
                <select
                  value={exportPreset}
                  onChange={(e) => setExportPreset(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-850 p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="youtube-1080p">YouTube / Vimeo (1080p Full HD)</option>
                  <option value="youtube-4k">YouTube 4K Ultra HD (3840x2160)</option>
                  <option value="tiktok-vertical">TikTok / Reels / Shorts (1080x1920)</option>
                  <option value="instagram-feed">Instagram Post (1:1 1080x1080)</option>
                  <option value="church-screen">Pantalla de Iglesia 16:9 (1080p)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Formato</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-850 p-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="mp4">MP4 (H.264/AAC)</option>
                    <option value="webm">WebM (VP9/Opus)</option>
                    <option value="mov">MOV (ProRes)</option>
                    <option value="mp3">Solo Audio (MP3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">FPS</label>
                  <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm text-slate-350">
                    {fps} fotogramas/s
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800">
                <div className="flex justify-between">
                  <span>Nombre del archivo:</span>
                  <span className="font-semibold text-slate-300">{projectName.replace(/\s+/g, '_')}.{format}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Resolución del lienzo:</span>
                  <span className="font-semibold text-slate-300">{resolutionName} px</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Duración total:</span>
                  <span className="font-semibold text-slate-300">{duration.toFixed(2)} segundos</span>
                </div>
              </div>

              <button
                onClick={startExport}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:shadow-indigo-500/30 transition-all"
              >
                <Play size={16} />
                Comenzar Renderizado
              </button>
            </div>
          ) : isExporting ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
              <h3 className="text-md font-semibold text-slate-200">Renderizando tu video...</h3>
              <p className="text-xs text-slate-400 mt-1">Por favor, no cierres esta pestaña</p>
              
              {/* Progress Bar */}
              <div className="mt-6 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-indigo-400 mt-2">{progress}% completado</span>

              <button
                onClick={stopExport}
                className="mt-8 text-xs font-semibold text-red-400 hover:text-red-300"
              >
                Cancelar Exportación
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="rounded-full bg-green-500/20 p-3 text-green-400 mb-3 border border-green-500/30">
                <Award size={36} />
              </div>
              <h3 className="text-md font-semibold text-slate-200">¡Exportación Exitosa!</h3>
              <p className="text-xs text-slate-400 mt-1">El archivo de video ha sido compilado con éxito</p>

              <button
                onClick={handleDownload}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 hover:bg-green-500 transition-all"
              >
                <Download size={16} />
                Descargar Video final
              </button>

              <button
                onClick={onClose}
                className="mt-3 text-xs text-slate-500 hover:text-slate-400"
              >
                Volver al Editor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
