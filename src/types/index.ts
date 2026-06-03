export type MediaType = 'video' | 'audio' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds, 0 for images
  size: string;
  thumbnail: string; // Base64 or object URL
  category: 'videos' | 'images' | 'audios' | 'music' | 'logos' | 'others';
}

export interface ColorFilters {
  brightness: number; // 0 to 2 (1 is default)
  contrast: number;   // 0 to 2 (1 is default)
  saturation: number; // 0 to 2 (1 is default)
  hue?: number;       // 0 to 360 (0 is default)
}

export interface TextConfig {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  borderWidth: number;
  borderColor: string;
  shadowColor: string;
  shadowBlur: number;
}

export interface Transition {
  type: 'fade' | 'dissolve' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out' | 'wipe' | 'glitch';
  duration: number; // in seconds
}

export interface Effect {
  id: string;
  type: 'blur' | 'glow' | 'vignette' | 'film-grain' | 'vintage' | 'black-white' | 'sepia' | 'glitch';
  intensity: number; // 0 to 1
  enabled: boolean;
}

export interface Clip {
  id: string;
  type: MediaType | 'text';
  sourceId: string; // points to MediaItem (or empty for standalone text)
  trackId: string;
  startTime: number; // cut start inside the media resource
  endTime: number;   // cut end inside the media resource
  timelineStart: number; // start time in the main video timeline
  duration: number; // active duration on timeline (endTime - startTime) / speed
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
  volume: number; // 0 to 1.5
  speed: number;  // 0.25 to 4
  colorFilters: ColorFilters;
  textConfig?: TextConfig;
  effects: Effect[];
  transitions: Transition[];
  audioFadeIn?: number; // in seconds
  audioFadeOut?: number; // in seconds
  audioEqPreset?: 'flat' | 'bass-boost' | 'vocal-booster' | 'treble-boost';
  audioDucking?: boolean;
  textAnimation?: 'none' | 'fade' | 'zoom' | 'slide' | 'typewriter';
  textAnimationDuration?: number;
  lutPreset?: 'none' | 'cinematic' | 'cyberpunk' | 'warm-sunset' | 'cold-winter' | 'sepia' | 'noir';
  audioKeyframes?: Array<{ id: string; time: number; volume: number }>;
  keyframes?: PropertyKeyframe[];
}

export interface PropertyKeyframe {
  id: string;
  time: number; // relative time inside the clip (seconds)
  scale?: number;
  rotation?: number;
  opacity?: number;
  position?: { x: number; y: number };
  effects?: Array<{ type: string; intensity: number }>;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  name: string;
  isLocked: boolean;
  isMuted: boolean;
  isHidden: boolean;
  clips: Clip[];
}

export interface Subtitle {
  id: string;
  start: number;
  end: number;
  text: string;
  style: {
    fontSize: number;
    color: string;
    backgroundColor: string;
    position: 'top' | 'middle' | 'bottom';
  };
}

export interface AIProviderConfig {
  enabled: boolean;
  apiKey: string;
  defaultModel: string;
  baseUrl: string;
}

export interface AIConfig {
  providers: {
    openai: AIProviderConfig;
    gemini: AIProviderConfig;
    deepseek: AIProviderConfig;
    claude: AIProviderConfig;
    custom: AIProviderConfig & { name: string };
  };
  activeProvider: 'openai' | 'gemini' | 'deepseek' | 'claude' | 'custom';
}

export interface ProjectSettings {
  resolution: '1920x1080' | '1080x1920' | '1080x1080' | '1280x720' | '2560x1080' | '1080x2560';
  fps: number;
  theme: 'dark' | 'light';
  autosave: boolean;
  autosaveInterval: number; // in minutes
  confirmDelete: boolean;
}

export interface Project {
  id: string;
  projectName: string;
  resolution: string;
  fps: number;
  duration: number;
  media: MediaItem[];
  tracks: Track[];
  subtitles: Subtitle[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}
