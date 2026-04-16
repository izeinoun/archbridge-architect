import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MermaidRenderer from '@/components/MermaidRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, GitGraph } from 'lucide-react';

interface PortalData {
  title: string;
  description: string;
  customer_name: string;
  documents: { id: string; title: string; document_type: string; content: string; version: number; created_at: string }[];
  diagrams: { id: string; title: string; content: string; diagram_description: string; created_at: string }[];
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'doc' | 'diagram'>('doc');

  useEffect(() => {
    loadPortal();
  }, [token]);

  const loadPortal = async () => {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('project-tools', {
        body: { action: 'portal', token },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result);
      if (result.documents?.length > 0) {
        setSelectedDocId(result.documents[0].id);
        setSelectedType('doc');
      }
    } catch (e: any) {
      setError(e.message || 'Link not found or expired');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="mb-6 text-[#1e3a5f] font-bold text-xl">Penguin AI</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This link is no longer available</h1>
        <p className="text-gray-500 max-w-md">Please contact your Penguin AI representative for access.</p>
      </div>
    );
  }

  const selectedDoc = data.documents.find(d => d.id === selectedDocId);
  const selectedDiagram = data.diagrams.find(d => d.id === selectedDocId);

  const handleDownload = (doc: { title: string; content: string }) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-4 border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-bold tracking-[2px] uppercase text-[#1e3a5f]">Penguin AI</span>
          <span className="text-xs text-gray-400">Powered by ArchBridge</span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-8 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">{data.title}</h1>
        {data.description && <p className="text-gray-600 mb-3">{data.description}</p>}
        <p className="text-sm text-gray-400">Prepared for {data.customer_name}</p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar nav */}
        <nav className="w-56 flex-shrink-0 border-r border-gray-200 p-4 sticky top-0 h-screen overflow-y-auto">
          {data.documents.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents</p>
              {data.documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocId(doc.id); setSelectedType('doc'); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 flex items-center gap-2 ${
                    selectedDocId === doc.id && selectedType === 'doc' ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
            </div>
          )}
          {data.diagrams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagrams</p>
              {data.diagrams.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDocId(d.id); setSelectedType('diagram'); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 flex items-center gap-2 ${
                    selectedDocId === d.id && selectedType === 'diagram' ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <GitGraph className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{d.title}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Main viewer */}
        <main className="flex-1 p-8 min-h-screen">
          {selectedType === 'doc' && selectedDoc && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-[#1e3a5f] text-white text-xs">{selectedDoc.document_type.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className="text-xs">v{selectedDoc.version}</Badge>
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedDoc)}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </div>
              <div className="prose prose-slate max-w-none">
                <MarkdownRenderer content={selectedDoc.content} />
              </div>
              <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400">
                Generated {new Date(selectedDoc.created_at).toLocaleDateString()} · Version {selectedDoc.version}
              </div>
            </div>
          )}
          {selectedType === 'diagram' && selectedDiagram && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedDiagram.title}</h2>
              <MermaidRenderer mermaidSource={selectedDiagram.content} diagramId={selectedDiagram.id} />
              {selectedDiagram.diagram_description && (
                <p className="mt-4 text-sm text-gray-500 italic">{selectedDiagram.diagram_description}</p>
              )}
            </div>
          )}
          {!selectedDoc && !selectedDiagram && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Select a document or diagram from the sidebar
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-6 text-center">
        <p className="text-xs text-gray-400">Prepared by Penguin AI using ArchBridge</p>
        <p className="text-xs text-gray-400 mt-1">This document is confidential and intended for the named recipient only.</p>
      </footer>
    </div>
  );
}
