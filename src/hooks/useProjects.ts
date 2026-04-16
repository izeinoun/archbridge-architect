import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Project } from '@/types';

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (input: { name: string; customer_name: string; description?: string }) => {
      // Create project
      const { data: project, error } = await supabase
        .from('projects')
        .insert({ ...input, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator as owner member
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user!.id,
        role: 'owner',
      });

      return project;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { projects, isLoading, createProject };
}
