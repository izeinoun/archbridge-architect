import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const typeIcons: Record<string, string> = {
  document_parsed: '📄',
  insight_generated: '💡',
  document_generated: '📋',
  critique_complete: '🔍',
  member_added: '👥',
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (n: typeof notifications[0]) => {
    markRead.mutate(n.id);
    if (n.project_id) navigate(`/projects/${n.project_id}`);
    setOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">You're all caught up</p>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0 ${
                  !n.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">{typeIcons[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
