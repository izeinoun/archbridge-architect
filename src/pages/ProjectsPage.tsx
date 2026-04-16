import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import HealthGauge from '@/components/HealthGauge';
import EmptyState from '@/components/EmptyState';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Folder, FileText, FileOutput, Plus, Search, Loader2, LayoutDashboard } from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('project-tools', {
        body: { action: 'dashboard' },
      });
      setDashboard(data);
    } catch (e) {
      console.error('Dashboard load error:', e);
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

  const projects = dashboard?.projects_with_health || [];
  const filtered = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Projects', value: dashboard?.total_projects || 0, icon: Folder },
    { label: 'Active Projects', value: dashboard?.active_projects || 0, icon: LayoutDashboard },
    { label: 'Documents Processed', value: dashboard?.total_documents || 0, icon: FileText },
    { label: 'Docs Generated', value: dashboard?.total_generated_docs || 0, icon: FileOutput },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 w-64 text-sm"
            />
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        </div>
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-7 w-7 text-primary" />}
          title="No projects yet"
          description="Create your first project to start analyzing customer engagements"
          actionLabel="Create Project"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="text-left bg-card border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{p.customer_name}</p>
                </div>
                <HealthGauge score={p.health_score} size={52} />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{p.status}</Badge>
              </div>

              {/* Progress indicators */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Insights</span>
                  <span className="font-medium text-foreground">{p.insights_generated}/7</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(p.insights_generated / 7) * 100}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>📄 {p.document_count} docs</span>
                  <span>📋 {p.generated_doc_count} generated</span>
                  <span>👥 {p.member_count}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground/60">
                Updated {new Date(p.updated_at || p.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => { setShowCreate(false); loadDashboard(); }} />
    </div>
  );
}
