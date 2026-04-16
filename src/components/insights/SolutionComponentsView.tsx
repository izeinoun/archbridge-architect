import EvidencePanel from './EvidencePanel';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const buildBuyLabels: Record<string, { label: string; icon: string; className: string }> = {
  exists: { label: 'Ready to Deploy', icon: '✅', className: 'bg-success/10 text-success' },
  needs_config: { label: 'Configuration Required', icon: '⚙️', className: 'bg-primary/10 text-primary' },
  needs_custom: { label: 'Custom Build Required', icon: '🔨', className: 'bg-warning/10 text-warning' },
  gap: { label: 'Gap — No Current Product', icon: '⚠️', className: 'bg-destructive/10 text-destructive' },
};

export default function SolutionComponentsView({ data }: { data: any }) {
  if (!data?.components?.length) return <p className="text-sm text-muted-foreground">No solution components mapped.</p>;

  return (
    <div className="space-y-4">
      {data.summary && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{data.summary}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.components.map((comp: any) => {
          const bbInfo = buildBuyLabels[comp.build_vs_buy] || buildBuyLabels.gap;
          return (
            <div key={comp.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-card-foreground">{comp.name}</h4>
                <Badge variant="outline" className="text-[10px]">{comp.type}</Badge>
              </div>
              {comp.penguin_product && comp.penguin_product !== 'null' && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  🐧 {comp.penguin_product}
                </Badge>
              )}
              <Badge variant="outline" className={`text-[10px] ${bbInfo.className}`}>
                {bbInfo.icon} {bbInfo.label}
              </Badge>
              <p className="text-xs text-muted-foreground">{comp.description}</p>
              {comp.effort_estimate && (
                <Badge variant="secondary" className="text-[10px]">Effort: {comp.effort_estimate}</Badge>
              )}
              <EvidencePanel
                source_document={comp.source_document}
                evidence={comp.evidence}
                reasoning={comp.reasoning}
                confidence={comp.confidence}
              />
            </div>
          );
        })}
      </div>

      {data.gaps?.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Gap Alerts
          </h4>
          {data.gaps.map((gap: any, i: number) => (
            <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive">{gap.description}</p>
              <p className="text-xs text-muted-foreground">Impact: {gap.impact}</p>
              <p className="text-xs text-foreground">💡 {gap.suggested_approach}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
