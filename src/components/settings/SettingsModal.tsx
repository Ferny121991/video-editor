import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { aiService } from '../../services/aiService';
import { X, Check, AlertCircle, Key, RefreshCw } from 'lucide-react';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, aiConfig, updateAIConfig, setAIProvider } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');
  
  // Local states for API keys to avoid lag while typing
  const [keys, setKeys] = useState({
    openai: aiConfig.providers.openai.apiKey,
    gemini: aiConfig.providers.gemini.apiKey,
    deepseek: aiConfig.providers.deepseek.apiKey,
    claude: aiConfig.providers.claude.apiKey,
  });

  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  useEffect(() => {
    setKeys({
      openai: aiConfig.providers.openai.apiKey,
      gemini: aiConfig.providers.gemini.apiKey,
      deepseek: aiConfig.providers.deepseek.apiKey,
      claude: aiConfig.providers.claude.apiKey,
    });
  }, [aiConfig]);

  if (!isOpen) return null;

  const handleSaveAIKey = (provider: 'openai' | 'gemini' | 'deepseek' | 'claude') => {
    updateAIConfig(provider, {
      apiKey: keys[provider],
      enabled: keys[provider].length > 0
    });
  };

  const handleTestConnection = async (provider: 'openai' | 'gemini' | 'deepseek' | 'claude') => {
    setTestingStatus(prev => ({ ...prev, [provider]: 'testing' }));
    const result = await aiService.testConnection(provider, keys[provider]);
    setTestingStatus(prev => ({ ...prev, [provider]: result ? 'success' : 'error' }));
    if (result) {
      handleSaveAIKey(provider);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Configuración del Editor</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Tabs & Content */}
        <div className="flex h-[400px]">
          {/* Sidebar */}
          <div className="w-1/4 border-r border-slate-800 bg-slate-950/50 p-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === 'general' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Inteligencia Artificial
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Preferencias del Proyecto</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-400">Resolución de Aspecto</label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => updateSettings({ resolution: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-850 p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1920x1080">Horizontal 16:9 (1920x1080) - YouTube, TV</option>
                    <option value="1080x1920">Vertical 9:16 (1080x1920) - TikTok, Reels, Shorts</option>
                    <option value="1080x1080">Cuadrado 1:1 (1080x1080) - Instagram</option>
                    <option value="1280x720">HD Horizontal 16:9 (1280x720)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400">FPS por Defecto</label>
                  <select
                    value={settings.fps}
                    onChange={(e) => updateSettings({ fps: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-850 p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="24">24 FPS - Cinematográfico</option>
                    <option value="30">30 FPS - Estándar Web</option>
                    <option value="60">60 FPS - Fluido / Gaming</option>
                  </select>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Comportamiento</h3>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-300">Confirmar antes de borrar clips</span>
                    <input
                      type="checkbox"
                      checked={settings.confirmDelete}
                      onChange={(e) => updateSettings({ confirmDelete: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-300">Guardado Automático</span>
                    <input
                      type="checkbox"
                      checked={settings.autosave}
                      onChange={(e) => updateSettings({ autosave: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-950 p-3 text-xs text-indigo-300 border border-indigo-900/50">
                  <h4 className="font-semibold text-indigo-200">Seguridad de API Keys:</h4>
                  Las llaves se guardan localmente en tu navegador y se usan de forma segura para comunicarse directamente con los proveedores.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400">Proveedor de IA Activo</label>
                  <select
                    value={aiConfig.activeProvider}
                    onChange={(e) => setAIProvider(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-850 p-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="gemini">Google Gemini (Recomendado)</option>
                    <option value="openai">OpenAI ChatGPT</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                </div>

                {/* Key Inputs */}
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  {(['gemini', 'openai', 'deepseek', 'claude'] as const).map((provider) => {
                    const status = testingStatus[provider] || 'idle';
                    return (
                      <div key={provider} className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-slate-400">
                            {provider === 'gemini' ? 'Google Gemini Key' : provider === 'openai' ? 'OpenAI ChatGPT Key' : provider === 'deepseek' ? 'DeepSeek Key' : 'Claude Key'}
                          </span>
                          {aiConfig.providers[provider].apiKey && (
                            <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                              <Check size={12} /> Configurada (sk-•••{aiConfig.providers[provider].apiKey.slice(-4)})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="password"
                              placeholder={aiConfig.providers[provider].apiKey ? "••••••••••••••••••••••••" : `Pegar API Key de ${provider}`}
                              value={keys[provider]}
                              onChange={(e) => setKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                              className="w-full rounded-lg border border-slate-700 bg-slate-850 py-1.5 pl-8 pr-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <Key className="absolute left-2.5 top-2 text-slate-500" size={14} />
                          </div>
                          
                          <button
                            onClick={() => handleTestConnection(provider)}
                            disabled={status === 'testing' || !keys[provider]}
                            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              status === 'success'
                                ? 'bg-green-700 text-white'
                                : status === 'error'
                                ? 'bg-red-700 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {status === 'testing' ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : status === 'success' ? (
                              <Check size={12} />
                            ) : status === 'error' ? (
                              <AlertCircle size={12} />
                            ) : null}
                            {status === 'testing' ? 'Probando...' : status === 'success' ? 'Verificado' : status === 'error' ? 'Error' : 'Probar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-950 p-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 hover:shadow-indigo-500/20"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
