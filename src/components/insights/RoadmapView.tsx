import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export default function RoadmapView({ data }: { data: any }) {
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({});

  if (!data?.phases?.length) return <p className="text-sm text-muted-foreground">No roadmap generated.</p>;

  return (
    <div className="space-y-4">
      {/* Timeline bar */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {data.phases.map((phase: any) => (
          <div
            key={phase.phase_number}
            className="flex-1 min-w-[100px] rounded-md bg-primary/10 p-2 text-center"
          >
            <p className="text-[10px] font-medium text-primary">Phase {phase.phase_number}</p>
            <p className="text-xs font-semibold text-foreground truncate">{phase.name}</p>
            <p className="text-[10px] text-muted-foreground">{phase.duration_weeks}w</p>
          </div>
        ))}
      </div>

      {data.total_duration_weeks && (
        <p className="text-xs text-muted-foreground">Total: {data.total_duration_weeks} weeks</p>
      )}

      {data.critical_path && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
          <h4 className="text-xs font-semibold text-warning mb-1">⚡ Critical Path</h4>
          <p className="text-xs text-foreground">{data.critical_path}</p>
        </div>
      )}

      {/* Phase details */}
      {data.phases.map((phase: any) => (
        <Collapsible
          key={phase.phase_number}
          open={openPhases[phase.phase_number]}
          onOpenChange={() => setOpenPhases(prev => ({ ...prev, [phase.phase_number]: !prev[phase.phase_number] }))}
        >
          <div className="rounded-lg border border-border bg-card">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <Badge className="bg-primary text-primary-foreground text-[10px]">Phase {phase.phase_number}</Badge>
              <span className="flex-1 text-sm font-semibold text-card-foreground">{phase.name}</span>
              <Badge variant="outline" className="text-[10px]">{phase.duration_weeks} weeks</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border px-4 py-3 space-y-3 text-xs">
                <p className="text-muted-foreground">{phase.description}</p>
                {phase.deliverables?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-foreground mb-1">Deliverables</h5>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {phase.deliverables.map((d: string, i: number) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
                {phase.milestones?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-foreground mb-1">Milestones</h5>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {phase.milestones.map((m: string, i: number) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {phase.risks?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-foreground mb-1">Risks</h5>
                    {phase.risks.map((r: any, i: number) => (
                      <div key={i} className="rounded bg-muted/30 p-2 mb-1">
                        <p className="font-medium">{r.description}</p>
                        <p className="text-muted-foreground">Probability: {r.probability} · Impact: {r.impact}</p>
                        {r.mitigation && <p className="text-foreground">→ {r.mitigation}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {phase.success_criteria?.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-foreground mb-1">Success Criteria</h5>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {phase.success_criteria.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      {data.assumptions?.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">Assumptions</h4>
          <ul className="list-disc list-inside text-xs text-foreground space-y-0.5">
            {data.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
