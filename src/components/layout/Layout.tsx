import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { MediaLibrary } from '../media/MediaLibrary';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Timeline } from '../timeline/Timeline';
import { PreviewPanel } from '../preview/PreviewPanel';
import { AiTools } from '../ai/AiTools';
import { SettingsModal } from '../settings/SettingsModal';
import { ExportModal } from '../export/ExportModal';
import { 
  FolderPlus, FolderOpen, Save, Undo2, Redo2, 
  Settings, Download, Sparkles, Film
} from 'lucide-react';

interface LayoutProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const Layout: React.FC<LayoutProps> = ({ canvasRef }) => {
  const { 
    projectName, undo, redo, loadProject, saveProject, newProject
  } = useProjectStore();

  const [activeLeftPanel, setActiveLeftPanel] = useState<'media' | 'ai'>('media');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const fileReaderRef = useRef<HTMLInputElement>(null);

  const handleNewProject = () => {
    if (confirm('¿Deseas crear un nuevo proyecto? Se borrarán los clips actuales.')) {
      newProject('Nuevo Video Editor', '1920x1080', 30);
    }
  };

  const handleSaveProject = () => {
    const data = saveProject();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenProjectClick = () => {
    fileReaderRef.current?.click();
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        loadProject(event.target.result);
      }
    };
    reader.readAsText(file);
    if (fileReaderRef.current) fileReaderRef.current.value = '';
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      
      {/* 1. TOP BAR */}
      <header className="flex h-12 w-full items-center justify-between border-b border-slate-900 bg-slate-900/60 px-4 backdrop-blur-md select-none">
        
        {/* Left: Brand logo & Project title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-500">
            <Film size={20} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
              VFX PRO
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-850"></div>
          
          {/* Editable project name */}
          <input
            type="text"
            value={projectName}
            onChange={(e) => useProjectStore.setState({ projectName: e.target.value })}
            className="bg-transparent text-xs font-semibold text-slate-200 border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 hover:bg-slate-850"
            title="Editar nombre del proyecto"
          />
        </div>

        {/* Center: File actions & Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewProject}
            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Nuevo Proyecto"
          >
            <FolderPlus size={14} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
          
          <button
            onClick={handleOpenProjectClick}
            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Abrir Proyecto (.json)"
          >
            <FolderOpen size={14} />
            <span className="hidden sm:inline">Abrir</span>
          </button>
          <input
            ref={fileReaderRef}
            type="file"
            accept=".json"
            onChange={handleFileLoad}
            className="hidden"
          />

          <button
            onClick={handleSaveProject}
            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Guardar Proyecto Local"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-850 mx-1"></div>

          {/* Undo/Redo */}
          <button
            onClick={undo}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Deshacer (Ctrl + Z)"
          >
            <Undo2 size={14} />
          </button>
          
          <button
            onClick={redo}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Rehacer (Ctrl + Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Right: Settings & Export buttons */}
        <div className="flex items-center gap-2">
          {/* AI tab quick-swap indicator */}
          <button
            onClick={() => setActiveLeftPanel(activeLeftPanel === 'media' ? 'ai' : 'media')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
              activeLeftPanel === 'ai' 
                ? 'bg-purple-950/45 border-purple-500/50 text-purple-300' 
                : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={12} />
            IA Tools
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Configuración"
          >
            <Settings size={16} />
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-650 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Download size={14} />
            Exportar
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex flex-1 w-full overflow-hidden select-none">
        
        {/* Left Side: Media Library or AI Tools */}
        <section className="w-80 h-full border-r border-slate-900 flex-shrink-0 flex flex-col bg-slate-900">
          <div className="flex border-b border-slate-850 bg-slate-950/20">
            <button
              onClick={() => setActiveLeftPanel('media')}
              className={`flex-1 text-center py-2 text-xs font-semibold transition-all border-b-2 ${
                activeLeftPanel === 'media' 
                  ? 'text-indigo-400 border-indigo-500 bg-slate-850/30' 
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Medios
            </button>
            <button
              onClick={() => setActiveLeftPanel('ai')}
              className={`flex-1 text-center py-2 text-xs font-semibold transition-all border-b-2 ${
                activeLeftPanel === 'ai' 
                  ? 'text-indigo-400 border-indigo-500 bg-slate-850/30' 
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Asistente IA
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeLeftPanel === 'media' ? <MediaLibrary /> : <AiTools />}
          </div>
        </section>

        {/* Center: Live Preview canvas player */}
        <section className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden">
          <PreviewPanel canvasRef={canvasRef} />
        </section>

        {/* Right Side: Properties configurations */}
        <section className="w-80 h-full border-l border-slate-900 flex-shrink-0 bg-slate-900">
          <PropertiesPanel />
        </section>

      </main>

      {/* 3. TIMELINE (BOTTOM) */}
      <section className="h-64 w-full flex-shrink-0 bg-slate-900 border-t border-slate-850 overflow-hidden">
        <Timeline />
      </section>

      {/* 4. MODALS & POPUPS */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} canvasRef={canvasRef} />
      
    </div>
  );
};
export default Layout;
