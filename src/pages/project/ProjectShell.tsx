import { useParams, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { ChevronLeft, FileText, MessageSquare, Lightbulb, FileOutput, Settings } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const tabs = [
  { path: '', label: 'Insights', icon: Lightbulb },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/generated', label: 'Generated Docs', icon: FileOutput },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function ProjectShell() {
  const { id } = useParams<{ id: string }>();
  const { project, isLoading } = useProject(id);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="mb-2 text-lg font-semibold text-foreground">Project not found</p>
        <button onClick={() => navigate('/projects')} className="text-sm text-primary hover:underline">
          Back to projects
        </button>
      </div>
    );
  }

  const basePath = `/projects/${id}`;
  const currentTab = location.pathname.replace(basePath, '') || '';

  return (
    <div className="flex h-full flex-col">
      {/* Top nav */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/projects')} className="hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Projects</span>
          <span>/</span>
          <span className="text-foreground font-medium">{project.name}</span>
          <span className="text-muted-foreground">— {project.customer_name}</span>
          <div className="ml-auto"><NotificationBell /></div>
        </div>
        <nav className="flex gap-1">
          {tabs.map(tab => {
            const isActive = currentTab === tab.path;
            return (
              <Link
                key={tab.path}
                to={`${basePath}${tab.path}`}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
