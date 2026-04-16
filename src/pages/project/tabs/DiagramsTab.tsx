import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useInsights } from '@/hooks/useInsights';
import MermaidRenderer from '@/components/MermaidRenderer';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Copy, ChevronDown, GitGraph } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type DiagramType = 'solution_overview' | 'data_flow' | 'integration_architecture' | 'current_state_workflow' | 'future_state_workflow' | 'component_dependency' | 'implementation_phases';

const DIAGRAM_TYPES: { value: DiagramType; label: string; icon: string }[] = [
  { value: 'solution_overview', label: 'Solution Overview', icon: '🏗️' },
  { value: 'data_flow', label: 'Data Flow', icon: '🌊' },
  { value: 'integration_architecture', label: 'Integration Architecture', icon: '🔗' },
  { value: 'current_state_workflow', label: 'Current State Workflow', icon: '📋' },
  { value: 'future_state_workflow', label: 'Future State Workflow', icon: '✨' },
  { value: 'component_dependency', label: 'Component Dependencies', icon: '🧩' },
  { value: 'implementation_phases', label: 'Implementation Timeline', icon: '📅' },
];

export default function DiagramsTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const { insights } = useInsights(projectId);
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DiagramType>('solution_overview');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<any>(null);
  const [showSource, setShowSource] = useState(false);
  const [editedSource, setEditedSource] = useState('');

  const { data: diagrams = [], isLoading } = useQuery({
    queryKey: ['diagrams', projectId],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('project-tools', {
        body: { action: 'list', project_id: projectId },
      });
      return data?.diagrams || [];
    },
    enabled: !!projectId,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('project-tools', {
        body: { project_id: projectId, diagram_type: selectedType, user_instructions: instructions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Diagram generated');
      queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      setSelectedDiagram({ id: data.diagram_id, content: data.mermaid_source, diagram_description: data.description });
      setEditedSource(data.mermaid_source);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(selectedDiagram?.content || '');
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[35%] border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Generate Diagram</h3>
          <Select value={selectedType} onValueChange={v => setSelectedType(v as DiagramType)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIAGRAM_TYPES.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>
                  <span className="flex items-center gap-2"><span>{dt.icon}</span> {dt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Customize the diagram focus or emphasis..."
            className="text-sm min-h-[60px]"
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !insights} className="w-full" size="sm">
            {isGenerating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</> : 'Generate Diagram'}
          </Button>
          <p className="text-xs text-muted-foreground">Diagrams are generated from your project insights. Generate insights first for best results.</p>
        </div>

        <div className="border-t border-border pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Generated Diagrams</h4>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          ) : diagrams.length === 0 ? (
            <p className="text-xs text-muted-foreground">No diagrams yet</p>
          ) : (
            <div className="space-y-1">
              {diagrams.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDiagram(d); setEditedSource(d.content); setShowSource(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                    selectedDiagram?.id === d.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <p className="font-medium truncate">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">v{d.version} · {new Date(d.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDiagram ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground flex-1">{selectedDiagram.title || 'Diagram'}</h3>
              <Button variant="outline" size="sm" onClick={handleCopySource}><Copy className="h-3 w-3 mr-1" /> Copy Source</Button>
            </div>

            <MermaidRenderer mermaidSource={showSource ? editedSource : selectedDiagram.content} diagramId={selectedDiagram.id} />

            {selectedDiagram.diagram_description && (
              <p className="text-xs italic text-muted-foreground">{selectedDiagram.diagram_description}</p>
            )}

            <Collapsible open={showSource} onOpenChange={setShowSource}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ChevronDown className={`h-3 w-3 transition-transform ${showSource ? 'rotate-180' : ''}`} />
                {showSource ? 'Hide' : 'View'} Mermaid Source
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <textarea
                  value={editedSource}
                  onChange={e => setEditedSource(e.target.value)}
                  className="w-full h-48 bg-muted font-mono text-xs p-3 rounded-lg border border-border resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">Edit the source above and close/reopen this panel to re-render.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <EmptyState
            icon={<GitGraph className="h-7 w-7 text-primary" />}
            title="No diagram selected"
            description="Generate architecture diagrams from your project insights"
          />
        )}
      </div>
    </div>
  );
}
