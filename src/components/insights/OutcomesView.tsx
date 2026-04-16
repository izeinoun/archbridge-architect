import EvidencePanel from './EvidencePanel';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export default function OutcomesView({ data }: { data: any }) {
  if (!data?.outcomes?.length) return <p className="text-sm text-muted-foreground">No outcomes generated.</p>;

  return (
    <div className="space-y-4">
      {data.roi_narrative && (
        <div className="rounded-lg border-l-4 border-success bg-success/5 p-4">
          <h4 className="text-xs font-semibold text-success uppercase mb-1">ROI Narrative</h4>
          <p className="text-sm text-foreground">{data.roi_narrative}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data.outcomes.map((out: any) => (
          <div key={out.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-card-foreground">{out.title}</h4>
              {out.category && <Badge variant="secondary" className="text-[10px] shrink-0">{out.category}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{out.description}</p>

            {(out.baseline || out.target) && (
              <div className="flex items-center gap-2 text-xs rounded bg-muted/30 p-2">
                {out.baseline && <span className="text-muted-foreground">{out.baseline}</span>}
                {out.baseline && out.target && <ArrowRight className="h-3 w-3 text-success" />}
                {out.target && <span className="font-medium text-success">{out.target}</span>}
              </div>
            )}

            {out.metric && <p className="text-[10px] text-muted-foreground">📏 {out.metric}</p>}
            {out.timeframe && <Badge variant="outline" className="text-[10px]">{out.timeframe}</Badge>}

            <EvidencePanel
              source_document={out.source_document}
              evidence={out.evidence}
              reasoning={out.reasoning}
              confidence={out.confidence}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
