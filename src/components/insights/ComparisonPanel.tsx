import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, MessageSquare } from 'lucide-react';
import type { InsightType } from '@/hooks/useInsights';

interface ComparisonPanelProps {
  projectId: string;
  insightType: InsightType;
  onClose: () => void;
  onAddToChat?: (text: string) => void;
}

export default function ComparisonPanel({ projectId, insightType, onClose, onAddToChat }: ComparisonPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useState(() => {
    loadComparison();
  });

  async function loadComparison() {
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase.functions.invoke('project-tools', {
        body: { action: 'compare_insights', project_id: projectId, insight_type: insightType },
      });
      if (err) throw err;
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }

  const label = insightType === 'pain_points' ? 'Pain Points' : 'Customer Goals';

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-xl animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{label} — Cross-Project Analysis</h3>
          <p className="text-xs text-muted-foreground">Comparing against similar past engagements</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing patterns across your engagements...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadComparison}>Retry</Button>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Common Patterns */}
              {data.common_patterns?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Common Patterns</h4>
                  <div className="space-y-2">
                    {data.common_patterns.map((p: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border p-3 bg-muted/30">
                        <p className="text-sm font-medium text-foreground">{p.pattern}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.appears_in?.map((name: string) => (
                            <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
                          ))}
                        </div>
                        <Badge variant="outline" className="text-[10px] mt-1">{p.frequency}</Badge>
                        {p.typical_solution && (
                          <div className="mt-2 text-xs text-success bg-success/10 rounded px-2 py-1">
                            💡 {p.typical_solution}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unique to this customer */}
              {data.unique_to_this_customer?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Unique to This Customer</h4>
                  <div className="space-y-2">
                    {data.unique_to_this_customer.map((u: any, i: number) => (
                      <div key={i} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                        <p className="text-sm font-medium text-foreground">{u.pain_point}</p>
                        <p className="text-xs text-muted-foreground mt-1">{u.why_unique}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Patterns */}
              {data.recommended_patterns?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Recommended from Past Work</h4>
                  <div className="space-y-2">
                    {data.recommended_patterns.map((r: any, i: number) => (
                      <div key={i} className="rounded-lg border border-success/30 bg-success/5 p-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{r.pattern_name}</p>
                          <Badge variant="outline" className="text-[10px]">{r.applicability}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Warnings */}
              {data.risk_warnings?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Risk Warnings</h4>
                  <div className="space-y-2">
                    {data.risk_warnings.map((r: any, i: number) => (
                      <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm font-medium text-foreground">{r.risk}</p>
                        <p className="text-xs text-muted-foreground mt-1">Mitigation: {r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative */}
              {data.overall_similarity_narrative && (
                <div className="rounded-lg bg-muted p-3 border-l-2 border-primary">
                  <p className="text-sm text-foreground italic">{data.overall_similarity_narrative}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">AI analysis — verify with your team</p>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
