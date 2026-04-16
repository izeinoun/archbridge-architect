import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useActivityLog, ActivityEvent } from '@/hooks/useActivityLog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Brain, FileOutput, Users, Link2, GitGraph, Search as SearchIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

const FILTERS = [
  { value: 'all', label: 'All Activity' },
  { value: 'document', label: 'Documents' },
  { value: 'insight', label: 'Insights' },
  { value: 'generated_doc', label: 'Generated Docs' },
  { value: 'member', label: 'Team' },
  { value: 'share_link', label: 'Sharing' },
];

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  document_uploaded: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', label: 'Document uploaded' },
  document_parsed: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', label: 'Document parsed' },
  document_deleted: { icon: FileText, color: 'text-red-500 bg-red-500/10', label: 'Document deleted' },
  insight_generated: { icon: Brain, color: 'text-purple-500 bg-purple-500/10', label: 'Insight generated' },
  insight_approved: { icon: Brain, color: 'text-green-500 bg-green-500/10', label: 'Insight approved' },
  insight_rejected: { icon: Brain, color: 'text-red-500 bg-red-500/10', label: 'Insight rejected' },
  doc_generated: { icon: FileOutput, color: 'text-green-500 bg-green-500/10', label: 'Document generated' },
  doc_critiqued: { icon: SearchIcon, color: 'text-orange-500 bg-orange-500/10', label: 'Document critiqued' },
  diagram_generated: { icon: GitGraph, color: 'text-indigo-500 bg-indigo-500/10', label: 'Diagram generated' },
  member_added: { icon: Users, color: 'text-gray-500 bg-gray-500/10', label: 'Member added' },
  member_removed: { icon: Users, color: 'text-gray-500 bg-gray-500/10', label: 'Member removed' },
  share_link_created: { icon: Link2, color: 'text-teal-500 bg-teal-500/10', label: 'Share link created' },
  share_link_deactivated: { icon: Link2, color: 'text-gray-500 bg-gray-500/10', label: 'Share link deactivated' },
  project_created: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', label: 'Project created' },
  project_updated: { icon: FileText, color: 'text-blue-500 bg-blue-500/10', label: 'Project updated' },
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ActivityTimelineTab() {
  const { id } = useParams<{ id: string }>();
  const [filter, setFilter] = useState('all');
  const actionFilter = filter === 'all' ? undefined : undefined; // We filter client-side
  const { events, isLoading } = useActivityLog(id);

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.entity_type === filter || e.action_type?.startsWith(filter));

  // Group by date
  const grouped: { date: string; events: ActivityEvent[] }[] = [];
  let currentDate = '';
  for (const e of filtered) {
    const label = getDateLabel(e.created_at);
    if (label !== currentDate) {
      currentDate = label;
      grouped.push({ date: label, events: [] });
    }
    grouped[grouped.length - 1].events.push(e);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Activity Timeline</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7 text-primary" />}
          title="No activity recorded yet"
          description="Activity will appear here as you upload documents, generate insights, and collaborate."
        />
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          {grouped.map((group, gi) => (
            <div key={gi}>
              {/* Date header */}
              <div className="sticky top-0 z-10 bg-background py-2 pl-12 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.date}</span>
              </div>

              {group.events.map(event => {
                const config = ACTION_CONFIG[event.action_type] || { icon: FileText, color: 'text-muted-foreground bg-muted', label: event.action_type };
                const Icon = config.icon;
                return (
                  <div key={event.id} className="relative flex gap-4 mb-4 pl-0">
                    {/* Node on timeline */}
                    <div className={`relative z-10 flex-shrink-0 h-10 w-10 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-card border border-border rounded-lg p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          {event.entity_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">{event.entity_name}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/60 flex-shrink-0">{formatRelativeTime(event.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                          {event.avatar_initials}
                        </div>
                        <span className="text-xs text-muted-foreground">{event.user_name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
