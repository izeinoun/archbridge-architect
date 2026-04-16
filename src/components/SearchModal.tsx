import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText, Folder, Lightbulb, FileOutput } from 'lucide-react';

const SCOPES = ['all', 'projects', 'documents', 'generated'] as const;
type Scope = typeof SCOPES[number];

const typeIcons: Record<string, any> = {
  project: Folder,
  document: FileText,
  insight: Lightbulb,
  generated_doc: FileOutput,
};

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const navigate = useNavigate();

  const search = useCallback(async (q: string, s: Scope) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('project-tools', {
        body: { action: 'search', query: q, scope: s },
      });
      setResults(data?.results || []);
      setSelectedIdx(0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return; }
    const timer = setTimeout(() => search(query, scope), 300);
    return () => clearTimeout(timer);
  }, [query, scope, open, search]);

  const handleSelect = (result: any) => {
    navigate(result.url);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, documents, generated docs..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="flex gap-1 px-4 py-2 border-b border-border">
          {SCOPES.map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`text-xs px-2 py-1 rounded capitalize transition-colors ${
                scope === s ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Type at least 2 characters to search</p>
          ) : results.length === 0 && !loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">No results for "{query}"</p>
          ) : (
            results.map((r, i) => {
              const Icon = typeIcons[r.type] || FileText;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                    i === selectedIdx ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{r.title}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.type.replace('_', ' ')}</Badge>
                    </div>
                    {r.project_name && <p className="text-xs text-muted-foreground">{r.project_name}</p>}
                    <p className="text-xs text-muted-foreground/80 truncate">{r.excerpt}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
