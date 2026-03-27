import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Send, Loader2, CheckCircle2, XCircle, Clock, MemoryStick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Editor from "@monaco-editor/react";

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime?: number;
  memoryUsed?: number;
}

interface CodeEditorProps {
  onRunCode: (code: string, language: string) => Promise<TestResult[]>;
  onSubmitCode: (code: string, language: string) => Promise<void>;
  isSubmitted: boolean;
  initialCode?: string;
}

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++", id: 54 },
  { value: "c", label: "C", id: 50 },
  { value: "python", label: "Python", id: 71 },
  { value: "java", label: "Java", id: 62 },
  { value: "javascript", label: "JavaScript", id: 63 },
];

const DEFAULT_CODE_TEMPLATES: Record<string, string> = {
  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    return 0;
}`,
  python: `def solution():
    # Your code here
    pass

if __name__ == "__main__":
    solution()`,
  java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
  javascript: `function solution() {
    // Your code here
}

solution();`
};

export const CodeEditor = ({ onRunCode, onSubmitCode, isSubmitted, initialCode }: CodeEditorProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState(initialCode || DEFAULT_CODE_TEMPLATES.python);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'output'>('results');
  const editorRef = useRef<any>(null);
  const { toast } = useToast();

  // Auto-save code to localStorage
  useEffect(() => {
    const key = `code_${selectedLanguage}`;
    const savedCode = localStorage.getItem(key);
    if (savedCode && !initialCode) {
      setCode(savedCode);
    }
  }, [selectedLanguage, initialCode]);

  useEffect(() => {
    const key = `code_${selectedLanguage}`;
    localStorage.setItem(key, code);
  }, [code, selectedLanguage]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (!initialCode) {
      setCode(DEFAULT_CODE_TEMPLATES[language] || '');
    }
    setTestResults([]);
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast({ title: "Error", description: "Please write some code before running.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setIsQueued(true);
    try {
      const results = await onRunCode(code, selectedLanguage);
      setTestResults(results);
      if (results.length > 0) {
        const passedCount = results.filter(r => r.passed).length;
        toast({
          title: `${passedCount}/${results.length} Passed`,
          description: passedCount === results.length ? "All test cases passed!" : "Some test cases failed.",
          variant: passedCount === results.length ? "default" : "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Execution Error", description: "Failed to execute code.", variant: "destructive" });
    } finally {
      setIsRunning(false);
      setIsQueued(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast({ title: "Error", description: "Please write some code before submitting.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setIsQueued(true);
    try {
      await onSubmitCode(code, selectedLanguage);
    } catch (error) {
      toast({ title: "Submission Error", description: "Failed to submit code.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsQueued(false);
    }
  };

  const passedCount = testResults.filter(r => r.passed).length;
  const hasResults = testResults.length > 0;

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20 flex-shrink-0">
        <span className="text-xs font-semibold text-foreground">Code Editor</span>
        <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={isSubmitted}>
          <SelectTrigger className="w-28 h-7 text-xs border-border/50 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.value} value={lang.value} className="text-xs">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor — fills available space */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selectedLanguage === "cpp" ? "cpp" : selectedLanguage}
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.focus();
          }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            renderWhitespace: "selection",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            readOnly: isSubmitted,
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: false,
            folding: true,
            matchBrackets: "always",
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 8, bottom: 8 },
            lineHeight: 20,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
          }}
        />
      </div>

      {/* Test Results Panel (collapsible) */}
      {hasResults && (
        <div className="border-t border-border/50 max-h-[200px] overflow-y-auto bg-muted/10 flex-shrink-0 scrollbar-thin">
          <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-foreground">Test Results</span>
              <Badge variant={passedCount === testResults.length ? "default" : "destructive"} className="text-[10px] h-5 px-1.5">
                {passedCount}/{testResults.length}
              </Badge>
            </div>
            <button onClick={() => setTestResults([])} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="divide-y divide-border/20">
            {testResults.map((result, index) => (
              <div key={index} className="px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {result.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className="text-[11px] font-semibold text-foreground">Case {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {result.executionTime !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {result.executionTime}ms
                      </span>
                    )}
                    {result.memoryUsed !== undefined && (
                      <span>{(result.memoryUsed / 1024).toFixed(1)}MB</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground/60 text-[10px] block mb-0.5">Input</span>
                    <pre className="bg-muted/30 rounded px-2 py-1 font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80">{result.input}</pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground/60 text-[10px] block mb-0.5">Expected</span>
                    <pre className="bg-muted/30 rounded px-2 py-1 font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80">{result.expectedOutput}</pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground/60 text-[10px] block mb-0.5">Output</span>
                    <pre className={`rounded px-2 py-1 font-mono overflow-x-auto whitespace-pre-wrap ${result.passed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>{result.actualOutput}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/50 bg-muted/20 flex-shrink-0">
        <Button
          onClick={handleRunCode}
          disabled={isRunning || isSubmitted || isQueued}
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold gap-1.5 px-4"
        >
          {isRunning ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running...</>
          ) : (
            <><Play className="h-3.5 w-3.5" /> Run Code</>
          )}
        </Button>
        <Button
          onClick={handleSubmitCode}
          disabled={isSubmitting || isSubmitted || isQueued}
          size="sm"
          className="h-8 text-xs font-semibold gap-1.5 px-5 bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
          ) : (
            <><Send className="h-3.5 w-3.5" /> Submit</>
          )}
        </Button>
        {hasResults && (
          <span className={`ml-auto text-[11px] font-semibold ${passedCount === testResults.length ? 'text-emerald-500' : 'text-red-500'}`}>
            {passedCount}/{testResults.length} passed
          </span>
        )}
      </div>
    </div>
  );
};