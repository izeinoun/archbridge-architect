import { useNavigate } from 'react-router-dom';
import { FolderOpen, Users, Clock } from 'lucide-react';
import type { Project } from '@/types';
import { Badge } from '@/components/ui/badge';

interface Props {
  project: Project;
  memberCount?: number;
}

export default function ProjectCard({ project, memberCount = 0 }: Props) {
  const navigate = useNavigate();

  const statusVariant = project.status === 'active' ? 'default' : 'secondary';

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="flex flex-col rounded-lg border border-border bg-card p-5 text-left transition-all hover:shadow-md hover:border-primary/30 animate-fade-in"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <Badge variant={statusVariant} className="text-xs capitalize">{project.status}</Badge>
      </div>
      <h3 className="mb-1 font-semibold text-card-foreground">{project.name}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{project.customer_name}</p>
      {project.description && (
        <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
      )}
      <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {new Date(project.updated_at).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}
