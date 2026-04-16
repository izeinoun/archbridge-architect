import EvidencePanel from './EvidencePanel';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function WorkflowsView({ data }: { data: any }) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  if (!data?.workflows?.length) return <p className="text-sm text-muted-foreground">No workflows mapped.</p>;

  return (
    <div className="space-y-4">
      {data.summary && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{data.summary}</p>
      )}
      {data.workflows.map((wf: any) => (
        <Collapsible
          key={wf.id}
          open={openItems[wf.id]}
          onOpenChange={() => setOpenItems(prev => ({ ...prev, [wf.id]: !prev[wf.id] }))}
        >
          <div className="rounded-lg border border-border bg-card">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="flex-1 text-sm font-semibold text-card-foreground">{wf.name}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openItems[wf.id] ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border px-4 py-3 space-y-3">
                <p className="text-xs text-muted-foreground">{wf.description}</p>
                {wf.steps?.length > 0 && (
                  <div className="space-y-2">
                    {wf.steps.map((step: any) => (
                      <div key={step.step_number} className="flex gap-3 text-xs">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-[10px]">
                          {step.step_number}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{step.action}</span>
                          {step.actor && <span className="text-muted-foreground ml-1">— {step.actor}</span>}
                          {step.pain_points?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {step.pain_points.map((pp: string, i: number) => (
                                <Badge key={i} variant="destructive" className="text-[10px]">{pp}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {wf.systems_involved?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {wf.systems_involved.map((s: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
                {wf.volume_metrics && (
                  <p className="text-xs text-muted-foreground">📊 {wf.volume_metrics}</p>
                )}
                <EvidencePanel
                  source_document={wf.source_document}
                  evidence={wf.evidence}
                  reasoning={wf.reasoning}
                  confidence={wf.confidence}
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
