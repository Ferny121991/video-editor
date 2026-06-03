import { create } from 'zustand';
import type { MediaItem, Track, Clip, Subtitle, AIConfig, ProjectSettings, PropertyKeyframe } from '../types';

interface ProjectState {
  // Project Info
  id: string;
  projectName: string;
  resolution: { width: number; height: number };
  resolutionName: string;
  fps: number;
  duration: number; // in seconds
  media: MediaItem[];
  tracks: Track[];
  subtitles: Subtitle[];
  settings: ProjectSettings;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  zoomLevel: number; // timeline zoom (pixels per second)
  
  // Selection
  selectedClipId: string | null;
  selectedTrackId: string | null;
  selectedSubtitleId: string | null;
  
  // AI Keys and Settings
  aiConfig: AIConfig;

  // Actions
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedSubtitleId: (id: string | null) => void;
  
  // Media library actions
  addMediaItem: (item: MediaItem) => void;
  removeMediaItem: (id: string) => void;
  
  // Track actions
  addTrack: (type: 'video' | 'audio' | 'text') => void;
  removeTrack: (id: string) => void;
  toggleLockTrack: (id: string) => void;
  toggleMuteTrack: (id: string) => void;
  toggleHideTrack: (id: string) => void;
  
  // Clip actions
  addClipToTrack: (trackId: string, clip: Omit<Clip, 'trackId'>) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  splitClip: (clipId: string, time: number) => void;
  duplicateClip: (clipId: string) => void;
  detachAudio: (clipId: string) => void;
  addAudioKeyframe: (clipId: string, time: number, volume: number) => void;
  updateAudioKeyframe: (clipId: string, keyframeId: string, updates: Partial<{ time: number; volume: number }>) => void;
  removeAudioKeyframe: (clipId: string, keyframeId: string) => void;
  addPropertyKeyframe: (clipId: string, time: number, properties: Partial<PropertyKeyframe>) => void;
  updatePropertyKeyframe: (clipId: string, keyframeId: string, updates: Partial<PropertyKeyframe>) => void;
  removePropertyKeyframe: (clipId: string, keyframeId: string) => void;
  
  // Subtitle actions
  addSubtitle: (sub: Subtitle) => void;
  removeSubtitle: (id: string) => void;
  updateSubtitle: (id: string, updates: Partial<Subtitle>) => void;
  setSubtitles: (subs: Subtitle[]) => void;
  
  // Settings & Project Management
  updateSettings: (updates: Partial<ProjectSettings>) => void;
  updateAIConfig: (provider: keyof AIConfig['providers'], updates: Partial<AIConfig['providers'][keyof AIConfig['providers']]>) => void;
  setAIProvider: (provider: AIConfig['activeProvider']) => void;
  loadProject: (projectJson: any) => void;
  newProject: (name: string, resolution: '1920x1080' | '1080x1920' | '1080x1080' | '1280x720', fps: number) => void;
  saveProject: () => any;

  // History Undo/Redo
  undo: () => void;
  redo: () => void;
}

// Helper to calculate total project duration based on clips
const getProjectDuration = (tracks: Track[]): number => {
  let maxTime = 10; // Minimum timeline duration: 10s
  tracks.forEach(track => {
    track.clips.forEach(clip => {
      const end = clip.timelineStart + clip.duration;
      if (end > maxTime) maxTime = end;
    });
  });
  return maxTime;
};

// History arrays
let undoStack: Array<{ tracks: Track[]; subtitles: Subtitle[] }> = [];
let redoStack: Array<{ tracks: Track[]; subtitles: Subtitle[] }> = [];

const pushToHistory = (tracks: Track[], subtitles: Subtitle[]) => {
  // Simple deep copy for history
  const stateCopy = JSON.parse(JSON.stringify({ tracks, subtitles }));
  undoStack.push(stateCopy);
  if (undoStack.length > 50) undoStack.shift();
  redoStack = []; // Clear redo stack on new action
};

const initialAIConfig: AIConfig = {
  activeProvider: 'gemini',
  providers: {
    openai: { enabled: false, apiKey: '', defaultModel: 'gpt-4o', baseUrl: 'https://api.openai.com/v1' },
    gemini: { enabled: false, apiKey: '', defaultModel: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
    deepseek: { enabled: false, apiKey: '', defaultModel: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
    claude: { enabled: false, apiKey: '', defaultModel: 'claude-3-5-sonnet', baseUrl: 'https://api.anthropic.com' },
    custom: { name: 'Custom API', enabled: false, apiKey: '', defaultModel: '', baseUrl: '' }
  }
};

const initialSettings: ProjectSettings = {
  resolution: '1920x1080',
  fps: 30,
  theme: 'dark',
  autosave: true,
  autosaveInterval: 5,
  confirmDelete: true
};

const defaultTracks = (): Track[] => [
  { id: 'track_text_1', type: 'text', name: 'Text / Subtitles', isLocked: false, isMuted: false, isHidden: false, clips: [] },
  { id: 'track_video_2', type: 'video', name: 'Overlay Track', isLocked: false, isMuted: false, isHidden: false, clips: [] },
  { id: 'track_video_1', type: 'video', name: 'Main Video Track', isLocked: false, isMuted: false, isHidden: false, clips: [] },
  { id: 'track_audio_1', type: 'audio', name: 'Voice / Sound FX', isLocked: false, isMuted: false, isHidden: false, clips: [] },
  { id: 'track_audio_2', type: 'audio', name: 'Music Track', isLocked: false, isMuted: false, isHidden: false, clips: [] }
];

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial State
  id: 'project_default',
  projectName: 'Mi Video Profesional',
  resolution: { width: 1920, height: 1080 },
  resolutionName: '1920x1080',
  fps: 30,
  duration: 10,
  media: [],
  tracks: defaultTracks(),
  subtitles: [],
  settings: initialSettings,
  
  isPlaying: false,
  currentTime: 0,
  zoomLevel: 30, // 30 pixels per second default
  selectedClipId: null,
  selectedTrackId: null,
  selectedSubtitleId: null,
  
  aiConfig: (() => {
    const saved = localStorage.getItem('video_editor_ai_config');
    return saved ? JSON.parse(saved) : initialAIConfig;
  })(),

  // Actions
  setPlaying: (isPlaying) => set({ isPlaying }),
  
  setCurrentTime: (currentTime) => {
    const duration = get().duration;
    // Keep playback bounds
    const time = Math.max(0, Math.min(currentTime, duration));
    set({ currentTime: time });
  },
  
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(5, Math.min(zoomLevel, 200)) }),
  
  setSelectedClipId: (selectedClipId) => set({ selectedClipId, selectedSubtitleId: null }),
  setSelectedSubtitleId: (selectedSubtitleId) => set({ selectedSubtitleId, selectedClipId: null }),
  
  addMediaItem: (item) => set((state) => ({ media: [...state.media, item] })),
  
  removeMediaItem: (id) => set((state) => {
    // Remove clips that reference this media item
    pushToHistory(state.tracks, state.subtitles);
    const updatedTracks = state.tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.sourceId !== id)
    }));
    
    return {
      media: state.media.filter(item => item.id !== id),
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks),
      selectedClipId: state.selectedClipId && 
        state.tracks.flatMap(t => t.clips).find(c => c.id === state.selectedClipId)?.sourceId === id 
        ? null : state.selectedClipId
    };
  }),
  
  addTrack: (type) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const newTrack: Track = {
      id: `track_${type}_${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${state.tracks.filter(t => t.type === type).length + 1}`,
      isLocked: false,
      isMuted: false,
      isHidden: false,
      clips: []
    };
    // Insert text tracks at top, audio at bottom
    let updatedTracks = [...state.tracks];
    if (type === 'text') {
      updatedTracks.unshift(newTrack);
    } else if (type === 'audio') {
      updatedTracks.push(newTrack);
    } else {
      // Find first audio index or push before audio
      const firstAudioIndex = updatedTracks.findIndex(t => t.type === 'audio');
      if (firstAudioIndex !== -1) {
        updatedTracks.splice(firstAudioIndex, 0, newTrack);
      } else {
        updatedTracks.push(newTrack);
      }
    }
    return { tracks: updatedTracks };
  }),
  
  removeTrack: (id) => set((state) => {
    if (state.settings.confirmDelete && !confirm('¿Estás seguro de eliminar esta pista y todos sus clips?')) {
      return {};
    }
    pushToHistory(state.tracks, state.subtitles);
    const updatedTracks = state.tracks.filter(t => t.id !== id);
    return {
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks),
      selectedClipId: null
    };
  }),
  
  toggleLockTrack: (id) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, isLocked: !t.isLocked } : t)
  })),
  
  toggleMuteTrack: (id) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t)
  })),
  
  toggleHideTrack: (id) => set((state) => ({
    tracks: state.tracks.map(t => t.id === id ? { ...t, isHidden: !t.isHidden } : t)
  })),
  
  addClipToTrack: (trackId, clipData) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const track = state.tracks.find(t => t.id === trackId);
    if (!track || track.isLocked) return {};
    
    const newClip: Clip = {
      ...clipData,
      trackId
    } as Clip;
    
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackId) {
        return { ...t, clips: [...t.clips, newClip] };
      }
      return t;
    });
    
    return {
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks),
      selectedClipId: newClip.id
    };
  }),
  
  removeClip: (clipId) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.filter(c => c.id !== clipId)
      };
    });
    
    return {
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
    };
  }),
  
  updateClip: (clipId, updates) => set((state) => {
    // Simple state modifications don't always need full history step unless they are key adjustments, 
    // but for an MVP, push to history if they are moving positions, changing times, etc.
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const updated = { ...clip, ...updates };
            // Recalculate duration if start/end times change
            if (updates.startTime !== undefined || updates.endTime !== undefined || updates.speed !== undefined) {
              const start = updates.startTime !== undefined ? updates.startTime : clip.startTime;
              const end = updates.endTime !== undefined ? updates.endTime : clip.endTime;
              const speed = updates.speed !== undefined ? updates.speed : clip.speed;
              updated.duration = (end - start) / speed;
            }
            return updated;
          }
          return clip;
        })
      };
    });
    
    return {
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks)
    };
  }),
  
  splitClip: (clipId, time) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    let clipToSplit: Clip | null = null;
    let trackContainingClip: Track | null = null;
    
    state.tracks.forEach(track => {
      const found = track.clips.find(c => c.id === clipId);
      if (found) {
        clipToSplit = found;
        trackContainingClip = track;
      }
    });
    
    if (!clipToSplit || !trackContainingClip || (trackContainingClip as Track).isLocked) return {};
    
    const clip = clipToSplit as Clip;
    const splitPoint = time - clip.timelineStart; // relative time from start of clip in seconds
    
    // Check if the split point actually cuts inside the clip
    if (splitPoint <= 0.1 || splitPoint >= clip.duration - 0.1) {
      return {}; // Too close to borders
    }
    
    // Calculate media boundary cuts
    const speed = clip.speed;
    const mediaCutPoint = clip.startTime + (splitPoint * speed);
    
    const clipA: Clip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `${clip.id}_split_A_${Date.now()}`,
      endTime: mediaCutPoint,
      duration: splitPoint
    };
    
    const clipB: Clip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `${clip.id}_split_B_${Date.now()}`,
      startTime: mediaCutPoint,
      timelineStart: time,
      duration: clip.duration - splitPoint
    };
    
    const updatedTracks = state.tracks.map(t => {
      if (t.id === trackContainingClip!.id) {
        return {
          ...t,
          clips: [...t.clips.filter(c => c.id !== clipId), clipA, clipB]
        };
      }
      return t;
    });
    
    return {
      tracks: updatedTracks,
      selectedClipId: clipB.id
    };
  }),
  
  duplicateClip: (clipId) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const targetTrack = state.tracks.find(t => t.clips.some(c => c.id === clipId));
    const clipToDuplicate = targetTrack?.clips.find(c => c.id === clipId);
    
    if (!clipToDuplicate || !targetTrack || targetTrack.isLocked) return {};
    
    const clip = clipToDuplicate as Clip;
    const duplicate: Clip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `clip_${Date.now()}`,
      timelineStart: clip.timelineStart + clip.duration // Place it right after
    };
    
    const updatedTracks = state.tracks.map(t => {
      if (t.id === targetTrack!.id) {
        return { ...t, clips: [...t.clips, duplicate] };
      }
      return t;
    });
    
    return {
      tracks: updatedTracks,
      duration: getProjectDuration(updatedTracks),
      selectedClipId: duplicate.id
    };
  }),
  
  detachAudio: (clipId) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const targetTrack = state.tracks.find(t => t.clips.some(c => c.id === clipId));
    const videoClip = targetTrack?.clips.find(c => c.id === clipId);
    
    if (!videoClip || videoClip.type !== 'video' || !targetTrack) return {};

    // Find or create an audio track
    let audioTrack = state.tracks.find(t => t.type === 'audio' && !t.isLocked);
    if (!audioTrack) {
      audioTrack = state.tracks.filter(t => t.type === 'audio')[0];
    }
    
    if (!audioTrack) return {};

    const audioClip: Clip = {
      id: `clip_detached_audio_${Date.now()}`,
      type: 'audio',
      sourceId: videoClip.sourceId,
      trackId: audioTrack.id,
      startTime: videoClip.startTime,
      endTime: videoClip.endTime,
      timelineStart: videoClip.timelineStart,
      duration: videoClip.duration,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: videoClip.volume || 1,
      speed: videoClip.speed,
      colorFilters: { brightness: 1, contrast: 1, saturation: 1 },
      effects: [],
      transitions: [],
      audioFadeIn: 0,
      audioFadeOut: 0
    };

    const updatedTracks = state.tracks.map(t => {
      if (t.id === targetTrack.id) {
        return {
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, volume: 0 } : c)
        };
      }
      if (t.id === audioTrack!.id) {
        return {
          ...t,
          clips: [...t.clips, audioClip]
        };
      }
      return t;
    });

    return {
      tracks: updatedTracks,
      selectedClipId: audioClip.id
    };
  }),

  addAudioKeyframe: (clipId, time, volume) => set((state) => {
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const currentKfs = clip.audioKeyframes || [];
            const exists = currentKfs.some(k => Math.abs(k.time - time) < 0.05);
            if (exists) return clip;
            
            const newKf = { id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, time, volume };
            return {
              ...clip,
              audioKeyframes: [...currentKfs, newKf].sort((a, b) => a.time - b.time)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),

  updateAudioKeyframe: (clipId, keyframeId, updates) => set((state) => {
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId && clip.audioKeyframes) {
            return {
              ...clip,
              audioKeyframes: clip.audioKeyframes.map(kf => {
                if (kf.id === keyframeId) {
                  return { ...kf, ...updates };
                }
                return kf;
              }).sort((a, b) => a.time - b.time)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),

  removeAudioKeyframe: (clipId, keyframeId) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId && clip.audioKeyframes) {
            return {
              ...clip,
              audioKeyframes: clip.audioKeyframes.filter(kf => kf.id !== keyframeId)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),

  addPropertyKeyframe: (clipId, time, properties) => set((state) => {
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const currentKfs = clip.keyframes || [];
            const existingIndex = currentKfs.findIndex(k => Math.abs(k.time - time) < 0.05);
            let newKfs;
            if (existingIndex !== -1) {
              newKfs = currentKfs.map((k, idx) => idx === existingIndex ? { ...k, ...properties } : k);
            } else {
              const newKf = {
                id: `kf_prop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                time,
                ...properties
              } as PropertyKeyframe;
              newKfs = [...currentKfs, newKf];
            }
            return {
              ...clip,
              keyframes: newKfs.sort((a, b) => a.time - b.time)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),

  updatePropertyKeyframe: (clipId, keyframeId, updates) => set((state) => {
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId && clip.keyframes) {
            return {
              ...clip,
              keyframes: clip.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k).sort((a, b) => a.time - b.time)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),

  removePropertyKeyframe: (clipId, keyframeId) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    const updatedTracks = state.tracks.map(track => {
      if (track.isLocked) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId && clip.keyframes) {
            return {
              ...clip,
              keyframes: clip.keyframes.filter(k => k.id !== keyframeId)
            };
          }
          return clip;
        })
      };
    });
    return { tracks: updatedTracks };
  }),
  
  addSubtitle: (sub) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    return { subtitles: [...state.subtitles, sub].sort((a, b) => a.start - b.start) };
  }),
  
  removeSubtitle: (id) => set((state) => {
    pushToHistory(state.tracks, state.subtitles);
    return {
      subtitles: state.subtitles.filter(s => s.id !== id),
      selectedSubtitleId: state.selectedSubtitleId === id ? null : state.selectedSubtitleId
    };
  }),
  
  updateSubtitle: (id, updates) => set((state) => {
    const updated = state.subtitles.map(s => {
      if (s.id === id) {
        return { ...s, ...updates };
      }
      return s;
    }).sort((a, b) => a.start - b.start);
    
    return { subtitles: updated };
  }),
  
  setSubtitles: (subtitles) => set({ subtitles }),
  
  updateSettings: (updates) => set((state) => {
    const newSettings = { ...state.settings, ...updates };
    
    let res = state.resolution;
    if (updates.resolution) {
      const [w, h] = updates.resolution.split('x').map(Number);
      res = { width: w, height: h };
    }
    
    return {
      settings: newSettings,
      resolution: res,
      resolutionName: updates.resolution || state.resolutionName
    };
  }),
  
  updateAIConfig: (provider, updates) => set((state) => {
    const updatedProviders = {
      ...state.aiConfig.providers,
      [provider]: { ...state.aiConfig.providers[provider], ...updates }
    };
    const newConfig = {
      ...state.aiConfig,
      providers: updatedProviders
    };
    localStorage.setItem('video_editor_ai_config', JSON.stringify(newConfig));
    return { aiConfig: newConfig };
  }),
  
  setAIProvider: (activeProvider) => set((state) => {
    const newConfig = { ...state.aiConfig, activeProvider };
    localStorage.setItem('video_editor_ai_config', JSON.stringify(newConfig));
    return { aiConfig: newConfig };
  }),
  
  loadProject: (projectJson) => set(() => {
    try {
      const proj = typeof projectJson === 'string' ? JSON.parse(projectJson) : projectJson;
      
      const widthHeight = proj.resolution ? proj.resolution.split('x').map(Number) : [1920, 1080];
      
      // Keep existing media file local URLs, but if they are missing or expired we can't load binary blobs directly,
      // though user will need to re-upload. To handle this nicely, we'll keep what we can.
      
      return {
        id: proj.id || `project_${Date.now()}`,
        projectName: proj.projectName || 'Proyecto Cargado',
        resolution: { width: widthHeight[0], height: widthHeight[1] },
        resolutionName: proj.resolution || '1920x1080',
        fps: proj.fps || 30,
        tracks: proj.tracks || defaultTracks(),
        subtitles: proj.subtitles || [],
        media: proj.media || [],
        duration: getProjectDuration(proj.tracks || defaultTracks()),
        currentTime: 0,
        selectedClipId: null,
        selectedSubtitleId: null
      };
    } catch (e) {
      alert('Error al cargar el archivo de proyecto.');
      console.error(e);
      return {};
    }
  }),
  
  newProject: (name, resName, fps) => {
    const [w, h] = resName.split('x').map(Number);
    
    // Revoke previous URLs to prevent memory leak
    const currentMedia = get().media;
    currentMedia.forEach(m => {
      if (m.url.startsWith('blob:')) {
        URL.revokeObjectURL(m.url);
      }
    });

    undoStack = [];
    redoStack = [];
    
    set({
      id: `project_${Date.now()}`,
      projectName: name,
      resolution: { width: w, height: h },
      resolutionName: resName,
      fps: fps,
      duration: 10,
      media: [],
      tracks: defaultTracks(),
      subtitles: [],
      currentTime: 0,
      selectedClipId: null,
      selectedSubtitleId: null
    });
  },
  
  saveProject: () => {
    const state = get();
    // Exclude actual loaded local URLs to avoid bloating the JSON, 
    // though in a simple web app JSON, keeping the MediaItem references is fine.
    const projectData = {
      id: state.id,
      projectName: state.projectName,
      resolution: state.resolutionName,
      fps: state.fps,
      media: state.media.map(m => ({ ...m, url: '' })), // Clear URLs since they are local blobs
      tracks: state.tracks,
      subtitles: state.subtitles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return projectData;
  },

  undo: () => set((state) => {
    if (undoStack.length === 0) return {};
    
    const previous = undoStack.pop()!;
    redoStack.push(JSON.parse(JSON.stringify({ tracks: state.tracks, subtitles: state.subtitles })));
    
    return {
      tracks: previous.tracks,
      subtitles: previous.subtitles,
      duration: getProjectDuration(previous.tracks),
      selectedClipId: null,
      selectedSubtitleId: null
    };
  }),

  redo: () => set((state) => {
    if (redoStack.length === 0) return {};
    
    const next = redoStack.pop()!;
    undoStack.push(JSON.parse(JSON.stringify({ tracks: state.tracks, subtitles: state.subtitles })));
    
    return {
      tracks: next.tracks,
      subtitles: next.subtitles,
      duration: getProjectDuration(next.tracks),
      selectedClipId: null,
      selectedSubtitleId: null
    };
  })
}));
