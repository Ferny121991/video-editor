import React, { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { aiService } from '../../services/aiService';
import { 
  Sparkles, FileText, Type, Volume2, Image as ImageIcon, 
  Loader2, Copy, Languages
} from 'lucide-react';
import type { Subtitle, MediaItem } from '../../types';

export const AiTools: React.FC = () => {
  const { media, addMediaItem, setSubtitles, addClipToTrack, tracks } = useProjectStore();
  const [activeTool, setActiveTool] = useState<'script' | 'subtitles' | 'speech' | 'image' | 'titles'>('script');
  const [loading, setLoading] = useState<boolean>(false);

  // Script Generator States
  const [scriptTopic, setScriptTopic] = useState<string>('');
  const [scriptTone, setScriptTone] = useState<string>('Profesional');
  const [scriptPlatform, setScriptPlatform] = useState<string>('YouTube');
  const [scriptResult, setScriptResult] = useState<string>('');

  // Subtitles Generator States
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [language, setLanguage] = useState<string>('es');

  // Title Generator States
  const [titleTopic, setTitleTopic] = useState<string>('');
  const [titlesResult, setTitlesResult] = useState<string[]>([]);
  const [hashtagsResult, setHashtagsResult] = useState<string[]>([]);

  // Text-To-Speech States
  const [speechText, setSpeechText] = useState<string>('');
  const [voiceName, setVoiceName] = useState<string>('');

  // Image Generator States
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string>('');

  const handleGenerateScript = async () => {
    if (!scriptTopic.trim()) return;
    setLoading(true);
    try {
      const res = await aiService.generateScript(scriptTopic, 2, scriptTone, scriptPlatform);
      setScriptResult(res);
    } catch (e: any) {
      alert(e.message || 'Error al generar guion');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubtitles = async () => {
    const item = media.find(m => m.id === selectedMediaId);
    if (!item) {
      alert('Por favor selecciona un archivo de video o audio.');
      return;
    }
    
    setLoading(true);
    try {
      const segments = await aiService.transcribeAudio(item.name, item.duration || 10);
      
      const newSubtitles: Subtitle[] = segments.map((seg, idx) => ({
        id: `sub_${Date.now()}_${idx}`,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        style: {
          fontSize: 38,
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.6)',
          position: 'bottom'
        }
      }));

      setSubtitles(newSubtitles);
      alert(`¡Éxito! Se generaron ${newSubtitles.length} bloques de subtítulos.`);
    } catch (e: any) {
      alert(e.message || 'Error al transcribir audio');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTitles = async () => {
    if (!titleTopic.trim()) return;
    setLoading(true);
    try {
      const titles = await aiService.generateTitles(titleTopic, 5);
      const tags = await aiService.generateHashtags(titleTopic);
      setTitlesResult(titles);
      setHashtagsResult(tags);
    } catch (e: any) {
      alert(e.message || 'Error al generar títulos');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakText = async () => {
    if (!speechText.trim()) return;
    setLoading(true);
    try {
      await aiService.speakText(speechText, voiceName);
      
      // Simulate adding the generated speech to media library
      const textSlug = speechText.substring(0, 15).replace(/\s+/g, '_');
      const mockAudioItem: MediaItem = {
        id: `media_tts_${Date.now()}`,
        name: `TTS_${textSlug}.mp3`,
        type: 'audio',
        url: '', // Synthesized on play
        duration: Math.max(3, Math.ceil(speechText.length / 15)),
        size: '150 KB',
        thumbnail: 'music-placeholder',
        category: 'music'
      };
      
      addMediaItem(mockAudioItem);
      
      // Automatically add to audio track
      const audioTrack = tracks.find(t => t.type === 'audio');
      if (audioTrack) {
        const state = useProjectStore.getState();
        addClipToTrack(audioTrack.id, {
          id: `clip_tts_${Date.now()}`,
          type: 'audio',
          sourceId: mockAudioItem.id,
          startTime: 0,
          endTime: mockAudioItem.duration,
          timelineStart: state.currentTime,
          duration: mockAudioItem.duration,
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
      }
      
      alert('Audio de voz generado y añadido a la línea de tiempo.');
    } catch (e: any) {
      alert(e.message || 'Error al sintetizar voz');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    try {
      const url = await aiService.generateImage(imagePrompt);
      setGeneratedImgUrl(url);

      // Add to media library
      const mockImgItem: MediaItem = {
        id: `media_ai_img_${Date.now()}`,
        name: `AI_${imagePrompt.substring(0, 15).replace(/\s+/g, '_')}.png`,
        type: 'image',
        url: url,
        duration: 0,
        size: '240 KB',
        thumbnail: url,
        category: 'images'
      };
      addMediaItem(mockImgItem);
    } catch (e: any) {
      alert(e.message || 'Error al generar imagen');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Sparkles size={16} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-slate-200">Herramientas de IA</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-850 px-2 py-1 gap-1 overflow-x-auto">
        {[
          { id: 'script', name: 'Guionista', icon: FileText },
          { id: 'subtitles', name: 'Subtítulos', icon: Type },
          { id: 'titles', name: 'Marketing', icon: Sparkles },
          { id: 'speech', name: 'Voz / TTS', icon: Volume2 },
          { id: 'image', name: 'Imágenes', icon: ImageIcon }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTool(tab.id as any);
                setGeneratedImgUrl('');
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTool === tab.id ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
              }`}
            >
              <Icon size={12} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tool Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-indigo-400">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="text-xs">Procesando solicitud de IA...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. SCRIPT WRITER */}
            {activeTool === 'script' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Tema del Video</label>
                  <textarea
                    placeholder="Ej. 5 trucos secretos para editar videos más rápido..."
                    value={scriptTopic}
                    onChange={(e) => setScriptTopic(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Tono</label>
                    <select
                      value={scriptTone}
                      onChange={(e) => setScriptTone(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-250"
                    >
                      <option value="Profesional">Profesional</option>
                      <option value="Cristiano">Cristiano</option>
                      <option value="Divertido">Divertido / Viral</option>
                      <option value="Educativo">Educativo</option>
                      <option value="Emocional">Emocional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Plataforma</label>
                    <select
                      value={scriptPlatform}
                      onChange={(e) => setScriptPlatform(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-250"
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok / Short</option>
                      <option value="Instagram">Instagram Reel</option>
                      <option value="Iglesia">Pantalla de Iglesia</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateScript}
                  disabled={!scriptTopic.trim()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  <Sparkles size={12} />
                  Generar Guion Completo
                </button>

                {scriptResult && (
                  <div className="relative mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <button
                      onClick={() => copyToClipboard(scriptResult)}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
                      title="Copiar guion"
                    >
                      <Copy size={12} />
                    </button>
                    <h5 className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Guion Generado</h5>
                    <pre className="text-[10px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {scriptResult}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 2. AUTO SUBTITLES */}
            {activeTool === 'subtitles' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Seleccionar Clip de Origen</label>
                  <select
                    value={selectedMediaId}
                    onChange={(e) => setSelectedMediaId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-250 focus:outline-none"
                  >
                    <option value="">-- Selecciona un archivo --</option>
                    {media.filter(m => m.type === 'video' || m.type === 'audio').map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.duration.toFixed(1)}s)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Idioma del Audio</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-250"
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="pt">Portugués</option>
                    <option value="fr">Francés</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateSubtitles}
                  disabled={!selectedMediaId}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  <Languages size={12} />
                  Transcribir y Crear Subtítulos
                </button>
              </div>
            )}

            {/* 3. MARKETING TITLES & HASHTAGS */}
            {activeTool === 'titles' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Descripción o Tema</label>
                  <input
                    type="text"
                    placeholder="Ej. Cocina rápida para estudiantes..."
                    value={titleTopic}
                    onChange={(e) => setTitleTopic(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleGenerateTitles}
                  disabled={!titleTopic.trim()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  <Sparkles size={12} />
                  Generar Títulos & Hashtags
                </button>

                {titlesResult.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <h5 className="text-[10px] uppercase font-bold text-indigo-400 mb-2">Títulos Sugeridos</h5>
                      <ul className="space-y-1.5">
                        {titlesResult.map((t, idx) => (
                          <li key={idx} className="flex justify-between items-center text-xs text-slate-350 p-1 hover:bg-slate-900 rounded">
                            <span className="truncate pr-2">{t}</span>
                            <button onClick={() => copyToClipboard(t)} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-medium">Copiar</button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {hashtagsResult.length > 0 && (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-[10px] uppercase font-bold text-indigo-400">Hashtags Sugeridos</h5>
                          <button 
                            onClick={() => copyToClipboard(hashtagsResult.join(' '))} 
                            className="text-[9px] text-indigo-400 hover:text-indigo-300"
                          >
                            Copiar Todos
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 font-medium flex flex-wrap gap-1 leading-relaxed">
                          {hashtagsResult.map((tag, idx) => (
                            <span key={idx} className="bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">{tag}</span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. TEXT TO SPEECH */}
            {activeTool === 'speech' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Texto a convertir en voz</label>
                  <textarea
                    placeholder="Escribe el texto que la IA debe hablar..."
                    value={speechText}
                    onChange={(e) => setSpeechText(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Seleccionar Voz</label>
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-250"
                  >
                    <option value="">Voz Predeterminada del Sistema</option>
                    {window.speechSynthesis?.getVoices().map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSpeakText}
                  disabled={!speechText.trim()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  <Volume2 size={12} />
                  Sintetizar y Añadir al Editor
                </button>
              </div>
            )}

            {/* 5. IMAGE GENERATOR */}
            {activeTool === 'image' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Prompt para Imagen</label>
                  <textarea
                    placeholder="Ej. Un paisaje cyberpunk de noche con luces de neón en 4K..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={!imagePrompt.trim()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  <Sparkles size={12} />
                  Generar Imagen de Fondo
                </button>

                {generatedImgUrl && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-2 text-center">
                    <h5 className="text-[10px] uppercase font-bold text-indigo-400 mb-2">Imagen Generada</h5>
                    <img 
                      src={generatedImgUrl} 
                      alt="Generated" 
                      className="mx-auto rounded aspect-video max-h-40 object-cover border border-slate-800" 
                    />
                    <p className="text-[9px] text-green-400 mt-2 font-medium">
                      Añadida automáticamente a la galería de medios
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
