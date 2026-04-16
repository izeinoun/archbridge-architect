import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsTab() {
  const { id } = useParams<{ id: string }>();
  const { project, members, updateProject, inviteMember, removeMember } = useProject(id);
  const { user } = useAuth();
  const isOwner = project?.owner_id === user?.id;

  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCustomerName(project.customer_name);
    }
  }, [project]);

  const handleSave = () => {
    updateProject.mutate({ name, customer_name: customerName });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: inviteEmail.trim() });
      toast.success('Member invited successfully');
      setInviteEmail('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to invite member');
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast.success('Member removed');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove member');
    }
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

        {isOwner && (
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1 space-y-1.5">
              <Label>Invite by Email</Label>
              <Input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail.trim()} size="sm" className="gap-1.5">
              {inviteMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Invite
            </Button>
          </div>
        )}

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
              {isOwner && member.user_id !== user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  onClick={() => handleRemove(member.id, member.profiles?.full_name || 'this member')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
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
