import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocumentsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">No documents yet</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Upload meeting notes, transcripts, product docs, and diagrams. ArchBridge AI will parse and extract insights from them.
      </p>
      <Button disabled>
        <Upload className="mr-2 h-4 w-4" /> Upload Document (Phase 2)
      </Button>
    </div>
  );
}
