import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface EvidencePanelProps {
  source_document?: string;
  evidence?: string;
  reasoning?: string;
  confidence?: string;
}

const confidenceColors: Record<string, string> = {
  high: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function EvidencePanel({ source_document, evidence, reasoning, confidence }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);

  if (!source_document && !evidence && !reasoning) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">
        <Search className="h-3 w-3" />
        {open ? 'Hide' : 'View'} Evidence & Reasoning
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-2 text-xs">
          {confidence && (
            <div className="flex justify-end">
              <Badge variant="outline" className={`text-[10px] ${confidenceColors[confidence] || ''}`}>
                {confidence} confidence
              </Badge>
            </div>
          )}
          {source_document && (
            <div>
              <span className="font-medium">📄 Source:</span>{' '}
              <span className="text-foreground">{source_document}</span>
            </div>
          )}
          {evidence && (
            <div>
              <span className="font-medium">💬 Evidence:</span>{' '}
              <span className="italic text-muted-foreground">"{evidence}"</span>
            </div>
          )}
          {reasoning && (
            <div>
              <span className="font-medium">🧠 Reasoning:</span>{' '}
              <span className="text-foreground">{reasoning}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
