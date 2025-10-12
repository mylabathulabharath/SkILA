import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, TestTube } from "lucide-react";

interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  testCases: TestCase[];
  constraints?: string[];
}

interface QuestionPanelProps {
  question: Question;
} 

export const QuestionPanel = ({ question }: QuestionPanelProps) => {
  if (!question) {
    return (
      <Card className="h-full shadow-card flex items-center justify-center">
        <span className="text-muted-foreground">No question data available.</span>
      </Card>
    );
  }
  console.log("Question Data:", question);
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '1': return 'bg-green-100 text-green-800 border-green-200';
      case '2': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '3': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="h-full shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl font-bold text-foreground">{question.title}</CardTitle>
          <Badge className={getDifficultyColor(question.difficulty)}>
            {question.difficulty}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100%-80px)]">
        <Tabs defaultValue="problem" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="problem" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Problem
            </TabsTrigger>
            <TabsTrigger value="testcases" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Cases
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="problem" className="h-[calc(100%-48px)] overflow-y-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Problem Statement</h3>
              <div className="prose prose-sm max-w-none">
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line"     dangerouslySetInnerHTML={{ __html: question.problem_statement.replace(/\n/g, "<br/>") }}
            />

              </div>
            </div>
            
            {question.constraints && question.constraints.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Constraints</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {question.constraints.map((constraint, index) => (
                    <li key={index} className="font-mono text-sm">{constraint}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="testcases" className="h-[calc(100%-48px)] overflow-y-auto space-y-4">
            {question.testCases.slice(0, 3).map((testCase, index) => (
              <Card key={index} className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Example {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Input:</h4>
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground overflow-x-auto">
                      {testCase.input}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Output:</h4>
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground overflow-x-auto">
                      {testCase.output}
                    </pre>
                  </div>
                  {testCase.explanation && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">Explanation:</h4>
                      <p className="text-sm text-muted-foreground">{testCase.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};