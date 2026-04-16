import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type InsightType =
  | 'pain_points' | 'customer_goals' | 'problem_statement'
  | 'current_workflows' | 'solution_components'
  | 'implementation_roadmap' | 'expected_outcomes';

export function useInsights(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_insights')
        .select('*')
        .eq('project_id', projectId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const generateInsight = useMutation({
    mutationFn: async (insightType: InsightType) => {
      const { data, error } = await supabase.functions.invoke('generate-insight', {
        body: { project_id: projectId, insight_type: insightType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', projectId] });
    },
  });

  const approveInsight = useMutation({
    mutationFn: async (insightType: InsightType) => {
      const currentApproval = ((insights as any)?.approval_status || {}) as Record<string, any>;
      const currentStatus = currentApproval[insightType]?.status;
      
      const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
      const updated = {
        ...currentApproval,
        [insightType]: {
          status: newStatus,
          approved_by: newStatus === 'approved' ? user?.id : null,
          approved_by_name: newStatus === 'approved' ? profile?.full_name : null,
          approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
          notes: null,
        },
      };

      const { error } = await supabase
        .from('project_insights')
        .update({ approval_status: updated })
        .eq('project_id', projectId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', projectId] }),
  });

  const rejectInsight = useMutation({
    mutationFn: async ({ type, notes }: { type: InsightType; notes: string }) => {
      const currentApproval = ((insights as any)?.approval_status || {}) as Record<string, any>;
      const updated = {
        ...currentApproval,
        [type]: {
          status: 'rejected',
          approved_by: user?.id,
          approved_by_name: profile?.full_name,
          approved_at: new Date().toISOString(),
          notes,
        },
      };

      const { error } = await supabase
        .from('project_insights')
        .update({ approval_status: updated })
        .eq('project_id', projectId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', projectId] }),
  });

  const lockInsights = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_insights')
        .update({ locked: true })
        .eq('project_id', projectId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', projectId] }),
  });

  const unlockInsights = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_insights')
        .update({ locked: false })
        .eq('project_id', projectId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', projectId] }),
  });

  const getInsightData = (type: InsightType): any => {
    if (!insights) return null;
    const raw = (insights as any)[type];
    if (!raw) return null;
    if (type === 'problem_statement' && typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
  };

  return {
    insights, isLoading, generateInsight, getInsightData,
    approveInsight, rejectInsight, lockInsights, unlockInsights,
  };
}
