import { Badge } from '@/components/ui/badge';

export default function ProblemStatementView({ data }: { data: any }) {
  if (!data?.statement) return <p className="text-sm text-muted-foreground">No problem statement generated.</p>;

  return (
    <div className="space-y-4">
      <blockquote className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm font-medium text-foreground">
        {data.statement}
      </blockquote>

      {data.context && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Context</h4>
          <p className="text-sm text-foreground">{data.context}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data.scope && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">In Scope</h4>
            <p className="text-sm text-foreground">{data.scope}</p>
          </div>
        )}
        {data.out_of_scope && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Out of Scope</h4>
            <p className="text-sm text-foreground">{data.out_of_scope}</p>
          </div>
        )}
      </div>

      {data.key_stakeholders?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Stakeholders</h4>
          <div className="flex flex-wrap gap-1">
            {data.key_stakeholders.map((s: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.reasoning && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">🧠 Reasoning</h4>
          <p className="text-xs text-foreground">{data.reasoning}</p>
        </div>
      )}

      {data.confidence && (
        <Badge variant="outline" className="text-xs">{data.confidence} confidence</Badge>
      )}
    </div>
  );
}
