import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  title: string | null;
  description: string | null;
  included_document_ids: string[];
  include_diagrams: boolean;
  expires_at: string | null;
  is_active: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

export function useShareLinks(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shareLinks = [], isLoading } = useQuery({
    queryKey: ['share-links', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ShareLink[];
    },
    enabled: !!projectId,
  });

  const createShareLink = useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      included_document_ids: string[];
      include_diagrams: boolean;
      expires_at: string | null;
    }) => {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { data, error } = await supabase
        .from('share_links')
        .insert({
          project_id: projectId!,
          created_by: user!.id,
          token,
          title: params.title,
          description: params.description,
          included_document_ids: params.included_document_ids,
          include_diagrams: params.include_diagrams,
          expires_at: params.expires_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ShareLink;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['share-links', projectId] }),
  });

  const deactivateLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('share_links')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['share-links', projectId] }),
  });

  return { shareLinks, isLoading, createShareLink, deactivateLink };
}
