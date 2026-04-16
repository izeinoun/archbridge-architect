import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useDocuments, DocumentRecord } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Image, Presentation, File, Trash2, Eye, X, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

const fileIcons: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  docx: <FileText className="h-4 w-4 text-blue-500" />,
  pptx: <Presentation className="h-4 w-4 text-orange-500" />,
  txt: <File className="h-4 w-4 text-muted-foreground" />,
  jpeg: <Image className="h-4 w-4 text-green-500" />,
  jpg: <Image className="h-4 w-4 text-green-500" />,
  png: <Image className="h-4 w-4 text-green-500" />,
  webp: <Image className="h-4 w-4 text-green-500" />,
  image: <Image className="h-4 w-4 text-green-500" />,
};

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DocumentsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const { documents, uploadDocuments, deleteDocument, retryDocument } = useDocuments(projectId);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    try {
      await uploadDocuments.mutateAsync(files);
      toast.success(`${files.length} file(s) uploaded and processing`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  }, [uploadDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 25 * 1024 * 1024,
  });

  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    setDeleting(doc.id);
    try {
      await deleteDocument.mutateAsync(doc);
      if (selected?.id === doc.id) setSelected(null);
      toast.success('Document deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
    setDeleting(null);
  };

  if (documents.length === 0 && !uploadDocuments.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div
          {...getRootProps()}
          className={`mb-6 flex h-40 w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, Word, PowerPoint, Text, Images (max 25MB)</p>
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload meeting notes, transcripts, product docs, and diagrams. ArchBridge AI will parse and extract insights from them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full animate-fade-in">
      {/* Left panel */}
      <div className="w-full md:w-2/5 md:border-r border-b md:border-b-0 border-border overflow-y-auto">
        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`m-3 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">
              {uploadDocuments.isPending ? 'Uploading...' : 'Drop files or click to upload'}
            </p>
            <p className="text-[10px] text-muted-foreground">PDF, DOCX, PPTX, TXT, Images</p>
          </div>
        </div>

        {/* Document list */}
        <div className="divide-y divide-border">
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                selected?.id === doc.id ? 'bg-muted' : ''
              }`}
            >
              <span className="shrink-0">{fileIcons[doc.file_type] || <File className="h-4 w-4" />}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{formatSize(doc.file_size_bytes)}</span>
                  <span>·</span>
                  <span>{timeAgo(doc.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.parse_status === 'processing' && (
                  <Badge variant="outline" className="text-[10px] animate-pulse border-warning text-warning">⏳ Processing</Badge>
                )}
                {doc.parse_status === 'pending' && (
                  <Badge variant="outline" className="text-[10px] animate-pulse border-warning text-warning">⏳ Pending</Badge>
                )}
                {doc.parse_status === 'done' && (
                  <Badge variant="outline" className="text-[10px] border-success text-success">✅ Ready</Badge>
                )}
                {doc.parse_status === 'error' && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] border-destructive text-destructive" title={doc.parse_error || 'Error'}>❌ Error</Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); retryDocument.mutate(doc.id); toast.info('Retrying parse...'); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Retry parsing"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(doc); }}
                  disabled={deleting === doc.id}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel - preview (hidden on mobile when no selection) */}
      <div className={`flex-1 overflow-y-auto p-6 ${!selected ? 'hidden md:flex' : ''}`}>
        {!selected ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a document to preview</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selected.file_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs uppercase">{selected.file_type}</Badge>
                  <span className="text-xs text-muted-foreground">{formatSize(selected.file_size_bytes)}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selected.parse_status === 'processing' && (
              <div className="space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <p className="text-sm text-muted-foreground mt-4">Processing document...</p>
              </div>
            )}

            {selected.parse_status === 'error' && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">Parsing failed</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.parse_error || 'Unknown error'}</p>
              </div>
            )}

            {selected.parse_status === 'done' && selected.extracted_text && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {selected.extracted_text.split(/\s+/).length} words
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setShowFullText(true)}>
                    View Full Text
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-foreground bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto scrollbar-thin font-sans leading-relaxed">
                  {selected.extracted_text.substring(0, 2000)}
                  {selected.extracted_text.length > 2000 && '\n\n... (truncated, click "View Full Text" to see all)'}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full text modal */}
      <Dialog open={showFullText} onOpenChange={setShowFullText}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.file_name}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-xs text-foreground font-sans leading-relaxed">
            {selected?.extracted_text}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
