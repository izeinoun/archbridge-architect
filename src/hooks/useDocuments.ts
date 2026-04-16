import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DocumentRecord {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size_bytes: number | null;
  parse_status: string;
  parse_error: string | null;
  extracted_text: string | null;
  created_at: string;
}

export function useDocuments(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as DocumentRecord[];
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const docs = query.state.data as DocumentRecord[] | undefined;
      if (docs?.some(d => d.parse_status === 'processing' || d.parse_status === 'pending')) {
        return 3000;
      }
      return false;
    },
  });

  const uploadDocuments = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        const typeMap: Record<string, string> = {
          pdf: 'pdf', txt: 'txt', docx: 'docx', pptx: 'pptx',
          jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp',
        };
        const fileType = typeMap[fileExt] || fileExt;
        const storagePath = `${projectId}/${crypto.randomUUID()}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file);
        if (uploadError) throw uploadError;

        // Insert document record
        const { data: user } = await supabase.auth.getUser();
        const { data: doc, error: insertError } = await supabase
          .from('documents')
          .insert({
            project_id: projectId!,
            uploaded_by: user.user!.id,
            file_name: file.name,
            file_type: fileType,
            file_path: storagePath,
            file_size_bytes: file.size,
            parse_status: 'processing',
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // Trigger parsing (fire and forget)
        supabase.functions.invoke('process-document', {
          body: { document_id: doc.id },
        }).catch(console.error);

        results.push(doc);
      }
      return results;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const retryDocument = useMutation({
    mutationFn: async (docId: string) => {
      await supabase.from('documents').update({ parse_status: 'processing', parse_error: null }).eq('id', docId);
      supabase.functions.invoke('process-document', { body: { document_id: docId } }).catch(console.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: DocumentRecord) => {
      await supabase.storage.from('documents').remove([doc.file_path]);
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const hasReadyDocs = documents.some(d => d.parse_status === 'done');

  return { documents, isLoading, uploadDocuments, deleteDocument, retryDocument, hasReadyDocs };
}
