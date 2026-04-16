import { MessageSquare } from 'lucide-react';

export default function ChatTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">Project Chat</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Chat with ArchBridge AI about this project's documents, insights, and architecture decisions. Every response will cite its sources.
      </p>
      <p className="text-xs text-muted-foreground">Coming in Phase 2</p>
    </div>
  );
}
