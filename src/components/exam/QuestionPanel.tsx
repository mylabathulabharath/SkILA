import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, TestTube, Image as ImageIcon, Terminal, ShieldAlert, Zap } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

interface Question {
  id: string;
  title: string;
  problem_statement: string;
  difficulty: string;
  testCases: TestCase[];
  image_url?: string | null;
}

interface QuestionPanelProps {
  question: Question;
}

export const QuestionPanel = ({ question }: QuestionPanelProps) => {
  if (!question) {
    return (
      <div className="h-full flex items-center justify-center bg-card rounded-xl border text-muted-foreground text-sm">
        No question data available.
      </div>
    );
  }

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case '1': return { label: 'Easy', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case '2': return { label: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case '3': return { label: 'Hard', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
      case '4': return { label: 'Hard', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
      case '5': return { label: 'Expert', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      default: return { label: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
  };

  const diff = getDifficultyConfig(question.difficulty);

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Compact Header */}
      <div className="px-5 py-3 border-b border-border/50 bg-muted/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground truncate pr-4">
            {question.title}
          </h1>
          <Badge variant="outline" className={`${diff.color} border text-[10px] font-bold px-2.5 py-0.5 flex-shrink-0`}>
            {diff.label}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="problem" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent h-9 p-0 flex-shrink-0">
          <TabsTrigger
            value="problem"
            className="flex items-center gap-2 rounded-none h-full text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-primary transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Description
          </TabsTrigger>
          <TabsTrigger
            value="testcases"
            className="flex items-center gap-2 rounded-none h-full text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-primary transition-colors"
          >
            <TestTube className="h-3.5 w-3.5" />
            Examples
          </TabsTrigger>
        </TabsList>

        {/* Problem Description */}
        <TabsContent value="problem" className="flex-1 overflow-y-auto m-0 scrollbar-thin">
          <div className="px-5 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-bold prose-headings:mt-5 prose-headings:mb-2
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-p:text-[13px] prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:mb-3
              prose-li:text-[13px] prose-li:text-foreground/80 prose-li:my-0.5
              prose-strong:text-foreground prose-strong:font-bold
              prose-code:text-primary prose-code:font-medium prose-code:text-[12px]
              prose-pre:my-3
              prose-hr:my-4 prose-hr:border-border/30
              prose-ul:my-2 prose-ol:my-2
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  h1: ({ node, children, ...props }) => (
                    <h2 className="text-base font-bold text-foreground mt-5 mb-2 flex items-center gap-2" {...props}>
                      {children}
                    </h2>
                  ),
                  h2: ({ node, children, ...props }) => (
                    <h3 className="text-sm font-bold text-foreground mt-4 mb-2 flex items-center gap-2" {...props}>
                      {children}
                    </h3>
                  ),
                  h3: ({ node, children, ...props }) => (
                    <h4 className="text-sm font-semibold text-foreground mt-3 mb-1.5" {...props}>
                      {children}
                    </h4>
                  ),
                  p: ({ node, ...props }) => <p className="text-[13px] text-foreground/80 leading-relaxed mb-3" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-0.5" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-0.5" {...props} />,
                  li: ({ node, ...props }) => <li className="text-[13px] text-foreground/80 leading-relaxed" {...props} />,
                  code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = !!match;
                    return !isBlock ? (
                      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[12px] font-mono font-medium" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-muted/50 border border-border/50 p-3 rounded-lg text-[12px] font-mono my-3 overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    )
                  },
                  hr: () => <hr className="my-4 border-border/30" />,
                  strong: ({ node, ...props }) => <strong className="text-foreground font-bold" {...props} />,
                  a: ({ node, ...props }) => <a className="text-primary underline decoration-primary/30 hover:decoration-primary transition-colors" {...props} />,
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
                      <table className="min-w-full text-[12px]" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => <th className="px-3 py-1.5 text-left bg-muted/50 font-semibold border-b border-border/50" {...props} />,
                  td: ({ node, ...props }) => <td className="px-3 py-1.5 border-b border-border/30" {...props} />,
                }}
              >
                {question.problem_statement || "No problem statement available."}
              </ReactMarkdown>
            </div>

            {/* Image */}
            {question.image_url && (
              <div className="mt-4 px-1">
                <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/20 p-2">
                  <img
                    src={question.image_url}
                    alt="Problem illustration"
                    className="w-full h-auto rounded object-contain max-h-[400px]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Test Cases */}
        <TabsContent value="testcases" className="flex-1 overflow-y-auto m-0 scrollbar-thin">
          <div className="px-5 py-4 space-y-4">
            {question.testCases.filter(tc => tc.input || tc.output).map((testCase, index) => (
              <div key={index} className="rounded-lg border border-border/50 overflow-hidden">
                {/* Case header */}
                <div className="px-3 py-2 bg-muted/30 border-b border-border/30 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-foreground">Example {index + 1}</span>
                </div>

                <div className="p-3 space-y-3">
                  {/* Input */}
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Terminal className="h-3 w-3" />
                      Input
                    </div>
                    <pre className="bg-muted/30 border border-border/30 p-2.5 rounded-md text-[12px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                      {testCase.input}
                    </pre>
                  </div>

                  {/* Output */}
                  <div>
                    <div className="text-[11px] font-semibold text-primary mb-1 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      Expected Output
                    </div>
                    <pre className="bg-primary/5 border border-primary/10 p-2.5 rounded-md text-[12px] font-mono text-primary font-medium overflow-x-auto whitespace-pre-wrap">
                      {testCase.output}
                    </pre>
                  </div>

                  {/* Explanation */}
                  {testCase.explanation && (
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-l-2 border-border pl-3 py-0.5">
                      {testCase.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {question.testCases.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-3">
                <ShieldAlert className="h-8 w-8" />
                <p className="text-xs font-medium">No public examples available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};