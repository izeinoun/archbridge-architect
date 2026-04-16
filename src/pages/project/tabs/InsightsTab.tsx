import { useParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const insightPanels = [
  {
    key: 'pain_points',
    title: 'Customer Pain Points',
    icon: '⚡',
    description: 'AI-extracted pain points from meeting notes and transcripts',
  },
  {
    key: 'customer_goals',
    title: 'Customer Goals',
    icon: '🎯',
    description: 'Strategic and operational goals identified across all project documents',
  },
  {
    key: 'problem_statement',
    title: 'Problem Statement',
    icon: '📋',
    description: 'A synthesized problem statement generated from all customer inputs',
  },
  {
    key: 'current_workflows',
    title: 'Current State Workflows',
    icon: '🔄',
    description: "Customer's existing workflows mapped from discovery sessions",
  },
  {
    key: 'solution_components',
    title: 'Proposed Solution Components',
    icon: '🧩',
    description: 'Recommended Penguin AI Digital Workers and custom components with reasoning',
  },
  {
    key: 'implementation_roadmap',
    title: 'Implementation Roadmap',
    icon: '🗺️',
    description: 'Phased delivery plan mapped to customer goals and constraints',
  },
  {
    key: 'expected_outcomes',
    title: 'Expected Outcomes',
    icon: '📈',
    description: 'Measurable outcomes and value metrics tied to each solution component',
  },
];

export default function InsightsTab() {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Project Insights</h2>
        <p className="text-sm text-muted-foreground">AI-extracted structured insights from project documents</p>
      </div>

      {insightPanels.map(panel => (
        <Collapsible
          key={panel.key}
          open={openPanels[panel.key]}
          onOpenChange={() => toggle(panel.key)}
        >
          <div className="rounded-lg border border-border bg-card">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-5 py-4 text-left">
              <span className="text-xl">{panel.icon}</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-card-foreground">{panel.title}</h3>
                <p className="text-xs text-muted-foreground">{panel.description}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openPanels[panel.key] ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border px-5 py-8">
                <div className="flex flex-col items-center text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    No data yet. Upload documents and generate insights in Phase 2.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Generate (Phase 2)
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
