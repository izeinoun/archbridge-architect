import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project, ProjectMember, Profile } from '@/types';

export function useProject(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (data || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      return (data || []).map(m => ({
        ...m,
        profiles: (profiles || []).find(p => p.id === m.user_id) || null,
      })) as (ProjectMember & { profiles: Profile })[];
    },
    enabled: !!projectId,
  });

  const updateProject = useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return { project, members, isLoading, updateProject };
}
