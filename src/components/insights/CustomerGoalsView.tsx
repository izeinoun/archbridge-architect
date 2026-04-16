import EvidencePanel from './EvidencePanel';
import { Badge } from '@/components/ui/badge';

export default function CustomerGoalsView({ data }: { data: any }) {
  if (!data?.items?.length) return <p className="text-sm text-muted-foreground">No goals found.</p>;

  return (
    <div className="space-y-4">
      {data.summary && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{data.summary}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.items.map((item: any) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground">{item.title}</h4>
            <div className="flex flex-wrap gap-1">
              {item.type && <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>}
              {item.priority && <Badge variant="outline" className="text-[10px]">{item.priority}</Badge>}
              {item.timeframe && <Badge variant="outline" className="text-[10px]">{item.timeframe}</Badge>}
            </div>
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
