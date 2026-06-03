import { useRef } from 'react';
import { useProjectStore } from './store/projectStore';
import Layout from './components/layout/Layout';

function App() {
  const { media, tracks } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="relative h-screen w-screen bg-slate-950 overflow-hidden text-slate-100">
      
      {/* Main Video Editor Layout Shell */}
      <Layout canvasRef={canvasRef} />

      {/* Hidden container storing real media DOM elements for HTML5 Canvas rendering & audio mixing */}
      <div id="hidden-media-registry" className="pointer-events-none absolute w-[1px] h-[1px] -left-[9999px] -top-[9999px] opacity-0 overflow-hidden">
        {/* Active track clips instantiation */}
        {tracks.flatMap(t => t.clips).map((clip) => {
          const source = media.find(m => m.id === clip.sourceId);
          if (!source) return null;

          if (clip.type === 'video') {
            return (
              <video
                key={clip.id}
                id={`media-element-${clip.id}`}
                src={source.url}
                className="hidden-media"
                preload="auto"
                playsInline
                muted={false}
                crossOrigin="anonymous"
              />
            );
          } else if (clip.type === 'audio') {
            return (
              <audio
                key={clip.id}
                id={`media-element-${clip.id}`}
                src={source.url}
                className="hidden-media"
                preload="auto"
                crossOrigin="anonymous"
              />
            );
          } else if (clip.type === 'image') {
            return (
              <img
                key={clip.id}
                id={`media-element-${clip.id}`}
                src={source.url}
                className="hidden-media"
                alt={source.name}
                crossOrigin="anonymous"
              />
            );
          }
          return null;
        })}

        {/* Media library items preview instantiation */}
        {media.map((item) => {
          if (item.type === 'video') {
            return (
              <video
                key={`preview-${item.id}`}
                id={`media-element-preview-${item.id}`}
                src={item.url}
                className="hidden-media"
                preload="auto"
                playsInline
                muted={false}
                crossOrigin="anonymous"
              />
            );
          } else if (item.type === 'audio') {
            return (
              <audio
                key={`preview-${item.id}`}
                id={`media-element-preview-${item.id}`}
                src={item.url}
                className="hidden-media"
                preload="auto"
                crossOrigin="anonymous"
              />
            );
          } else if (item.type === 'image') {
            return (
              <img
                key={`preview-${item.id}`}
                id={`media-element-preview-${item.id}`}
                src={item.url}
                className="hidden-media"
                alt={item.name}
                crossOrigin="anonymous"
              />
            );
          }
          return null;
        })}
      </div>

    </div>
  );
}

export default App;
