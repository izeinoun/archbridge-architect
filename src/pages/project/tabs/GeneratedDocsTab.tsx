import { FileOutput } from 'lucide-react';

export default function GeneratedDocsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <FileOutput className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">Generated Documents</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        AI-generated SOWs, BRDs, architecture documents, and more. Each document will include source citations and versioning.
      </p>
      <p className="text-xs text-muted-foreground">Coming in Phase 2</p>
    </div>
  );
}
