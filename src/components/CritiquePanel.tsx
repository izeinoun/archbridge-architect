import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, X, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface CritiqueDimension {
  name: string;
  score: number;
  assessment: string;
  issues: string[];
}

interface CritiqueIssue {
  severity: string;
  title: string;
  description: string;
  location: string;
  evidence: string;
  recommendation: string;
}

interface CritiqueData {
  overall_score: number;
  overall_assessment: string;
  dimensions: CritiqueDimension[];
  critical_issues: CritiqueIssue[];
  strengths: { title: string; description: string }[];
  missing_sections: { section: string; importance: string; why: string }[];
  recommended_improvements: string[];
  customer_ready: boolean;
  customer_ready_rationale: string;
}

interface Props {
  data: CritiqueData | null;
  loading: boolean;
  onClose: () => void;
  onRegenerate: (improvements: string[]) => void;
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

const severityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export default function CritiquePanel({ data, loading, onClose, onRegenerate }: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Analyzing document...</p>
          <p className="text-xs text-muted-foreground">Cross-referencing with project documents...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${scoreColor(data.overall_score)}`}>{data.overall_score}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Overall Score</p>
              <div className="flex items-center gap-2 mt-0.5">
                {data.customer_ready ? (
                  <Badge className="bg-green-500/10 text-green-500 text-xs">✅ Ready to Share</Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-500 text-xs">⚠️ Not Yet Ready</Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{data.overall_assessment}</p>
          <p className="text-xs text-muted-foreground mt-1 italic">{data.customer_ready_rationale}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Dimensions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {data.dimensions?.map(dim => (
          <div key={dim.name} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{dim.name}</span>
              <span className={`text-sm font-bold ${scoreColor(dim.score)}`}>{dim.score}</span>
            </div>
            <Progress value={dim.score} className="h-1.5 mb-2" />
            <p className="text-xs text-muted-foreground">{dim.assessment}</p>
          </div>
        ))}
      </div>

      {/* Critical Issues */}
      {data.critical_issues?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Issues ({data.critical_issues.length})
          </h4>
          <div className="space-y-2">
            {data.critical_issues
              .sort((a, b) => {
                const order = ['critical', 'high', 'medium', 'low'];
                return order.indexOf(a.severity) - order.indexOf(b.severity);
              })
              .map((issue, i) => (
                <div key={i} className={`border rounded-lg p-3 ${severityColor(issue.severity)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{issue.severity}</Badge>
                    <span className="text-sm font-medium">{issue.title}</span>
                  </div>
                  <p className="text-xs mb-1">{issue.description}</p>
                  {issue.location && <p className="text-xs italic opacity-80">📍 {issue.location}</p>}
                  {issue.evidence && <p className="text-xs mt-1">📄 {issue.evidence}</p>}
                  {issue.recommendation && (
                    <div className="mt-2 bg-green-500/10 border border-green-500/20 rounded p-2">
                      <p className="text-xs text-green-700 dark:text-green-400">💡 {issue.recommendation}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {data.strengths?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">✅ Strengths</h4>
          <div className="space-y-1">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-foreground">{s.title}</span>
                  <span className="text-xs text-muted-foreground"> — {s.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Sections */}
      {data.missing_sections?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">⚠️ Missing Sections</h4>
          <div className="space-y-1">
            {data.missing_sections.map((ms, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{ms.section}</span>
                  <Badge variant="outline" className="text-[10px] ml-1 capitalize">{ms.importance}</Badge>
                  <p className="text-muted-foreground">{ms.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {data.recommended_improvements?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">📋 Recommended Improvements</h4>
          <ol className="space-y-1 list-decimal list-inside">
            {data.recommended_improvements.map((imp, i) => (
              <li key={i} className="text-xs text-muted-foreground">{imp}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button size="sm" onClick={() => onRegenerate(data.recommended_improvements || [])}>
          <ArrowRight className="h-3 w-3 mr-1" /> Regenerate with Improvements
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
