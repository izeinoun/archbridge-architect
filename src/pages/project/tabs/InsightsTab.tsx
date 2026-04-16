import { useParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Loader2, RefreshCw, Check, X, RotateCcw, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useInsights, InsightType } from '@/hooks/useInsights';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/context/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
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

const APPROVAL_COLORS: Record<string, string> = {
  approved: 'text-green-600 bg-green-500/10 border-green-500/30',
  rejected: 'text-red-600 bg-red-500/10 border-red-500/30',
  needs_revision: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  pending: 'text-muted-foreground bg-muted border-border',
};

const APPROVAL_LABELS: Record<string, string> = {
  approved: '✅ Approved',
  rejected: '❌ Rejected',
  needs_revision: '🔄 Needs Revision',
  pending: '⏳ Pending Review',
};

export default function InsightsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const { generateInsight, getInsightData, insights, approveInsight, rejectInsight, lockInsights, unlockInsights } = useInsights(projectId);
  const { hasReadyDocs, documents } = useDocuments(projectId);
  const { user } = useAuth();
  const { logActivity } = useActivityLog(projectId);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));

  const isLocked = !!(insights as any)?.locked;
  const approvalStatus = ((insights as any)?.approval_status || {}) as Record<string, any>;

  const approvedCount = insightPanels.filter(p => approvalStatus[p.key]?.status === 'approved').length;

  const handleGenerate = async (type: InsightType) => {
    if (isLocked) { toast.error('Insights are locked. Unlock to regenerate.'); return; }
    setGenerating(prev => ({ ...prev, [type]: true }));
    try {
      await generateInsight.mutateAsync(type);
      toast.success('Insight generated successfully');
      logActivity.mutate({ action_type: 'insight_generated', entity_type: 'insight', entity_name: type });
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    }
    setGenerating(prev => ({ ...prev, [type]: false }));
  };

  const handleApprove = async (type: InsightType) => {
    try {
      await approveInsight.mutateAsync(type);
      toast.success(`${type.replace(/_/g, ' ')} approved`);
      logActivity.mutate({ action_type: 'insight_approved', entity_type: 'insight', entity_name: type });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (type: InsightType) => {
    const notes = rejectNotes[type];
    if (!notes?.trim()) { toast.error('Please provide rejection notes'); return; }
    try {
      await rejectInsight.mutateAsync({ type, notes });
      toast.success(`${type.replace(/_/g, ' ')} rejected`);
      setShowRejectInput(prev => ({ ...prev, [type]: false }));
      logActivity.mutate({ action_type: 'insight_rejected', entity_type: 'insight', entity_name: type });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLock = async () => {
    try {
      await lockInsights.mutateAsync();
      toast.success('Insights locked');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUnlock = async () => {
    try {
      await unlockInsights.mutateAsync();
      toast.success('Insights unlocked');
    } catch (e: any) { toast.error(e.message); }
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

      {/* Approval Summary */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 mb-4">
        <div className="flex gap-1">
          {insightPanels.map(p => {
            const status = approvalStatus[p.key]?.status || 'pending';
            const color = status === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : status === 'needs_revision' ? 'bg-amber-500' : 'bg-muted-foreground/30';
            return <div key={p.key} className={`h-3 w-3 rounded-full ${color}`} title={`${p.title}: ${status}`} />;
          })}
        </div>
        <span className="text-sm text-muted-foreground">{approvedCount}/7 approved</span>
        <div className="ml-auto flex gap-2">
          {isLocked ? (
            <Button variant="outline" size="sm" onClick={handleUnlock}>
              <Unlock className="h-3 w-3 mr-1" /> Unlock
            </Button>
          ) : approvedCount === 7 ? (
            <Button size="sm" onClick={handleLock}>
              <Lock className="h-3 w-3 mr-1" /> Lock Insights
            </Button>
          ) : null}
        </div>
        {isLocked && <Badge variant="destructive" className="text-xs">🔒 Locked</Badge>}
      </div>

      {insightPanels.map(panel => {
        const data = getInsightData(panel.key);
        const hasData = !!data;
        const isGenerating = generating[panel.key];
        const ViewComponent = renderMap[panel.key];
        const status = approvalStatus[panel.key]?.status || 'pending';

        return (
          <Collapsible key={panel.key} open={openPanels[panel.key]} onOpenChange={() => toggle(panel.key)}>
            <div className="rounded-lg border border-border bg-card">
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className="text-xl">{panel.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-card-foreground">{panel.title}</h3>
                    {hasData && <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600">Generated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{panel.description}</p>
                </div>
                {hasData && (
                  <Badge variant="outline" className={`text-[10px] ${APPROVAL_COLORS[status]}`}>
                    {APPROVAL_LABELS[status]}
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openPanels[panel.key] ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border px-5 py-5">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Button
                      variant={hasData ? 'outline' : 'default'}
                      size="sm"
                      disabled={!hasReadyDocs || isGenerating || isLocked}
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
                    {!hasReadyDocs && <span className="text-xs text-muted-foreground">Upload and process documents first</span>}
                    {isLocked && <span className="text-xs text-destructive">Insights are locked</span>}

                    {/* Approval actions */}
                    {hasData && !isLocked && (
                      <div className="ml-auto flex gap-1.5">
                        {(status === 'pending' || status === 'needs_revision' || status === 'rejected') && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleApprove(panel.key)} className="text-green-600 border-green-500/30 hover:bg-green-500/10">
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowRejectInput(prev => ({ ...prev, [panel.key]: !prev[panel.key] }))} className="text-red-600 border-red-500/30 hover:bg-red-500/10">
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleApprove(panel.key)} className="text-muted-foreground">
                            <RotateCcw className="h-3 w-3 mr-1" /> Revoke
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rejection notes input */}
                  {showRejectInput[panel.key] && (
                    <div className="mb-4 space-y-2">
                      <Textarea
                        value={rejectNotes[panel.key] || ''}
                        onChange={e => setRejectNotes(prev => ({ ...prev, [panel.key]: e.target.value }))}
                        placeholder="Explain why this insight is being rejected..."
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleReject(panel.key)}>Confirm Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(prev => ({ ...prev, [panel.key]: false }))}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Approval notes display */}
                  {approvalStatus[panel.key]?.notes && (
                    <div className="mb-4 text-xs bg-muted rounded-md p-3">
                      <span className="font-medium">Review notes:</span> {approvalStatus[panel.key].notes}
                      {approvalStatus[panel.key].approved_by_name && (
                        <span className="text-muted-foreground"> — {approvalStatus[panel.key].approved_by_name}</span>
                      )}
                    </div>
                  )}

                  {isGenerating && (
                    <div className="space-y-3 animate-pulse">
                      <p className="text-sm text-muted-foreground">ArchBridge AI is analyzing {readyDocsCount} document{readyDocsCount !== 1 ? 's' : ''}...</p>
                      <p className="text-xs text-muted-foreground">Finding evidence and building reasoning chains...</p>
                      <div className="h-20 rounded bg-muted" />
                      <div className="h-16 rounded bg-muted" />
                    </div>
                  )}

                  {!isGenerating && hasData && <ViewComponent data={data} />}

                  {!isGenerating && !hasData && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No data yet. Click Generate to analyze your documents.</p>
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
