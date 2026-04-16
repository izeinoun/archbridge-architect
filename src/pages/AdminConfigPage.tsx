import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Users, FileText, Settings, Loader2, Save, RotateCcw, Link2 } from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'templates' | 'integrations' | 'prompt';

export default function AdminConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('overview');

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: Shield },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'templates' as AdminTab, label: 'Templates', icon: FileText },
    { id: 'integrations' as AdminTab, label: 'Integrations', icon: Link2 },
    { id: 'prompt' as AdminTab, label: 'System Prompt', icon: Settings },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold text-foreground mb-4">Admin Panel</h1>
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'prompt' && <SystemPromptTab />}
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [projects, docs, genDocs, messages, users] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('file_type', { count: 'exact' }),
        supabase.from('generated_documents').select('document_type', { count: 'exact' }),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);
      
      const docTypes: Record<string, number> = {};
      (docs.data || []).forEach((d: any) => { docTypes[d.file_type] = (docTypes[d.file_type] || 0) + 1; });
      
      const genTypes: Record<string, number> = {};
      (genDocs.data || []).forEach((d: any) => { genTypes[d.document_type] = (genTypes[d.document_type] || 0) + 1; });

      return {
        total_users: users.count || 0,
        total_projects: projects.count || 0,
        total_documents: docs.count || 0,
        total_generated_docs: genDocs.count || 0,
        total_chat_messages: messages.count || 0,
        documents_by_type: docTypes,
        docs_generated_by_type: genTypes,
      };
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;

  const metrics = [
    { label: 'Users', value: stats?.total_users },
    { label: 'Projects', value: stats?.total_projects },
    { label: 'Documents', value: stats?.total_documents },
    { label: 'Generated Docs', value: stats?.total_generated_docs },
    { label: 'Chat Messages', value: stats?.total_chat_messages },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Documents by Type</h3>
          {Object.entries(stats?.documents_by_type || {}).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground w-16">{type}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(100, ((count as number) / Math.max(1, stats?.total_documents || 1)) * 100)}%` }} />
              </div>
              <span className="text-xs font-medium text-foreground w-8 text-right">{count as number}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Generated Docs by Type</h3>
          {Object.entries(stats?.docs_generated_by_type || {}).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground w-24 truncate">{type.replace(/_/g, ' ')}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(100, ((count as number) / Math.max(1, stats?.total_generated_docs || 1)) * 100)}%` }} />
              </div>
              <span className="text-xs font-medium text-foreground w-8 text-right">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Initials</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-foreground">{u.full_name}</td>
              <td className="px-4 py-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {u.avatar_initials}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('ai_templates').select('*').order('created_at');
      return data || [];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from('ai_templates').update({
        name: t.name, system_prompt: t.system_prompt,
        user_prompt_template: t.user_prompt_template, is_active: t.is_active,
      }).eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      setEditing(null);
      toast.success('Template saved');
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
        Changes to templates affect all future AI generations. Existing generated content is not affected.
      </div>

      <div className="grid gap-2">
        {templates.map((t: any) => (
          <div key={t.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{t.name}</span>
                <Badge variant="secondary" className="text-[10px]">{t.template_type}</Badge>
                {!t.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing({ ...t })}>Edit</Button>
          </div>
        ))}
      </div>

      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Template: {editing.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={editing.template_type} disabled />
              </div>
              <div className="space-y-2">
                <Label>System Prompt Addition</Label>
                <Textarea value={editing.system_prompt} onChange={e => setEditing({ ...editing, system_prompt: e.target.value })} className="font-mono text-xs min-h-[120px]" />
              </div>
              <div className="space-y-2">
                <Label>User Prompt Template</Label>
                <Textarea value={editing.user_prompt_template} onChange={e => setEditing({ ...editing, user_prompt_template: e.target.value })} className="font-mono text-xs min-h-[200px]" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateTemplate.mutate(editing)} disabled={updateTemplate.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SystemPromptTab() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrompt = async () => {
    const { data } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'master_system_prompt')
      .single();
    setPrompt(data?.config_value || '');
    setLoading(false);
  };

  useState(() => { loadPrompt(); });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_config')
      .update({ config_value: prompt, updated_at: new Date().toISOString() })
      .eq('config_key', 'master_system_prompt');
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('System prompt saved');
    }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
        Changes take effect on the next AI generation. Existing generated content is not affected.
      </div>

      <Textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        className="font-mono text-xs min-h-[400px]"
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs ${prompt.length > 8000 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {prompt.length} characters
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPrompt}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
