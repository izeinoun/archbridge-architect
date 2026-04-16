import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type InsightType =
  | 'pain_points' | 'customer_goals' | 'problem_statement'
  | 'current_workflows' | 'solution_components'
  | 'implementation_roadmap' | 'expected_outcomes';

export function useInsights(projectId: string | undefined) {
  const queryClient = useQueryClient();

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

  const getInsightData = (type: InsightType): any => {
    if (!insights) return null;
    const raw = (insights as any)[type];
    if (!raw) return null;
    if (type === 'problem_statement' && typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
  };

  return { insights, isLoading, generateInsight, getInsightData };
}
