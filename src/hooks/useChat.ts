import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { doc_name: string }[];
  created_at?: string;
}

export function useChat(projectId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('chat', {
        body: { project_id: projectId, action: 'history' },
      });
      if (fnError) throw fnError;
      setMessages((data?.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        created_at: m.created_at,
      })));
    } catch (e: any) {
      console.error('Load history error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const sendMessage = useCallback(async (message: string) => {
    if (!projectId || !message.trim() || isStreaming) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: message, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ project_id: projectId, message }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Chat request failed');
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'token') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && !last.id) {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            } else if (parsed.type === 'sources') {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, sources: parsed.sources }];
                }
                return prev;
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [projectId, isStreaming]);

  const clearHistory = useCallback(async () => {
    if (!projectId) return;
    await supabase.functions.invoke('chat', {
      body: { project_id: projectId, action: 'clear' },
    });
    setMessages([]);
  }, [projectId]);

  const summarize = useCallback(async () => {
    if (!projectId) return '';
    const { data } = await supabase.functions.invoke('chat', {
      body: { project_id: projectId, action: 'summarize' },
    });
    return data?.summary || '';
  }, [projectId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, isLoading, error, loadHistory, sendMessage, clearHistory, summarize, stopStreaming };
}
