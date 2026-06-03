import type { AIConfig } from '../types';

class AIService {
  private getConfig(): AIConfig {
    const saved = localStorage.getItem('video_editor_ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error reading AI configuration:', e);
      }
    }
    // Default fallback
    return {
      activeProvider: 'gemini',
      providers: {
        openai: { enabled: false, apiKey: '', defaultModel: 'gpt-4o', baseUrl: 'https://api.openai.com/v1' },
        gemini: { enabled: false, apiKey: '', defaultModel: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
        deepseek: { enabled: false, apiKey: '', defaultModel: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
        claude: { enabled: false, apiKey: '', defaultModel: 'claude-3-5-sonnet', baseUrl: 'https://api.anthropic.com' },
        custom: { name: 'Custom API', enabled: false, apiKey: '', defaultModel: '', baseUrl: '' }
      }
    };
  }

  // Common request handler
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const config = this.getConfig();
    const providerKey = config.activeProvider;
    const provider = config.providers[providerKey];

    if (!provider || !provider.apiKey) {
      // Fallback response with notice if no key is configured
      return `[MOCK_RESPONSE] (Configura una API Key en Settings para usar IA real)
Aquí tienes una respuesta sugerida para: "${userPrompt.substring(0, 60)}..."

---

1. Introducción: Gancho de 3 segundos para captar la atención de tu audiencia.
2. Desarrollo: Explicación clara de los puntos clave del video.
3. Conclusión: Llamado a la acción (suscríbete, dale like, etc.).`;
    }

    try {
      if (providerKey === 'gemini') {
        // Call Gemini Developer API
        const model = provider.defaultModel || 'gemini-2.5-flash';
        const url = `${provider.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/${model}:generateContent?key=${provider.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
              }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se obtuvo respuesta del modelo Gemini.';
      } else if (providerKey === 'openai' || providerKey === 'deepseek' || providerKey === 'custom') {
        // OpenAI-compatible chat completion
        const url = `${provider.baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: provider.defaultModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No se obtuvo respuesta de la API.';
      } else if (providerKey === 'claude') {
        // Anthropic Claude
        const url = `${provider.baseUrl || 'https://api.anthropic.com'}/v1/messages`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: provider.defaultModel,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || 'No se obtuvo respuesta del modelo Claude.';
      }

      throw new Error('Proveedor de IA no soportado.');
    } catch (e: any) {
      console.error('Error en servicio de IA:', e);
      throw new Error(e.message || 'Error al conectar con la API de IA.');
    }
  }

  // 1. Generate Video Script
  async generateScript(topic: string, durationMin: number, tone: string, platform: string): Promise<string> {
    const sysPrompt = `Eres un guionista profesional para videos de ${platform}. Escribe un guion dinámico con un tono ${tone}. 
    El guion debe incluir indicaciones de video (lo que se muestra en pantalla) y de audio (lo que se dice). 
    Hazlo estructurado para una duración aproximada de ${durationMin} minutos.`;
    
    const userPrompt = `Escribe un guion sobre: ${topic}`;
    return this.callLLM(sysPrompt, userPrompt);
  }

  // 2. Generate Video Titles
  async generateTitles(topic: string, count: number = 5): Promise<string[]> {
    const sysPrompt = `Eres un experto en marketing de video y CTR. Sugiere ${count} títulos altamente llamativos y virales sobre el tema proporcionado. 
    Devuelve ÚNICAMENTE los títulos en una lista numerada, sin textos adicionales de saludo o explicación.`;
    
    const responseText = await this.callLLM(sysPrompt, `Tema: ${topic}`);
    
    return responseText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // 3. Generate Video Descriptions
  async generateDescription(topic: string, platform: string): Promise<string> {
    const sysPrompt = `Eres un experto en SEO para plataformas de video. Crea una descripción atractiva para ${platform} sobre el tema suministrado. 
    Incluye una introducción llamativa, resumen del contenido, llamados a la acción y sugerencias de capítulos.`;
    
    return this.callLLM(sysPrompt, `Tema del video: ${topic}`);
  }

  // 4. Generate Hashtags
  async generateHashtags(topic: string): Promise<string[]> {
    const sysPrompt = `Sugiere los mejores 15 hashtags virales y relevantes para el tema proporcionado. Devuélvelos separados por espacios, incluyendo el símbolo '#'. No agregues texto adicional.`;
    const responseText = await this.callLLM(sysPrompt, `Tema: ${topic}`);
    
    return responseText
      .match(/#[a-zA-Z0-9_]+/g) || responseText.split(/\s+/).filter(w => w.startsWith('#'));
  }

  // 5. Generate Subtitles from Simulated Audio Transcription
  async transcribeAudio(fileName: string, duration: number): Promise<{ start: number; end: number; text: string }[]> {
    // Audio transcription usually requires uploading file, but since this is an MVP web application, 
    // we'll simulate the transcript or call OpenAI Whisper / Gemini audio processing.
    // If no API Key is available, we generate a mock timeline-based transcription.
    const config = this.getConfig();
    const providerKey = config.activeProvider;
    const provider = config.providers[providerKey];

    if (!provider || !provider.apiKey) {
      // Mock transcript distributed across the clip duration
      const mockTexts = [
        "Hola a todos y bienvenidos a este nuevo video",
        "Hoy vamos a ver cómo editar videos de forma profesional",
        "Aprenderemos a recortar y añadir efectos en la línea de tiempo",
        "Además utilizaremos inteligencia artificial para acelerar el proceso",
        "No olvides suscribirte y dejar tu me gusta para más tutoriales",
        "¡Empecemos!"
      ];
      
      const count = Math.min(mockTexts.length, Math.max(2, Math.floor(duration / 3)));
      const segmentDuration = duration / count;
      const subs = [];
      
      for (let i = 0; i < count; i++) {
        subs.push({
          start: parseFloat((i * segmentDuration + 0.5).toFixed(1)),
          end: parseFloat(((i + 1) * segmentDuration - 0.2).toFixed(1)),
          text: mockTexts[i % mockTexts.length]
        });
      }
      return subs;
    }

    // Call LLM with simulated transcription prompt or Whisper API mock
    try {
      const sysPrompt = `Eres un asistente de transcripción de audio. Genera subtítulos en formato JSON estructurado para un video sobre "${fileName}" de ${duration} segundos. 
      Devuelve un arreglo JSON con objetos que contengan las llaves: "start" (número), "end" (número) y "text" (string). 
      Asegúrate de que los tiempos cubran desde el inicio hasta los ${duration} segundos. 
      Devuelve ÚNICAMENTE el JSON válido, sin bloques de código de markdown.`;

      const responseText = await this.callLLM(sysPrompt, `Genera subtítulos JSON para un video de ${duration} segundos.`);
      
      // Clean possible markdown code blocks from the response
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Error parsing AI transcript, falling back to mock:', e);
      // Fallback
      return [
        { start: 1.0, end: 4.5, text: `Transcripción automática de ${fileName}` },
        { start: 5.0, end: 9.0, text: "Configura tus subtítulos en el panel de texto o edítalos aquí." }
      ];
    }
  }

  // 6. Translate Subtitles
  async translateSubtitles(subtitles: { text: string; start: number; end: number }[], targetLang: string): Promise<{ text: string; start: number; end: number }[]> {
    const config = this.getConfig();
    if (!config.providers[config.activeProvider].apiKey) {
      // Mock translate
      return subtitles.map(s => ({
        ...s,
        text: `[${targetLang.toUpperCase()}] ${s.text}`
      }));
    }

    try {
      const sysPrompt = `Eres un traductor experto. Traduce el siguiente arreglo JSON de subtítulos al idioma: ${targetLang}. 
      Mantén los campos "start" y "end" exactamente iguales, traduciendo únicamente el campo "text". 
      Devuelve ÚNICAMENTE el JSON traducido sin explicaciones.`;
      
      const responseText = await this.callLLM(sysPrompt, JSON.stringify(subtitles));
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Error translating subtitles:', e);
      return subtitles.map(s => ({ ...s, text: `(Traducción fallida) ${s.text}` }));
    }
  }

  // 7. Text-To-Speech fallbacks or integrations
  speakText(text: string, voiceName?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // cancel current speak
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find custom voice if requested
        if (voiceName) {
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === voiceName);
          if (voice) utterance.voice = voice;
        }
        
        // We'll return a simulated audio URL or trigger speak
        utterance.onend = () => {
          resolve('Audio hablado con éxito');
        };
        utterance.onerror = (e) => {
          reject(e);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        reject(new Error('La síntesis de voz no está soportada en este navegador.'));
      }
    });
  }

  // 8. Generate Image (DALL-E or Gemini Image mock)
  async generateImage(prompt: string): Promise<string> {
    const config = this.getConfig();
    const active = config.activeProvider;
    const provider = config.providers[active];

    if (!provider || !provider.apiKey) {
      // Return a beautiful abstract Unsplash image based on key words
      const keywords = encodeURIComponent(prompt.split(' ').slice(0, 3).join(','));
      return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&q=prompt_${keywords}`;
    }

    try {
      if (active === 'openai') {
        const response = await fetch(`${provider.baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`
          },
          body: JSON.stringify({
            prompt: prompt,
            n: 1,
            size: "1024x1024"
          })
        });

        if (!response.ok) throw new Error('API image generation error');
        const data = await response.ok ? await response.json() : {};
        return data.data?.[0]?.url || '';
      }
      
      // Other APIs do not have simple unified image generation, return Unsplash as robust fallback
      const keywords = encodeURIComponent(prompt.split(' ').slice(0, 3).join(','));
      return `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80&q=prompt_${keywords}`;
    } catch (e) {
      console.error(e);
      return `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800`;
    }
  }

  // 9. Test API keys connection
  async testConnection(providerKey: AIConfig['activeProvider'], apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
      if (providerKey === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${apiKey}`;
        const res = await fetch(url);
        return res.ok;
      } else if (providerKey === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return res.ok;
      } else if (providerKey === 'deepseek') {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return res.ok;
      } else {
        // Claude / Custom
        return true;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export const aiService = new AIService();
export default aiService;
