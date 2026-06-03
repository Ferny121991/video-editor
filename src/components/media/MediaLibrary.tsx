import React, { useRef, useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { MediaItem, MediaType } from '../../types';
import { 
  Upload, Plus, Trash2, Music, Eye, FileVideo, Mic, Square, 
  Check
} from 'lucide-react';

export const MediaLibrary: React.FC = () => {
  const { media, addMediaItem, removeMediaItem, addClipToTrack, tracks } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  
  // Drag and Drop files state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Voice Recorder States
  const [showRecorder, setShowRecorder] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordTime, setRecordTime] = useState<number>(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordingName, setRecordingName] = useState<string>('Voz_Grabación');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Clean up recorded blob URL on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (recordedBlobUrl && recordedBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordedBlobUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [recordedBlobUrl]);

  // Video Thumbnail Helper
  const generateVideoThumbnail = (fileUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = fileUrl;
      video.currentTime = 0.5; // seek a bit to get a real frame
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => resolve(''), 3000); // 3s timeout

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            clearTimeout(timeout);
            resolve(canvas.toDataURL('image/jpeg'));
          } else {
            resolve('');
          }
        } catch (e) {
          resolve('');
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve('');
      };
    });
  };

  const processUploadedFiles = async (files: FileList) => {
    const promises = Array.from(files).map(async (file, i) => {
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
      let thumbnail = '';

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

        if (type === 'video') {
          thumbnail = await generateVideoThumbnail(url);
        }
      }

      const mediaItem: MediaItem = {
        id: `media_${Date.now()}_${i}`,
        name: file.name,
        type,
        url,
        duration,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        thumbnail: thumbnail || (type === 'audio' ? 'music-placeholder' : 'image-placeholder'),
        category
      };

      addMediaItem(mediaItem);
    });

    await Promise.all(promises);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processUploadedFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const handleAddToTimeline = (item: MediaItem) => {
    let targetTrack = tracks.find(t => t.type === (item.type === 'image' ? 'video' : item.type) && !t.isLocked);
    if (!targetTrack) {
      targetTrack = tracks.find(t => t.type === (item.type === 'image' ? 'video' : item.type));
    }
    if (!targetTrack) {
      targetTrack = tracks[0];
    }

    const state = useProjectStore.getState();
    const timelineStart = state.currentTime;
    const clipDuration = item.type === 'image' ? 5 : item.duration;

    addClipToTrack(targetTrack.id, {
      id: `clip_${Date.now()}`,
      type: item.type,
      sourceId: item.id,
      startTime: 0,
      endTime: clipDuration,
      timelineStart: timelineStart,
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

  // 1. Microphone Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        // Stop all tracks on the stream
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordTime(0);
      setIsRecording(true);
      setRecordedBlobUrl(null);
      recorder.start();

      timerIntervalRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('No se pudo acceder al micrófono. Por favor verifica tus permisos.');
    }
  };

  // 2. Microphone Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecordingDuration(recordTime);
    }
    setIsRecording(false);
  };

  // 3. Save voice clip
  const saveVoiceClip = () => {
    if (!recordedBlobUrl) return;

    const file = new File(chunksRef.current, `${recordingName.replace(/\s+/g, '_') || 'grabacion'}.wav`, { type: 'audio/wav' });
    const mediaItem: MediaItem = {
      id: `media_rec_${Date.now()}`,
      name: `${recordingName || 'Grabación de Voz'}.wav`,
      type: 'audio',
      url: recordedBlobUrl,
      duration: recordingDuration || 5,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      thumbnail: 'music-placeholder',
      category: 'music'
    };

    addMediaItem(mediaItem);
    
    // Auto add to the voice track if available
    const voiceTrack = tracks.find(t => t.type === 'audio' && !t.isLocked);
    if (voiceTrack) {
      const state = useProjectStore.getState();
      addClipToTrack(voiceTrack.id, {
        id: `clip_rec_${Date.now()}`,
        type: 'audio',
        sourceId: mediaItem.id,
        startTime: 0,
        endTime: mediaItem.duration,
        timelineStart: state.currentTime,
        duration: mediaItem.duration,
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
    }

    // Reset recorder popup state
    setShowRecorder(false);
    setRecordedBlobUrl(null);
    setRecordingName('Voz_Grabación');
  };

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredMedia = activeCategory === 'all' 
    ? media 
    : media.filter(item => item.category === activeCategory);

  return (
    <div 
      className={`flex h-full flex-col bg-slate-900 text-slate-200 transition-colors ${
        isDraggingOver ? 'bg-indigo-950/25 border-2 border-dashed border-indigo-500' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload button panel */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300">Medios Importados</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowRecorder(true)}
            className="flex items-center justify-center p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-750 transition-colors"
            title="Grabar Voz de Micrófono"
          >
            <Mic size={14} />
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-650 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-indigo-550 transition-colors"
          >
            <Upload size={14} />
            Importar
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-850 px-2 py-1 gap-1 overflow-x-auto">
        {(['all', 'videos', 'images', 'music'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap capitalize ${
              activeCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
            }`}
          >
            {cat === 'music' ? 'Audio' : cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredMedia.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-xl p-4 m-2">
            <FileVideo className="text-slate-700 mb-2" size={32} />
            <p className="text-xs text-slate-500">Arrastra archivos aquí o haz clic en "Importar"</p>
            <p className="text-[10px] text-slate-650 mt-1">Soporta MP4, WebM, PNG, JPG, MP3</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredMedia.map(item => (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('mediaItemId', item.id);
                  e.dataTransfer.setData('mediaItemType', item.type);
                }}
                className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-955 p-1.5 transition-all hover:border-indigo-500/50 cursor-grab active:cursor-grabbing"
              >
                {/* Media Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden rounded bg-slate-900">
                  {item.type === 'video' && item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                  ) : item.type === 'image' ? (
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-950/20 text-indigo-400">
                      <Music size={24} />
                    </div>
                  )}

                  {/* Duration label */}
                  {item.duration > 0 && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
                      {item.duration.toFixed(1)}s
                    </span>
                  )}

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/65 opacity-0 transition-opacity group-hover:opacity-100 gap-1.5">
                    <button
                      onClick={() => setPreviewItem(item)}
                      title="Previsualizar"
                      className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-750 hover:text-white"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => handleAddToTimeline(item)}
                      title="Añadir a Línea de Tiempo"
                      className="rounded bg-indigo-655 p-1 text-white hover:bg-indigo-500"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeMediaItem(item.id)}
                      title="Eliminar"
                      className="rounded bg-red-950/50 p-1 text-red-400 hover:bg-red-900 hover:text-red-150"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-1 flex flex-col">
                  <span className="truncate text-[10px] font-medium text-slate-300" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-semibold">
                    {item.type} • {item.size}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MIC RECORDER MODAL */}
      {showRecorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Mic size={16} className="text-red-500" />
                Grabador de Voz
              </span>
              <button 
                onClick={() => {
                  stopRecording();
                  setShowRecorder(false);
                }} 
                className="text-slate-400 hover:text-slate-100 text-xs"
              >
                Cancelar
              </button>
            </div>

            {/* Recorder Interface */}
            <div className="flex flex-col items-center justify-center py-4 bg-slate-950 rounded-lg border border-slate-800">
              {isRecording ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 border border-red-500 animate-ping mb-4">
                  <div className="w-4 h-4 rounded bg-red-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-4">
                  <Mic size={20} className="text-slate-400" />
                </div>
              )}
              
              <span className="text-lg font-bold font-mono tracking-widest text-slate-100">
                {formatRecordTime(recordTime)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                {isRecording ? 'Grabando audio...' : recordedBlobUrl ? 'Audio grabado' : 'Listo para grabar'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-550 transition-colors"
                >
                  <Mic size={14} />
                  {recordedBlobUrl ? 'Grabar de Nuevo' : 'Iniciar Grabación'}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-750 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <Square size={12} fill="white" />
                  Detener
                </button>
              )}
            </div>

            {/* Preview & Save Section (only when recording is complete) */}
            {recordedBlobUrl && (
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <audio src={recordedBlobUrl} controls className="w-full h-8" />
                
                <div>
                  <label className="block text-[10px] text-slate-405 font-medium uppercase">Nombre del Clip</label>
                  <input
                    type="text"
                    value={recordingName}
                    onChange={(e) => setRecordingName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    placeholder="Ej. Voz_01"
                  />
                </div>

                <button
                  onClick={saveVoiceClip}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-550 transition-colors shadow-lg shadow-green-500/10"
                >
                  <Check size={14} />
                  Guardar y Añadir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-3 border-b border-slate-900">
              <span className="text-xs font-semibold text-slate-350 truncate">{previewItem.name}</span>
              <button 
                onClick={() => setPreviewItem(null)} 
                className="text-slate-400 hover:text-slate-100 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewItem.type === 'video' ? (
                <video src={previewItem.url} controls autoPlay className="max-h-full max-w-full" />
              ) : previewItem.type === 'image' ? (
                <img src={previewItem.url} alt={previewItem.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <audio src={previewItem.url} controls autoPlay className="w-4/5" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MediaLibrary;
