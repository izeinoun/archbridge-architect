import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function SettingsTab() {
  const { id } = useParams<{ id: string }>();
  const { project, members, updateProject } = useProject(id);
  const { user } = useAuth();
  const isOwner = project?.owner_id === user?.id;

  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCustomerName(project.customer_name);
    }
  }, [project]);

  const handleSave = () => {
    updateProject.mutate({ name, customer_name: customerName });
  };

  if (!project) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Project Settings</h2>
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={!isOwner} />
          </div>
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={!isOwner} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Badge variant="default" className="capitalize">{project.status}</Badge>
          </div>
          {isOwner && (
            <Button onClick={handleSave} disabled={updateProject.isPending} size="sm">
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" /> Team Members
        </h2>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {member.profiles?.avatar_initials || '??'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">{member.profiles?.full_name || 'Unknown'}</p>
              </div>
              <Badge variant="secondary" className="text-xs capitalize">{member.role}</Badge>
            </div>
          ))}
          {members.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">No members</p>
          )}
        </div>
      </div>
    </div>
  );
}
