import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { QuestionPanel } from "@/components/exam/QuestionPanel";
import { CodeEditor } from "@/components/exam/CodeEditor";
import { PerformanceMonitor } from "@/components/exam/PerformanceMonitor";
import { Judge0Service } from "@/services/judge0";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, RefreshCcw, Shield, Wifi, WifiOff, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Session Recovery Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SessionRecoveryProps {
  error: string;
  errorCode: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onGoBack: () => void;
  isRetrying: boolean;
  examTitle?: string;
  attemptData?: any;
}

const SessionRecoveryScreen = ({
  error,
  errorCode,
  retryCount,
  maxRetries,
  onRetry,
  onGoBack,
  isRetrying,
  examTitle,
  attemptData,
}: SessionRecoveryProps) => {
  const canRetry = retryCount < maxRetries;
  const isAlreadySubmitted = errorCode === 'ALREADY_SUBMITTED';
  const isExpired = errorCode === 'ATTEMPT_EXPIRED';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        {/* Status Card */}
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${isAlreadySubmitted
            ? 'bg-emerald-500/10 border-2 border-emerald-500/20'
            : isExpired
              ? 'bg-amber-500/10 border-2 border-amber-500/20'
              : 'bg-red-500/10 border-2 border-red-500/20'
            }`}>
            {isAlreadySubmitted ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            ) : isExpired ? (
              <Clock className="h-10 w-10 text-amber-500" />
            ) : (
              <WifiOff className="h-10 w-10 text-red-500" />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">
              {isAlreadySubmitted
                ? 'Exam Already Submitted'
                : isExpired
                  ? 'Session Expired'
                  : 'Connection Issue'}
            </h1>
            {examTitle && (
              <p className="text-muted-foreground text-sm font-medium">{examTitle}</p>
            )}
          </div>

          {/* Message */}
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
            {isAlreadySubmitted ? (
              <>You have already completed this exam.
                {attemptData?.score !== undefined && (
                  <span className="block mt-2 text-lg font-bold text-foreground">
                    Score: {attemptData.score}/{attemptData.max_score}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({attemptData.max_score > 0 ? Math.round((attemptData.score / attemptData.max_score) * 100) : 0}%)
                    </span>
                  </span>
                )}
              </>
            ) : isExpired ? (
              <>Your exam session has timed out and has been automatically submitted. The timer continued even while you were away.</>
            ) : (
              <>{error || 'Unable to connect to the exam server. This could be due to a network issue or server maintenance.'}</>
            )}
          </p>

          {/* Retry Progress */}
          {!isAlreadySubmitted && !isExpired && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: maxRetries }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full transition-all duration-500 ${i < retryCount
                      ? 'bg-red-400'
                      : i === retryCount
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-muted'
                      }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">
                Attempt {retryCount + 1} of {maxRetries}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {canRetry && !isAlreadySubmitted && !isExpired && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry Connection
                </>
              )}
            </Button>
          )}
          <Button
            onClick={onGoBack}
            variant="outline"
            className="w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-widest"
          >
            Return to Dashboard
          </Button>
        </div>

        {/* System Info */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
          <Shield className="h-3 w-3" />
          SkILA Secure Exam Engine v3.0
        </div>
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Loading Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ExamLoadingScreen = ({ message, isResume }: { message: string; isResume: boolean }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="text-center space-y-8">
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-3 rounded-full bg-primary/5 flex items-center justify-center">
          {isResume ? (
            <RefreshCcw className="h-6 w-6 text-primary animate-pulse" />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black tracking-tight text-foreground">
          {isResume ? 'Resuming Session' : 'Initializing Exam'}
        </h2>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
        <Shield className="h-3 w-3" />
        Secure Connection Active
      </div>
    </div>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Exam Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MAX_RETRIES = 3;

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to exam server...');
  const [isResuming, setIsResuming] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'processing'>('idle');
  const [judge0Available, setJudge0Available] = useState<boolean | null>(null);

  // Session recovery state
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionErrorCode, setSessionErrorCode] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [attemptData, setAttemptData] = useState<any>(null);

  // Network health monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You're back online. Your session is safe.",
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // ─── Start or Resume Attempt ─────────────────────
  const initExamSession = useCallback(async () => {
    if (!examId) {
      navigate('/dashboard');
      return;
    }
  const initExamSession = useCallback(async () => {
    if (!examId) {
      navigate('/dashboard');
      return;
    }

    try {
      setLoadingMessage('Authenticating Account...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      let attemptPayload = null;
      let wasResumed = false;

      // 1. Fetch test metadata first
      setLoadingMessage('Fetching assessment data...');
      const { data: testData, error: testError } = await supabase
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

      if (testError || !testData) {
        throw { message: 'Test metadata not found. Please contact support.', code: 'NOT_FOUND' };
      }
      setTest(testData);

      setLoadingMessage('Initializing assessment engine...');

      try {
        // Attempt Edge Function Invocation (Production Protocol)
        const { data, error } = await supabase.functions.invoke('start-attempt', {
          body: { test_id: examId }
        });

        if (error) throw error;

        if (!data.success) {
          if (data.error_code === 'ALREADY_SUBMITTED') {
            setAttemptData(data.data);
            setSessionError(data.message);
            setSessionErrorCode('ALREADY_SUBMITTED');
            setLoading(false);
            return;
          }
          if (data.error_code === 'ATTEMPT_EXPIRED') {
            setAttemptData(data.data);
            setSessionError(data.message);
            setSessionErrorCode('ATTEMPT_EXPIRED');
            setLoading(false);
            return;
          }
          throw { message: data.message || 'Engine error', code: data.error_code };
        }

        attemptPayload = data.data;
        wasResumed = data.resumed === true;
      } catch (invokeError) {
        console.warn('Edge engine unreachable, initiating database fallback...', invokeError);
        
        // 2. Database Fallback (Development/Localhost Protocol)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Security handshake failed.");

        const { data: existing } = await supabase
          .from('attempts')
          .select('*')
          .eq('test_id', examId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          attemptPayload = existing;
          wasResumed = true;
        } else {
          // Verify submission limits
          const { data: submitted } = await supabase
            .from('attempts')
            .select('*')
            .eq('test_id', examId)
            .eq('user_id', user.id)
            .in('status', ['submitted', 'auto_submitted'])
            .maybeSingle();

          if (submitted) {
            setAttemptData(submitted);
            setSessionError("Assessment protocol already finalized for this session.");
            setSessionErrorCode('ALREADY_SUBMITTED');
            setLoading(false);
            return;
          }

          const now = new Date();
          const durationMins = testData.time_limit_minutes || 60;
          const endsAt = new Date(now.getTime() + durationMins * 60 * 1000);

          const { data: newAttempt, error: createError } = await supabase
            .from('attempts')
            .insert({
              test_id: examId,
              user_id: user.id,
              status: 'active',
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
              score: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          attemptPayload = newAttempt;
        }
      }

      // 3. Finalize Initialization
      if (wasResumed) {
        setIsResuming(true);
        setLoadingMessage('Restoring session state...');
        toast({
          title: "Session Resumed",
          description: "Assessment state restored to last known sync point.",
        });
      } else {
        setLoadingMessage('Priming validation environment...');
      }

      setAttempt(attemptPayload);

      if (testData.test_questions) {
        const sortedQuestions = testData.test_questions
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((tq: any) => tq.questions);
        setQuestions(sortedQuestions);
      }

      setSessionError(null);
      setSessionErrorCode('');

    } catch (err: any) {
      console.error('Critical initialization failure:', err);
      setSessionError(err.message || 'Engine failed to initialize.');
      setSessionErrorCode(err.code || 'UNKNOWN');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [examId, navigate, toast]);

  useEffect(() => {
    initExamSession();
  }, [initExamSession]);

  // ─── Retry Handler ───────────────────────────────
  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) return;
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setSessionError(null);
    setSessionErrorCode('');

    // Small delay to show the loading state
    await new Promise(r => setTimeout(r, 1000));
    await initExamSession();
  }, [retryCount, initExamSession]);

  // ─── Judge0 Connection Test ──────────────────────
  useEffect(() => {
    const testJudge0 = async () => {
      const isAvailable = await Judge0Service.testConnection();
      setJudge0Available(isAvailable);
      if (!isAvailable) {
        toast({
          title: "Code Execution Server",
          description: "Cannot reach code execution server. Check your network.",
          variant: "destructive",
        });
      }
    };
    testJudge0();
  }, [toast]);

  // ─── Fetch test cases ────────────────────────────
  const currentQuestion = questions[currentQuestionIndex];
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

  // ─── Run Code ────────────────────────────────────
  const handleRunCode = async (code: string, language: string) => {
    if (!questions[currentQuestionIndex]) throw new Error('No active question');
    if (!language || !code) throw new Error('Missing required fields');

    try {
      setSubmissionStatus('processing');
      const testCasesForJudge0 = testCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output
      }));
      const results = await Judge0Service.executeCode(code, language, testCasesForJudge0);
      setSubmissionStatus('idle');
      return results;
    } catch (error) {
      setSubmissionStatus('idle');
      throw error;
    }
  };

  // ─── Submit Code ─────────────────────────────────
  const handleSubmitCode = async (code: string, language: string) => {
    if (!questions[currentQuestionIndex]) throw new Error('No active question');
    if (!language || !code) throw new Error('Missing required fields');
    if (!attempt) throw new Error('No active attempt');

    try {
      setSubmissionStatus('processing');

      // Try edge function first
      try {
        const requestBody = {
          attempt_id: attempt.id,
          question_id: questions[currentQuestionIndex].id,
          language,
          code,
          run_type: 'submit'
        };

        const { data, error } = await supabase.functions.invoke('run-code', {
          body: requestBody
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.message || 'Function returned error');

        setSubmissionStatus('idle');
        const passedCount = data.data.passed_count || 0;
        const totalCount = data.data.total_count || 0;
        const verdict = data.data.verdict || 'failed';

        toast({
          title: verdict === 'passed' ? "All Tests Passed!" : "Submission Recorded",
          description: `${passedCount}/${totalCount} test cases passed.`,
          variant: verdict === 'passed' ? 'default' : 'destructive'
        });

        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }

        window.dispatchEvent(new CustomEvent('examSubmitted', {
          detail: { testId: test?.id, score: data.data.score || 0, maxScore: data.data.max_score || 100 }
        }));

        return;
      } catch (functionError) {
        // Fallback: Direct Judge0
        const testCasesForJudge0 = testCases.map(tc => ({
          input: tc.input,
          expected_output: tc.expected_output
        }));

        const results = await Judge0Service.executeCode(code, language, testCasesForJudge0);
        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;
        const verdict = passedCount === totalCount ? 'passed' : 'failed';

        const { data: testQuestion } = await supabase
          .from('test_questions')
          .select('points')
          .eq('test_id', attempt.test_id)
          .eq('question_id', questions[currentQuestionIndex].id)
          .single();

        const questionPoints = testQuestion?.points || 100;
        const scorePercentage = totalCount > 0 ? passedCount / totalCount : 0;
        const questionScore = Math.round(questionPoints * scorePercentage);

        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .insert({
            attempt_id: attempt.id,
            question_id: questions[currentQuestionIndex].id,
            language, code,
            run_type: 'submit',
            passed_count: passedCount,
            total_count: totalCount,
            verdict,
            time_ms: results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length,
            memory_kb: results.reduce((sum, r) => sum + (r.memoryUsed || 0), 0) / results.length,
            stdout_preview: results[0]?.actualOutput?.slice(0, 500) || ''
          })
          .select()
          .single();

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
          await supabase.from('submission_case_results').insert(caseResults);
        }

        // Update attempt score
        try {
          const { data: currentAttempt } = await supabase
            .from('attempts')
            .select('score')
            .eq('id', attempt.id)
            .single();

          const { data: previousSubmissions } = await supabase
            .from('submissions')
            .select('passed_count, total_count')
            .eq('attempt_id', attempt.id)
            .eq('question_id', questions[currentQuestionIndex].id)
            .eq('run_type', 'submit')
            .order('created_at', { ascending: false });

          let bestScore = 0;
          if (previousSubmissions && previousSubmissions.length > 0) {
            bestScore = Math.max(...previousSubmissions.map(sub => {
              const pct = sub.total_count > 0 ? sub.passed_count / sub.total_count : 0;
              return Math.round(questionPoints * pct);
            }));
          }

          if (questionScore > bestScore) {
            const newTotalScore = (currentAttempt?.score || 0) - bestScore + questionScore;
            await supabase.from('attempts').update({ score: newTotalScore }).eq('id', attempt.id);
          }
        } catch (scoreError) {
          console.error('Error updating attempt score:', scoreError);
        }

        setSubmissionStatus('idle');
        toast({
          title: verdict === 'passed' ? "All Tests Passed!" : "Submission Recorded",
          description: `${passedCount}/${totalCount} test cases passed.`,
          variant: verdict === 'passed' ? 'default' : 'destructive'
        });

        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }

        window.dispatchEvent(new CustomEvent('examSubmitted', {
          detail: { testId: test?.id, score: questionScore, maxScore: questionPoints }
        }));
      }
    } catch (error) {
      setSubmissionStatus('idle');
      throw error;
    }
  };

  // ─── Submit Exam ─────────────────────────────────
  const handleSubmitExam = async () => {
    if (!attempt) {
      toast({ title: "Error", description: "No active attempt found", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitted(true);

      if (!attempt.id) throw new Error('Invalid attempt data');

      // Try edge function first
      try {
        const { data, error } = await supabase.functions.invoke('finalize-attempt', {
          body: { attempt_id: attempt.id }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.message || 'Function returned error');

        toast({
          title: "Exam Submitted Successfully!",
          description: `Your score: ${data.data.score}/${data.data.max_score} (${Math.round((data.data.score / data.data.max_score) * 100)}%)`,
        });

        window.dispatchEvent(new CustomEvent('examSubmitted', {
          detail: { testId: test?.id, score: data.data.score, maxScore: data.data.max_score }
        }));

        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      } catch (functionError) {
        // Manual fallback finalization
        const now = new Date();
        const endsAt = new Date(attempt.ends_at);
        const status = now >= endsAt ? 'auto_submitted' : 'submitted';

        const { data: submissions } = await supabase
          .from('submissions')
          .select('question_id, verdict, passed_count, total_count')
          .eq('attempt_id', attempt.id)
          .eq('run_type', 'submit');

        let finalScore = 0;
        const questionScores = new Map();

        for (const submission of submissions || []) {
          const { data: testQuestion } = await supabase
            .from('test_questions')
            .select('points')
            .eq('test_id', attempt.test_id)
            .eq('question_id', submission.question_id)
            .single();

          const points = testQuestion?.points || 100;
          const pct = submission.total_count > 0 ? submission.passed_count / submission.total_count : 0;
          const questionScore = Math.round(points * pct);

          if (!questionScores.has(submission.question_id)) questionScores.set(submission.question_id, 0);
          if (questionScore > questionScores.get(submission.question_id)) {
            questionScores.set(submission.question_id, questionScore);
          }
        }

        finalScore = Array.from(questionScores.values()).reduce((sum, s) => sum + s, 0);

        const { data: testQuestions } = await supabase
          .from('test_questions')
          .select('points')
          .eq('test_id', attempt.test_id);

        const maxScore = testQuestions?.reduce((sum, q) => sum + (q.points || 100), 0) || 100;

        await supabase.from('attempts').update({
          status,
          submitted_at: now.toISOString(),
          score: finalScore,
          max_score: maxScore
        }).eq('id', attempt.id);

        toast({
          title: "Exam Submitted Successfully!",
          description: `Your score: ${finalScore}/${maxScore} (${Math.round((finalScore / maxScore) * 100)}%)`,
        });

        window.dispatchEvent(new CustomEvent('examSubmitted', {
          detail: { testId: test?.id, score: finalScore, maxScore: maxScore }
        }));

        setTimeout(() => navigate('/dashboard'), 3000);
      }
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER STATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Loading
  if (loading) {
    return <ExamLoadingScreen message={loadingMessage} isResume={isResuming} />;
  }

  // Session error (with retry UI)
  if (sessionError) {
    return (
      <SessionRecoveryScreen
        error={sessionError}
        errorCode={sessionErrorCode}
        retryCount={retryCount}
        maxRetries={MAX_RETRIES}
        onRetry={handleRetry}
        onGoBack={() => navigate('/dashboard')}
        isRetrying={isRetrying}
        examTitle={test?.name}
        attemptData={attemptData}
      />
    );
  }

  // No test/questions loaded
  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/20 border border-white/5 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Test Not Found</h2>
            <p className="text-muted-foreground text-sm">The requested test could not be loaded or doesn't contain any questions.</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} className="rounded-xl px-8 h-12 font-bold">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Exam View ──────────────────────────────
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

      {/* Processing indicator */}
      {submissionStatus === 'processing' && (
        <div className="fixed top-20 right-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-xl z-50 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="text-sm font-bold text-foreground">Processing Code</p>
              <p className="text-xs text-muted-foreground">Executing test cases...</p>
            </div>
          </div>
        </div>
      )}

      {/* Network status indicator */}
      {!isOnline && (
        <div className="fixed top-20 left-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 shadow-xl z-50 backdrop-blur-xl max-w-sm">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-red-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-500">Offline</p>
              <p className="text-xs text-muted-foreground">Your progress is saved. Reconnect to submit.</p>
            </div>
          </div>
        </div>
      )}

      {/* Judge0 status */}
      {judge0Available === false && (
        <div className="fixed top-20 left-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 shadow-xl z-50 backdrop-blur-xl max-w-sm">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-500">Code Server Unavailable</p>
              <p className="text-xs text-muted-foreground">Cannot connect to Judge0</p>
            </div>
          </div>
        </div>
      )}

      <main className="px-2 py-2 h-[calc(100vh-48px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
          <div className="h-full min-h-0">
            <QuestionPanel
              question={{
                ...currentQuestion,
                testCases: testCases
              }}
            />
          </div>
          <div className="h-full min-h-0">
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


      <PerformanceMonitor />
    </div>
  );
};

export default Exam;