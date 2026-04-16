import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PresenceClient } from '@/hooks/usePresence';

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];

function getColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const TAB_LABELS: Record<string, string> = {
  '': 'Insights', documents: 'Documents', chat: 'Chat',
  generated: 'Generated Docs', diagrams: 'Diagrams', settings: 'Settings', timeline: 'Timeline',
};

export default function PresenceBar({ clients }: { clients: PresenceClient[] }) {
  if (clients.length === 0) return null;

  const shown = clients.slice(0, 5);
  const extra = clients.length - 5;

  return (
    <div className="flex items-center gap-0.5">
      {shown.map(c => (
        <Tooltip key={c.user_id}>
          <TooltipTrigger asChild>
            <div className={`relative h-7 w-7 rounded-full ${getColor(c.user_id)} flex items-center justify-center text-[10px] font-bold text-white cursor-default`}>
              {c.avatar_initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-card" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {c.user_name} · {TAB_LABELS[c.current_tab] || c.current_tab || 'Browsing'}
          </TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  );
}
