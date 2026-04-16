import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useDocuments } from '@/hooks/useDocuments';
import { useInsights } from '@/hooks/useInsights';
import { useProject } from '@/hooks/useProject';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquare, Send, FileText, Lightbulb, CheckCircle2, Minus, Trash2, BookOpen, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTED_QUESTIONS = [
  "What are the most critical pain points for this customer?",
  "Which Penguin AI products best address this customer's needs?",
  "What gaps exist between our current products and their requirements?",
  "Critique our proposed solution — what are the weaknesses?",
  "What questions should we ask the customer in our next meeting?",
  "Summarize this engagement for an executive briefing",
];

const INSIGHT_TYPES = [
  'pain_points', 'customer_goals', 'problem_statement',
  'current_workflows', 'solution_components', 'implementation_roadmap', 'expected_outcomes',
] as const;

const INSIGHT_LABELS: Record<string, string> = {
  pain_points: 'Pain Points',
  customer_goals: 'Customer Goals',
  problem_statement: 'Problem Statement',
  current_workflows: 'Workflows',
  solution_components: 'Solution Components',
  implementation_roadmap: 'Roadmap',
  expected_outcomes: 'Outcomes',
};

export default function ChatTab() {
  const { id } = useParams<{ id: string }>();
  const { messages, isStreaming, isLoading, error, loadHistory, sendMessage, clearHistory, summarize, stopStreaming } = useChat(id);
  const { documents } = useDocuments(id);
  const { insights, getInsightData } = useInsights(id);
  const { project } = useProject(id);
  const [input, setInput] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);

  const parsedDocs = documents.filter(d => d.parse_status === 'done');
  const insightCount = INSIGHT_TYPES.filter(t => getInsightData(t)).length;

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSummarize = async () => {
    setSummaryLoading(true);
    setShowSummary(true);
    const result = await summarize();
    setSummaryText(result);
    setSummaryLoading(false);
  };

  const handleClear = async () => {
    await clearHistory();
    setShowClearConfirm(false);
    toast.success('Chat history cleared');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full">
      {/* Left Context Panel - hidden on mobile */}
      <div className="hidden md:flex w-[30%] border-r border-border bg-card p-4 flex-col gap-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground">Project Context</h3>

        {/* Documents in context */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Documents</span>
            <Badge variant="secondary" className="text-xs">{parsedDocs.length}</Badge>
          </div>
          {parsedDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No parsed documents yet</p>
          ) : (
            <div className="space-y-1">
              {parsedDocs.slice(0, 10).map(doc => (
                <div key={doc.id} className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <span>📄</span> {doc.file_name}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1 italic">These documents are included in every response</p>
        </div>

        {/* Insights in context */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Insights</span>
            <Badge variant="secondary" className="text-xs">{insightCount}/7</Badge>
          </div>
          <div className="space-y-1">
            {INSIGHT_TYPES.map(type => {
              const hasData = !!getInsightData(type);
              return (
                <div key={type} className="text-xs flex items-center gap-1.5">
                  {hasData ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground/50" />
                  )}
                  <span className={hasData ? 'text-foreground' : 'text-muted-foreground/50'}>
                    {INSIGHT_LABELS[type]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1 italic">Generated insights are included in AI context</p>
        </div>

        {/* Suggested Questions */}
        <div>
          <span className="text-xs font-medium text-foreground mb-2 block">Suggested Questions</span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded-md transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive text-xs w-full"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Clear History
          </Button>
        </div>
      </div>

      {/* Right Chat Panel */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">ArchBridge AI Chat</span>
            <span className="text-xs text-muted-foreground">
              {parsedDocs.length} docs · {insightCount} insights in context
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={messages.length === 0}>
            <BookOpen className="h-3 w-3 mr-1" /> Summarize
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" onScroll={handleScroll} ref={scrollAreaRef}>
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Start a conversation about this project</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Ask about customer needs, solution options, or request a draft of any document section.
              </p>
              <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); }}
                    className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[hsl(var(--sidebar-background))] flex items-center justify-center text-xs font-bold text-primary-foreground">
                  AB
                </div>
              )}
              <div className={`max-w-[75%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2'
                  : 'bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3'
              }`}>
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">📄 Referenced: </span>
                    {msg.sources.map((s, si) => (
                      <Badge key={si} variant="secondary" className="text-xs mr-1">{s.doc_name}</Badge>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground/60 mt-1">{formatTime(msg.created_at)}</div>
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  You
                </div>
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[hsl(var(--sidebar-background))] flex items-center justify-center text-xs font-bold text-primary-foreground">AB</div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-xs text-destructive">
                Response failed — {error} ·{' '}
                <button onClick={() => sendMessage(messages.filter(m => m.role === 'user').pop()?.content || '')} className="underline">
                  Retry
                </button>
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this project..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button variant="outline" size="sm" onClick={stopStreaming}>Stop</Button>
            ) : (
              <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-muted-foreground/60">ArchBridge AI may make mistakes. Always verify claims against source documents.</p>
            {input.length > 1800 && (
              <span className={`text-xs ${input.length > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {input.length}/2000
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clear Confirm Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clear chat history?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will delete all messages in this project's chat. This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClear}>Clear</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Conversation Summary</DialogTitle></DialogHeader>
          {summaryLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Summarizing conversation...</span>
            </div>
          ) : (
            <MarkdownRenderer content={summaryText} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
