import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { QuestionPanel } from "@/components/exam/QuestionPanel";
import { CodeEditor } from "@/components/exam/CodeEditor";
import { PerformanceMonitor } from "@/components/exam/PerformanceMonitor";
import { Judge0Service } from "@/services/judge0";
import { supabase } from "@/integrations/supabase/client";

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
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

// Mock data - in a real app, this would come from Supabase
const mockQuestion = {
  id: "1",
  title: "Two Sum",
  difficulty: "Easy" as const,
  description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  constraints: [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists."
  ],
  testCases: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      input: "nums = [3,2,4], target = 6",
      output: "[1,2]",
      explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
    },
    {
      input: "nums = [3,3], target = 6",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 6, we return [0, 1]."
    }
  ]
};

const mockExam = {
  id: "exam-1",
  title: "Data Structures & Algorithms - Midterm",
  timeLimit: 90, // 90 minutes
  questions: [mockQuestion]
};

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testCases, setTestCases] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'processing'>('idle');
  const [judge0Available, setJudge0Available] = useState<boolean | null>(null);

  useEffect(() => {
    if (!examId) {
      navigate('/dashboard');
      return;
    }

    const startAttempt = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        // Start or resume attempt
        const { data, error } = await supabase.functions.invoke('start-attempt', {
          body: { test_id: examId }
        });

        if (error || !data.success) {
          throw new Error(data?.message || 'Failed to start attempt');
        }

        console.log('Attempt data received:', data.data);
        setAttempt(data.data);

        // Fetch test and questions
        const { data: testData } = await supabase
          .from('tests')
          .select(`
            *,
            test_questions!inner(
              points,
              order_index,
              questions!inner(*)
            )
          `)
          .eq('id', examId)
          .single();

        if (testData) {
          setTest(testData);
          const sortedQuestions = testData.test_questions
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((tq: any) => tq.questions);
          setQuestions(sortedQuestions);
        }

      } catch (error: any) {
        console.error('Error starting attempt:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to start exam",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    startAttempt();
  }, [examId, navigate, toast]);

  // Test Judge0 connection on component mount
  useEffect(() => {
    const testJudge0 = async () => {
      const isAvailable = await Judge0Service.testConnection();
      setJudge0Available(isAvailable);
      if (!isAvailable) {
        toast({
          title: "Judge0 Server Unavailable",
          description: "Cannot connect to code execution server. Please check your network or contact support.",
          variant: "destructive",
        });
      }
    };
    testJudge0();
  }, [toast]);

  // added by me
  const currentQuestion = questions[currentQuestionIndex]; // <-- Move this up
  useEffect(() => {
    const fetchTestCases = async () => {
      if (!currentQuestion?.id) {
        setTestCases([]);
        return;
      }
      const { data, error } = await supabase
        .from('question_test_cases')
        .select('input, expected_output')
        .eq('question_id', currentQuestion.id);

      if (error) {
        console.error('Error fetching test cases:', error);
        setTestCases([]);
      } else {
        setTestCases(data || []);
      }
    };

    fetchTestCases();
  }, [currentQuestion?.id]);



  const handleRunCode = async (code: string, language: string) => {
    if (!questions[currentQuestionIndex]) {
      throw new Error('No active question');
    }
    
    if (!language || !code) {
      throw new Error('Missing required fields for code execution');
    }
    
    try {
      setSubmissionStatus('processing');
      
      // Use test cases from the current question
      const testCasesForJudge0 = testCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output
      }));
      
      // Direct call to Judge0 service
      const results = await Judge0Service.executeCode(code, language, testCasesForJudge0);
      
      setSubmissionStatus('idle');
      return results;
      
    } catch (error) {
      console.error('Error running code:', error);
      setSubmissionStatus('idle');
      throw error;
    }
  };

  const handleSubmitCode = async (code: string, language: string) => {
    if (!questions[currentQuestionIndex]) {
      throw new Error('No active question');
    }

    if (!language || !code) {
      throw new Error('Missing required fields for code submission');
    }

    if (!attempt) {
      throw new Error('No active attempt');
    }

    try {
      setSubmissionStatus('processing');
      
      // First try the Supabase function
      try {
        const requestBody = {
          attempt_id: attempt.id,
          question_id: questions[currentQuestionIndex].id,
          language: language,
          code: code,
          run_type: 'submit'
        };
        
        console.log('Submitting to run-code function with:', requestBody);
        
        const { data, error } = await supabase.functions.invoke('run-code', {
          body: requestBody
        });

        if (error) {
          console.warn('Supabase function failed, falling back to direct approach:', error);
          throw error; // This will trigger the fallback
        }

        if (!data.success) {
          console.warn('Supabase function returned error, falling back:', data);
          throw new Error(data.message || 'Function returned error');
        }

        // Success with Supabase function
        setSubmissionStatus('idle');
        
        const passedCount = data.data.passed_count || 0;
        const totalCount = data.data.total_count || 0;
        const verdict = data.data.verdict || 'failed';
        
        toast({
          title: "Success",
          description: `Code submitted! ${passedCount}/${totalCount} test cases passed.`,
          variant: verdict === 'passed' ? 'default' : 'destructive'
        });

        // Move to next question if available
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }

        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('examSubmitted', { 
          detail: { 
            testId: test?.id,
            score: data.data.score || 0,
            maxScore: data.data.max_score || 100
          } 
        }));

        return; // Exit successfully

      } catch (functionError) {
        console.log('Falling back to direct Judge0 + manual storage approach');
        
        // Fallback: Use direct Judge0 service and manually store results
        const testCasesForJudge0 = testCases.map(tc => ({
          input: tc.input,
          expected_output: tc.expected_output
        }));
        
        // Execute code using optimized Judge0 service
        const results = await Judge0Service.executeCode(code, language, testCasesForJudge0);
        
        // Calculate results
        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;
        const verdict = passedCount === totalCount ? 'passed' : 'failed';
        
        // Manually store submission in database
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .insert({
            attempt_id: attempt.id,
            question_id: questions[currentQuestionIndex].id,
            language: language,
            code: code,
            run_type: 'submit',
            passed_count: passedCount,
            total_count: totalCount,
            verdict: verdict,
            time_ms: results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length,
            memory_kb: results.reduce((sum, r) => sum + (r.memoryUsed || 0), 0) / results.length,
            stdout_preview: results[0]?.actualOutput?.slice(0, 500) || ''
          })
          .select()
          .single();

        if (submissionError) {
          console.error('Error storing submission:', submissionError);
          // Continue anyway - at least the code was executed
        }

        // Store case results
        if (submissionData) {
          const caseResults = results.map((result, index) => ({
            submission_id: submissionData.id,
            input: result.input,
            expected_output: result.expectedOutput,
            actual_output: result.actualOutput,
            status: result.passed ? 'pass' : 'fail',
            case_order: index,
            time_ms: result.executionTime || 0,
            memory_kb: result.memoryUsed || 0
          }));
          
          await supabase
            .from('submission_case_results')
            .insert(caseResults);
        }

        setSubmissionStatus('idle');
        
        toast({
          title: "Success",
          description: `Code submitted! ${passedCount}/${totalCount} test cases passed.`,
          variant: verdict === 'passed' ? 'default' : 'destructive'
        });

        // Move to next question if available
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }

        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('examSubmitted', { 
          detail: { 
            testId: test?.id,
            score: passedCount,
            maxScore: totalCount
          } 
        }));
      }

    } catch (error) {
      console.error('Error submitting code:', error);
      setSubmissionStatus('idle');
      throw error;
    }
  };

  const handleSubmitExam = async () => {
    if (!attempt) {
      toast({
        title: "Error",
        description: "No active attempt found",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitted(true);

      const { data, error } = await supabase.functions.invoke('finalize-attempt', {
        body: { attempt_id: attempt.attempt_id }
      });

      if (error || !data.success) {
        throw new Error(data?.message || 'Failed to submit exam');
      }

      toast({
        title: "Exam Submitted Successfully!",
        description: `Your score: ${data.data.score}/${data.data.max_score} (${Math.round((data.data.score / data.data.max_score) * 100)}%)`,
      });

      // Trigger a custom event to refresh dashboard components
      window.dispatchEvent(new CustomEvent('examSubmitted', { 
        detail: { 
          testId: test?.id,
          score: data.data.score,
          maxScore: data.data.max_score
        } 
      }));

      // Navigate back to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
      setIsSubmitted(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Test Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested test could not be loaded.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

// ...existing code...

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader
        examTitle={test.name}
        timeLimit={test.time_limit_minutes}
        onSubmitExam={handleSubmitExam}
        isSubmitted={isSubmitted}
        endsAt={attempt?.ends_at}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        onQuestionChange={setCurrentQuestionIndex}
      />
      
      {/* Submission Status Indicator */}
      {submissionStatus === 'processing' && (
        <div className="fixed top-20 right-4 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Processing Code</p>
              <p className="text-xs text-blue-600">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* Judge0 Status Indicator */}
      {judge0Available === false && (
        <div className="fixed top-20 left-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-red-800">Code Execution Unavailable</p>
              <p className="text-xs text-red-600">Cannot connect to Judge0 server</p>
            </div>
          </div>
        </div>
      )}

      
      <main className="container mx-auto p-4 h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          <div className="h-full">
            <QuestionPanel 
              question={{
                ...currentQuestion,
                testCases: testCases // Test cases will be fetched by the run-code function
              }} 
            />
          </div>
          
          <div className="h-full">
            <CodeEditor
              key={`question-${currentQuestionIndex}`}
              onRunCode={handleRunCode}
              onSubmitCode={handleSubmitCode}
              isSubmitted={isSubmitted}
              initialCode={DEFAULT_CODE_TEMPLATES.python}
            />
          </div>
        </div>
      </main>
      
      {/* Performance Monitor */}
      <PerformanceMonitor />
    </div>
  );
};

export default Exam;