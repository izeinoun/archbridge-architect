import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { FolderOpen, Plus, Settings, LogOut, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AppSidebarProps {
  onCreateProject: () => void;
}

export default function AppSidebar({ onCreateProject }: AppSidebarProps) {
  const { profile, user, signOut } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id).eq('role', 'admin').single();
      return !!data;
    },
    enabled: !!user,
  });

  const statusDot = (status: string) => {
    if (status === 'active') return 'bg-emerald-400';
    if (status === 'archived') return 'bg-muted-foreground';
    return 'bg-warning';
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar-bg border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">A</span>
        </div>
        <span className="text-base font-semibold text-sidebar-fg-bright">ArchBridge</span>
      </div>

      {/* New Project */}
      <div className="px-3 pb-2">
        <button
          onClick={onCreateProject}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-bright transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3">
        <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-fg/50">Projects</div>
        {projects.map(project => {
          const isActive = location.pathname.includes(`/projects/${project.id}`);
          return (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-active/15 text-sidebar-fg-bright'
                  : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-bright'
              }`}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">{project.name}</span>
              <span className={`h-2 w-2 rounded-full ${statusDot(project.status)}`} />
            </button>
          );
        })}
        {projects.length === 0 && (
          <p className="px-3 py-4 text-xs text-sidebar-fg/50">No projects yet</p>
        )}
      </div>

      {/* Admin link */}
      {isAdmin && (
        <div className="px-3 pb-1">
          <button
            onClick={() => navigate('/admin/config')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              location.pathname.startsWith('/admin') ? 'bg-sidebar-active/15 text-sidebar-fg-bright' : 'text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-bright'
            }`}
          >
            <Shield className="h-4 w-4" /> Admin
          </button>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {profile?.avatar_initials || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-fg-bright">{profile?.full_name || 'User'}</p>
          </div>
          <button onClick={() => signOut()} className="text-sidebar-fg hover:text-sidebar-fg-bright transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
