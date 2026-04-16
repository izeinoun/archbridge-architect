import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ActivityEvent {
  id: string;
  project_id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user_name?: string;
  avatar_initials?: string;
}

export function useActivityLog(projectId: string | undefined, filters?: { action_type?: string; limit?: number }) {
  const { user } = useAuth();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['activity-log', projectId, filters?.action_type],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for user names
      const userIds = [...new Set((data || []).map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_initials')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(e => ({
        ...e,
        metadata: e.metadata as Record<string, any>,
        user_name: profileMap.get(e.user_id)?.full_name || 'Unknown',
        avatar_initials: profileMap.get(e.user_id)?.avatar_initials || '??',
      })) as ActivityEvent[];
    },
    enabled: !!projectId,
  });

  const logActivity = useMutation({
    mutationFn: async (event: {
      action_type: string;
      entity_type?: string;
      entity_id?: string;
      entity_name?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!projectId || !user) return;
      await supabase.from('activity_log').insert({
        project_id: projectId,
        user_id: user.id,
        action_type: event.action_type,
        entity_type: event.entity_type || null,
        entity_id: event.entity_id || null,
        entity_name: event.entity_name || null,
        metadata: event.metadata || {},
      });
    },
  });

  return { events, isLoading, logActivity, refetch };
}
