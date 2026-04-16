import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceClient {
  user_id: string;
  user_name: string;
  avatar_initials: string;
  current_tab: string;
  online_at: string;
}

export function usePresence(projectId: string | undefined) {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<PresenceClient[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!projectId || !user || !profile) return;

    const channel = supabase.channel(`presence:${projectId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceClient>();
        const allClients: PresenceClient[] = [];
        for (const key in state) {
          const presences = state[key];
          if (presences && presences.length > 0) {
            allClients.push(presences[0]);
          }
        }
        setClients(allClients.filter(c => c.user_id !== user.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            user_id: user.id,
            user_name: profile.full_name,
            avatar_initials: profile.avatar_initials || '??',
            current_tab: '',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [projectId, user, profile]);

  const sendTabChange = useCallback(async (tab: string) => {
    if (!channelRef.current || !user || !profile) return;
    await channelRef.current.track({
      user_id: user.id,
      user_name: profile.full_name,
      avatar_initials: profile.avatar_initials || '??',
      current_tab: tab,
      online_at: new Date().toISOString(),
    });
  }, [user, profile]);

  return { clients, isConnected, sendTabChange };
}
