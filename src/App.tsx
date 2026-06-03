import { useRef } from 'react';
import { useProjectStore } from './store/projectStore';
import Layout from './components/layout/Layout';

function App() {
  const { media } = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="relative h-screen w-screen bg-slate-950 overflow-hidden text-slate-100">
      
      {/* Main Video Editor Layout Shell */}
      <Layout canvasRef={canvasRef} />

      {/* Hidden container storing real media DOM elements for HTML5 Canvas rendering & audio mixing */}
      <div id="hidden-media-registry" className="hidden pointer-events-none absolute w-0 h-0 overflow-hidden">
        {media.map((item) => {
          if (item.type === 'video') {
            return (
              <video
                key={item.id}
                id={`media-element-${item.id}`}
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
                key={item.id}
                id={`media-element-${item.id}`}
                src={item.url}
                className="hidden-media"
                preload="auto"
                crossOrigin="anonymous"
              />
            );
          } else if (item.type === 'image') {
            return (
              <img
                key={item.id}
                id={`media-element-${item.id}`}
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
