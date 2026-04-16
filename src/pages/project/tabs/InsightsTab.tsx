import { useParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useInsights, InsightType } from '@/hooks/useInsights';
import { useDocuments } from '@/hooks/useDocuments';
import { toast } from 'sonner';
import PainPointsView from '@/components/insights/PainPointsView';
import CustomerGoalsView from '@/components/insights/CustomerGoalsView';
import ProblemStatementView from '@/components/insights/ProblemStatementView';
import WorkflowsView from '@/components/insights/WorkflowsView';
import SolutionComponentsView from '@/components/insights/SolutionComponentsView';
import RoadmapView from '@/components/insights/RoadmapView';
import OutcomesView from '@/components/insights/OutcomesView';

const insightPanels = [
  { key: 'pain_points' as InsightType, title: 'Customer Pain Points', icon: '⚡', description: 'AI-extracted pain points from meeting notes and transcripts' },
  { key: 'customer_goals' as InsightType, title: 'Customer Goals', icon: '🎯', description: 'Strategic and operational goals identified across all project documents' },
  { key: 'problem_statement' as InsightType, title: 'Problem Statement', icon: '📋', description: 'A synthesized problem statement generated from all customer inputs' },
  { key: 'current_workflows' as InsightType, title: 'Current State Workflows', icon: '🔄', description: "Customer's existing workflows mapped from discovery sessions" },
  { key: 'solution_components' as InsightType, title: 'Proposed Solution Components', icon: '🧩', description: 'Recommended Penguin AI Digital Workers and custom components with reasoning' },
  { key: 'implementation_roadmap' as InsightType, title: 'Implementation Roadmap', icon: '🗺️', description: 'Phased delivery plan mapped to customer goals and constraints' },
  { key: 'expected_outcomes' as InsightType, title: 'Expected Outcomes', icon: '📈', description: 'Measurable outcomes and value metrics tied to each solution component' },
];

const renderMap: Record<InsightType, React.FC<{ data: any }>> = {
  pain_points: PainPointsView,
  customer_goals: CustomerGoalsView,
  problem_statement: ProblemStatementView,
  current_workflows: WorkflowsView,
  solution_components: SolutionComponentsView,
  implementation_roadmap: RoadmapView,
  expected_outcomes: OutcomesView,
};

export default function InsightsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const { generateInsight, getInsightData, insights } = useInsights(projectId);
  const { hasReadyDocs, documents } = useDocuments(projectId);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = async (type: InsightType) => {
    setGenerating(prev => ({ ...prev, [type]: true }));
    try {
      await generateInsight.mutateAsync(type);
      toast.success('Insight generated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    }
    setGenerating(prev => ({ ...prev, [type]: false }));
  };

  const readyDocsCount = documents.filter(d => d.parse_status === 'done').length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Project Insights</h2>
        <p className="text-sm text-muted-foreground">
          AI-extracted structured insights from {readyDocsCount} parsed document{readyDocsCount !== 1 ? 's' : ''}
        </p>
      </div>

      {insightPanels.map(panel => {
        const data = getInsightData(panel.key);
        const hasData = !!data;
        const isGenerating = generating[panel.key];
        const ViewComponent = renderMap[panel.key];

        return (
          <Collapsible
            key={panel.key}
            open={openPanels[panel.key]}
            onOpenChange={() => toggle(panel.key)}
          >
            <div className="rounded-lg border border-border bg-card">
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className="text-xl">{panel.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-card-foreground">{panel.title}</h3>
                    {hasData && <Badge variant="outline" className="text-[10px] border-success text-success">Generated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{panel.description}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openPanels[panel.key] ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border px-5 py-5">
                  {/* Generate / Regenerate button */}
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant={hasData ? 'outline' : 'default'}
                      size="sm"
                      disabled={!hasReadyDocs || isGenerating}
                      onClick={() => handleGenerate(panel.key)}
                    >
                      {isGenerating ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing...</>
                      ) : hasData ? (
                        <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate</>
                      ) : (
                        'Generate'
                      )}
                    </Button>
                    {!hasReadyDocs && (
                      <span className="text-xs text-muted-foreground">Upload and process documents first</span>
                    )}
                  </div>

                  {/* Loading skeleton */}
                  {isGenerating && (
                    <div className="space-y-3 animate-pulse">
                      <p className="text-sm text-muted-foreground">
                        ArchBridge AI is analyzing {readyDocsCount} document{readyDocsCount !== 1 ? 's' : ''}...
                      </p>
                      <p className="text-xs text-muted-foreground">Finding evidence and building reasoning chains...</p>
                      <div className="h-20 rounded bg-muted" />
                      <div className="h-16 rounded bg-muted" />
                    </div>
                  )}

                  {/* Rendered content */}
                  {!isGenerating && hasData && <ViewComponent data={data} />}

                  {/* Empty state */}
                  {!isGenerating && !hasData && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No data yet. Click Generate to analyze your documents.
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
