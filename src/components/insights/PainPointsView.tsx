import EvidencePanel from './EvidencePanel';
import { Badge } from '@/components/ui/badge';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function PainPointsView({ data }: { data: any }) {
  if (!data?.items?.length) return <p className="text-sm text-muted-foreground">No pain points found.</p>;

  return (
    <div className="space-y-4">
      {data.summary && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{data.summary}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.items.map((item: any) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-card-foreground">{item.title}</h4>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColors[item.severity] || ''}`}>
                {item.severity}
              </Badge>
            </div>
            {item.category && <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>}
            <p className="text-xs text-muted-foreground">{item.description}</p>
            <EvidencePanel
              source_document={item.source_document}
              evidence={item.evidence}
              reasoning={item.reasoning}
              confidence={item.confidence}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
