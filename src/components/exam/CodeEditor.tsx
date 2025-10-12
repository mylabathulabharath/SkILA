import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Send, Loader2, Download, Upload } from "lucide-react";
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

const DEFAULT_CODE_TEMPLATES = {
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
      setCode(DEFAULT_CODE_TEMPLATES[language as keyof typeof DEFAULT_CODE_TEMPLATES]);
    }
    setTestResults([]);
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please write some code before running.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setIsQueued(true);
    try {
      const results = await onRunCode(code, selectedLanguage);
      setTestResults(results);
      
      // If we get results immediately, it means it was processed without queue
      if (results.length > 0) {
        const passedCount = results.filter(r => r.passed).length;
        toast({
          title: "Code Executed",
          description: `${passedCount}/${results.length} test cases passed`,
          variant: passedCount === results.length ? "default" : "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Failed to execute code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setIsQueued(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please write some code before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsQueued(true);
    try {
      await onSubmitCode(code, selectedLanguage);
      // Success toast will be shown by the parent component
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsQueued(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Code Editor */}
      <Card className="flex-1 shadow-card" style={{ flex: "none", height: "420px" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Code Editor</h3>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={isSubmitted}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col h-[calc(100%-80px)]">
          <div className="flex-1 border border-border rounded-lg overflow-hidden">
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
                fontSize: 14,
                lineNumbers: "on",
                renderWhitespace: "selection",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                readOnly: isSubmitted,
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: false,
                folding: true,
                matchBrackets: "always",
                autoIndent: "full",
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitted || isQueued}
              className="flex items-center gap-2"
              variant="outline"
            >
              {isQueued ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queued...
                </>
              ) : isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Code
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmitCode}
              disabled={isSubmitting || isSubmitted || isQueued}
              className="flex items-center gap-2"
            >
              {isQueued ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queued...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-foreground">Test Results</h3>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Test Case {index + 1}</span>
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-foreground mb-1">Input:</p>
                      <pre className="bg-muted p-2 rounded text-muted-foreground overflow-x-auto">
                        {result.input}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Expected:</p>
                      <pre className="bg-muted p-2 rounded text-muted-foreground overflow-x-auto">
                        {result.expectedOutput}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Your Output:</p>
                      <pre className={`p-2 rounded overflow-x-auto ${
                        result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {result.actualOutput}
                      </pre>
                    </div>
                  </div>
                  {(result.executionTime || result.memoryUsed) && (
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      {result.executionTime && <span>Time: {result.executionTime}ms</span>}
                      {result.memoryUsed && <span>Memory: {result.memoryUsed}KB</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};