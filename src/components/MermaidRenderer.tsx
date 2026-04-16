import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

interface Props {
  mermaidSource: string;
  diagramId: string;
}

export default function MermaidRenderer({ mermaidSource, diagramId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const renderDiagram = useCallback(async () => {
    if (!containerRef.current || !mermaidSource) return;
    
    if (!mermaidInitialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      mermaidInitialized = true;
    }

    try {
      setError(null);
      const id = `mermaid-${diagramId}-${Date.now()}`;
      const { svg } = await mermaid.render(id, mermaidSource);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (e: any) {
      setError(e.message || 'Failed to render diagram');
    }
  }, [mermaidSource, diagramId]);

  useEffect(() => { renderDiagram(); }, [renderDiagram]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 items-center text-xs">
        <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="px-2 py-1 rounded bg-muted hover:bg-muted/80">Zoom +</button>
        <button onClick={() => setScale(s => Math.max(s - 0.2, 0.3))} className="px-2 py-1 rounded bg-muted hover:bg-muted/80">Zoom -</button>
        <button onClick={() => setScale(1)} className="px-2 py-1 rounded bg-muted hover:bg-muted/80">Fit</button>
      </div>
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Diagram could not be rendered: {error}</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">{mermaidSource}</pre>
        </div>
      ) : (
        <div className="overflow-auto border border-border rounded-lg bg-white p-4" style={{ maxHeight: '600px' }}>
          <div ref={containerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} />
        </div>
      )}
    </div>
  );
}
