import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGeneratedDocs, DocTemplateType } from '@/hooks/useGeneratedDocs';
import { useInsights } from '@/hooks/useInsights';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CritiquePanel from '@/components/CritiquePanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileOutput, Download, Trash2, Loader2, RotateCcw, ShieldCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES: { value: DocTemplateType; label: string; icon: string; internal?: boolean }[] = [
  { value: 'statement_of_work', label: 'Statement of Work', icon: '📋' },
  { value: 'business_requirements', label: 'Business Requirements Document', icon: '📝' },
  { value: 'solution_architecture_doc', label: 'Solution Architecture Document', icon: '🏗️' },
  { value: 'executive_summary', label: 'Executive Summary', icon: '📊' },
  { value: 'gap_analysis_report', label: 'Gap Analysis Report', icon: '🔍', internal: true },
  { value: 'implementation_plan', label: 'Implementation Plan', icon: '📅' },
];

export default function GeneratedDocsTab() {
  const { id } = useParams<{ id: string }>();
  const {
    documents, isLoading, isGenerating, streamContent, genError,
    generateDocument, deleteDocument, critiqueDocument, stopGenerating,
  } = useGeneratedDocs(id);
  const { insights } = useInsights(id);
  const [selectedType, setSelectedType] = useState<DocTemplateType>('statement_of_work');
  const [instructions, setInstructions] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [showCritique, setShowCritique] = useState(false);
  const [critiqueData, setCritiqueData] = useState<any>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);

  const hasInsights = !!insights;
  const selectedDocument = documents.find(d => d.id === selectedDoc);

  const handleGenerate = async () => {
    setSelectedDoc(null);
    const docId = await generateDocument(selectedType, instructions);
    if (docId) {
      setSelectedDoc(docId);
      setInstructions('');
      toast.success('Document generated successfully');
    }
  };

  const handleDelete = (docId: string) => {
    deleteDocument.mutate(docId, {
      onSuccess: () => {
        if (selectedDoc === docId) setSelectedDoc(null);
        toast.success('Document deleted');
      },
    });
  };

  const handleDownload = (doc: typeof selectedDocument) => {
    if (!doc) return;
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCritique = async () => {
    if (!selectedDoc) return;
    setCritiqueLoading(true);
    setShowCritique(true);
    try {
      const result = await critiqueDocument(selectedDoc);
      setCritiqueData(result.critique);
    } catch (e: any) {
      toast.error(`Critique failed: ${e.message}`);
      setShowCritique(false);
    } finally {
      setCritiqueLoading(false);
    }
  };

  const handleRegenWithImprovements = (improvements: string[]) => {
    setShowCritique(false);
    setInstructions(`Address these issues from the AI critique:\n${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}`);
  };

  const docTypeLabel = DOC_TYPES.find(d => d.value === selectedType)?.label || '';

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[35%] border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Generator */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Generate Document</h3>
          <Select value={selectedType} onValueChange={v => setSelectedType(v as DocTemplateType)}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>
                  <span className="flex items-center gap-2">
                    <span>{dt.icon}</span> {dt.label}
                    {dt.internal && <Badge variant="destructive" className="text-[10px] ml-1">Internal</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="E.g.: Focus on the prior authorization workflow, use formal language..."
            className="text-sm min-h-[80px]"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={handleGenerate}
                  disabled={!hasInsights || isGenerating}
                  className="w-full"
                  size="sm"
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating {docTypeLabel}...</>
                  ) : (
                    <><FileOutput className="h-4 w-4 mr-1" /> Generate</>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!hasInsights && (
              <TooltipContent>Generate insights first from the Insights tab</TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Document List */}
        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Previously Generated</h4>
          {isLoading ? (
            <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No documents generated yet</p>
          ) : (
            <div className="space-y-1">
              {documents.map(doc => {
                const dt = DOC_TYPES.find(d => d.value === doc.document_type);
                return (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDoc(doc.id); setShowCritique(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedDoc === doc.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{dt?.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        v{doc.version} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {doc.document_type === 'gap_analysis_report' && (
                      <Badge variant="destructive" className="text-[10px]">Internal</Badge>
                    )}
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); handleDownload(doc); }} className="text-muted-foreground hover:text-foreground">
                        <Download className="h-3 w-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isGenerating ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating {docTypeLabel}...</span>
              <Button variant="outline" size="sm" onClick={stopGenerating}>Stop</Button>
            </div>
            <MarkdownRenderer content={streamContent} />
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          </div>
        ) : selectedDocument ? (
          <>
            <div className="border-b border-border px-4 py-3 flex items-center gap-2 bg-card">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">{selectedDocument.title}</h3>
              <Badge variant="secondary" className="text-xs">v{selectedDocument.version}</Badge>
              <Button variant="outline" size="sm" onClick={() => handleDownload(selectedDocument)}>
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleCritique} disabled={critiqueLoading}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Critique
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedDoc(null);
                setSelectedType(selectedDocument.document_type as DocTemplateType);
              }}>
                <RotateCcw className="h-3 w-3 mr-1" /> Regenerate
              </Button>
            </div>
            {showCritique ? (
              <CritiquePanel
                data={critiqueData}
                loading={critiqueLoading}
                onClose={() => setShowCritique(false)}
                onRegenerate={handleRegenWithImprovements}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <MarkdownRenderer content={selectedDocument.content} />
                <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
                  Generated {new Date(selectedDocument.created_at).toLocaleString()} · Version {selectedDocument.version}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FileOutput className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No document selected</h3>
            <p className="text-sm text-muted-foreground">Select a document to preview or generate a new one</p>
          </div>
        )}

        {genError && (
          <div className="p-4 bg-destructive/10 border-t border-destructive/20">
            <p className="text-sm text-destructive">{genError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
