import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Diff from 'diff';

interface DocVersion {
  id: string;
  title: string;
  version: number;
  content: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  versions: DocVersion[];
  documentType: string;
}

export default function DocumentDiffModal({ open, onClose, versions, documentType }: Props) {
  const sorted = [...versions].sort((a, b) => a.version - b.version);
  const [leftId, setLeftId] = useState(sorted.length >= 2 ? sorted[sorted.length - 2].id : sorted[0]?.id);
  const [rightId, setRightId] = useState(sorted[sorted.length - 1]?.id);
  const [diffMode, setDiffMode] = useState<'line' | 'word'>('line');

  const leftDoc = sorted.find(d => d.id === leftId);
  const rightDoc = sorted.find(d => d.id === rightId);

  const diffResult = useMemo(() => {
    if (!leftDoc || !rightDoc) return [];
    return diffMode === 'line'
      ? Diff.diffLines(leftDoc.content, rightDoc.content)
      : Diff.diffWords(leftDoc.content, rightDoc.content);
  }, [leftDoc, rightDoc, diffMode]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    for (const part of diffResult) {
      const count = part.count || 1;
      if (part.added) added += count;
      else if (part.removed) removed += count;
      else unchanged += count;
    }
    return { added, removed, unchanged };
  }, [diffResult]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version Comparison — {documentType}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Compare:</span>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger className="w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sorted.map(v => (
                  <SelectItem key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="sm" onClick={() => { setLeftId(rightId); setRightId(leftId); }}>⇄</Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">With:</span>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger className="w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sorted.map(v => (
                  <SelectItem key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex gap-1">
            <Button variant={diffMode === 'line' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setDiffMode('line')}>Line</Button>
            <Button variant={diffMode === 'word' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setDiffMode('word')}>Word</Button>
          </div>
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">+{stats.added} added</Badge>
          <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">-{stats.removed} removed</Badge>
          <Badge variant="secondary" className="text-xs">{stats.unchanged} unchanged</Badge>
        </div>

        <div className="flex-1 overflow-y-auto border border-border rounded-lg p-4 bg-card font-mono text-xs leading-relaxed">
          {diffResult.map((part, i) => {
            if (part.added) {
              return <span key={i} className="bg-green-500/10 text-green-700 dark:text-green-400">{part.value}</span>;
            }
            if (part.removed) {
              return <span key={i} className="bg-red-500/10 text-red-700 dark:text-red-400 line-through">{part.value}</span>;
            }
            if (diffMode === 'line' && (part.value.split('\n').length > 8)) {
              const lines = part.value.split('\n');
              return (
                <span key={i}>
                  {lines.slice(0, 3).join('\n')}
                  {'\n'}
                  <span className="text-muted-foreground italic">... {lines.length - 6} unchanged lines ...</span>
                  {'\n'}
                  {lines.slice(-3).join('\n')}
                </span>
              );
            }
            return <span key={i}>{part.value}</span>;
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
