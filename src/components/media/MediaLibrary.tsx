import React, { useRef, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { MediaItem, MediaType } from '../../types';
import { Upload, Plus, Trash2, Music, Eye, FileVideo } from 'lucide-react';

export const MediaLibrary: React.FC = () => {
  const { media, addMediaItem, removeMediaItem, addClipToTrack, tracks } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Helper to generate thumbnail for video files
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      
      // Determine file category
      let type: MediaType = 'image';
      let category: MediaItem['category'] = 'images';
      
      if (file.type.startsWith('video/')) {
        type = 'video';
        category = 'videos';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
        category = 'music';
      }

      // Read duration if video/audio
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
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddToTimeline = (item: MediaItem) => {
    // Find suitable track
    let targetTrack = tracks.find(t => t.type === (item.type === 'image' ? 'video' : item.type));
    if (!targetTrack) {
      targetTrack = tracks[0];
    }

    // Calculate place: append at end of track or at currentTime
    const state = useProjectStore.getState();
    const timelineStart = state.currentTime;

    const clipDuration = item.type === 'image' ? 5 : item.duration; // Default 5 seconds for images

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
      transitions: []
    });
  };

  const filteredMedia = activeCategory === 'all' 
    ? media 
    : media.filter(item => item.category === activeCategory);

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      {/* Upload button panel */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300">Medios Importados</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 transition-colors"
        >
          <Upload size={14} />
          Importar
        </button>
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
                className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-1.5 transition-all hover:border-indigo-500/50"
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
                      className="rounded bg-indigo-600 p-1 text-white hover:bg-indigo-500"
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
