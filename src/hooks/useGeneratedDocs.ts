import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useCallback } from 'react';

export interface GeneratedDoc {
  id: string;
  project_id: string;
  document_type: string;
  title: string;
  content: string;
  sources: any;
  version: number;
  generated_by: string;
  parent_document_id: string | null;
  created_at: string;
}

export type DocTemplateType =
  | 'statement_of_work' | 'business_requirements'
  | 'solution_architecture_doc' | 'executive_summary'
  | 'gap_analysis_report' | 'implementation_plan';

export function useGeneratedDocs(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['generated-docs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('project_id', projectId!)
        .neq('document_type', 'critique')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GeneratedDoc[];
    },
    enabled: !!projectId,
  });

  const generateDocument = useCallback(async (
    templateType: DocTemplateType,
    userInstructions: string = ''
  ) => {
    if (!projectId || isGenerating) return;
    setIsGenerating(true);
    setStreamContent('');
    setGenError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ project_id: projectId, template_type: templateType, user_instructions: userInstructions }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Generation failed');
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';
      let docId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6).trim());
            if (parsed.type === 'token') {
              content += parsed.content;
              setStreamContent(content);
            } else if (parsed.type === 'done') {
              docId = parsed.document_id;
            }
          } catch { /* skip */ }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['generated-docs', projectId] });
      return docId;
    } catch (e: any) {
      if (e.name !== 'AbortError') setGenError(e.message);
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [projectId, isGenerating, queryClient]);

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('generated_documents').delete().eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generated-docs', projectId] }),
  });

  const critiqueDocument = useCallback(async (documentId: string) => {
    const { data, error } = await supabase.functions.invoke('critique-document', {
      body: { document_id: documentId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    documents, isLoading, isGenerating, streamContent, genError,
    generateDocument, deleteDocument, critiqueDocument, stopGenerating,
  };
}
