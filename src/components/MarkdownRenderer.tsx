import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-border rounded-lg text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
        th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">{children}</th>,
        td: ({ children }) => <td className="border border-border px-3 py-2 text-muted-foreground">{children}</td>,
        tr: ({ children }) => <tr className="even:bg-muted/30">{children}</tr>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/40 bg-muted/40 pl-4 py-2 my-4 rounded-r-lg italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ children, className: codeClassName }) => {
          const isInline = !codeClassName;
          if (isInline) {
            return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>;
          }
          return (
            <pre className="bg-[#1e293b] text-slate-200 rounded-lg p-4 overflow-x-auto text-sm">
              <code className="font-mono">{children}</code>
            </pre>
          );
        },
        h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-3">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mt-5 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-semibold text-foreground mt-3 mb-1">{children}</h4>,
        p: ({ children }) => <p className="text-muted-foreground leading-relaxed mb-3">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1 text-muted-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-muted-foreground">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        hr: () => <hr className="my-6 border-border" />,
      }}
    />
    </div>
  );
}
