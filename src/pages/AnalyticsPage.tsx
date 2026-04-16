import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import HealthGauge from '@/components/HealthGauge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Clock, FileText, CheckCircle, BarChart3, AlertTriangle, Trophy, ExternalLink } from 'lucide-react';

interface PipelineData {
  funnel: { total_projects: number; have_documents: number; have_insights: number; have_generated_docs: number; have_sow: number; have_share_link: number };
  velocity_metrics: { avg_docs_per_project: number; avg_health_score: number };
  projects_with_health: any[];
  total_projects: number;
}

const STAGES = [
  { key: 'total_projects', label: 'Projects Created', color: 'bg-muted-foreground/30' },
  { key: 'have_documents', label: 'Have Documents', color: 'bg-primary/30' },
  { key: 'have_insights', label: 'Have Insights', color: 'bg-primary/50' },
  { key: 'have_generated_docs', label: 'Have Generated Docs', color: 'bg-primary/70' },
  { key: 'have_sow', label: 'SOW Created', color: 'bg-primary/85' },
  { key: 'have_share_link', label: 'Shared with Customer', color: 'bg-primary' },
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: dashData } = await supabase.functions.invoke('project-tools', {
        body: { action: 'analytics' },
      });
      setData(dashData);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-center text-muted-foreground">Unable to load analytics</div>;
  }

  const projects = data.projects_with_health || [];
  const topPerformers = [...projects].sort((a, b) => (b.health_score || 0) - (a.health_score || 0)).slice(0, 5);
  const needsAttention = projects.filter((p: any) => (p.health_score || 0) < 50);

  const funnel = data.funnel || { total_projects: 0, have_documents: 0, have_insights: 0, have_generated_docs: 0, have_sow: 0, have_share_link: 0 };
  const maxFunnel = Math.max(funnel.total_projects, 1);

  const velocityCards = [
    { label: 'Avg Docs/Project', value: (data.velocity_metrics?.avg_docs_per_project || 0).toFixed(1), icon: FileText },
    { label: 'Avg Health Score', value: Math.round(data.velocity_metrics?.avg_health_score || 0), icon: TrendingUp },
    { label: 'Total Projects', value: data.total_projects || 0, icon: BarChart3 },
    { label: 'Need Attention', value: needsAttention.length, icon: AlertTriangle },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-foreground">Pipeline Analytics</h1>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Engagement Funnel</h2>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const count = (funnel as any)[stage.key] || 0;
            const pct = Math.round((count / maxFunnel) * 100);
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 md:w-44 shrink-0 truncate">{stage.label}</span>
                <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                  <div
                    className={`h-full ${stage.color} rounded-md transition-all duration-700`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Velocity Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {velocityCards.map(v => (
          <div key={v.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <v.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{v.value}</p>
              <p className="text-xs text-muted-foreground">{v.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Top Performers
          </h3>
          <div className="space-y-2">
            {topPerformers.map((p: any, i: number) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.customer_name}</p>
                </div>
                <HealthGauge score={p.health_score} size={36} />
              </button>
            ))}
            {topPerformers.length === 0 && <p className="text-xs text-muted-foreground">No projects yet</p>}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Needs Attention
          </h3>
          <div className="space-y-2">
            {needsAttention.slice(0, 5).map((p: any) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.customer_name}</p>
                </div>
                <HealthGauge score={p.health_score} size={36} />
                <Badge variant="destructive" className="text-[10px]">Low Health</Badge>
              </button>
            ))}
            {needsAttention.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle className="h-4 w-4" /> All projects are healthy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
