import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function AdminConfigPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  // Check admin role
  const { data: roles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const isAdmin = roles?.some(r => r.role === 'admin');

  // Fetch current prompt
  useEffect(() => {
    async function fetchPrompt() {
      const { data } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'master_system_prompt')
        .single();
      if (data) setPrompt(data.config_value);
    }
    fetchPrompt();
  }, []);

  if (roles && !isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ config_value: prompt, updated_by: user!.id })
        .eq('config_key', 'master_system_prompt');
      if (error) throw error;
      toast.success('System prompt updated. Changes take effect on the next AI generation.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground">Manage the master AI system prompt used in all ArchBridge AI calls</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-card-foreground">Master System Prompt</h2>
          <Badge variant="outline" className="text-xs">{prompt.length} chars</Badge>
        </div>

        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="min-h-[400px] font-mono text-xs leading-relaxed"
          placeholder="Enter the master system prompt..."
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">⚠️ Changes take effect on the next AI generation</p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
