import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface McqQuestion {
  id: string;
  question_text: string;
  marks: number;
  negative_marks: number;
  explanation?: string;
  options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }>;
}

interface McqTest {
  id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
}

const McqTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<McqTest | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, string>>({}); // question_id -> option_id
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);

  // Load test and start attempt
  useEffect(() => {
    if (!testId) {
      navigate('/mcq');
      return;
    }

    const loadTest = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        // Load test details
        const { data: testData, error: testError } = await supabase
          .from('mcq_tests')
          .select('*')
          .eq('id', testId)
          .single();

        if (testError) throw testError;
        setTest(testData);

        // Load questions with options
        const { data: testQuestions, error: questionsError } = await supabase
          .from('mcq_test_questions')
          .select(`
            question_id,
            marks_override,
            order_index,
            questions:mcq_questions (
              id,
              question_text,
              marks,
              negative_marks,
              explanation,
              options:mcq_options (
                id,
                option_text,
                is_correct,
                order_index
              )
            )
          `)
          .eq('test_id', testId)
          .order('order_index');

        if (questionsError) throw questionsError;

        const formattedQuestions: McqQuestion[] = (testQuestions || []).map((tq: any) => ({
          id: tq.questions.id,
          question_text: tq.questions.question_text,
          marks: tq.marks_override || tq.questions.marks,
          negative_marks: tq.questions.negative_marks,
          explanation: tq.questions.explanation,
          options: (tq.questions.options || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }));

        setQuestions(formattedQuestions);

        // Check for existing attempts
        const { data: { user } } = await supabase.auth.getUser();

        const { data: allAttempts, error: attemptsError } = await supabase
          .from('mcq_attempts')
          .select('*')
          .eq('test_id', testId)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (attemptsError && attemptsError.code !== 'PGRST116') throw attemptsError;

        if (allAttempts && allAttempts.length > 0) {
          const existingAttempt = allAttempts[0];

          if (existingAttempt.status === 'submitted' || existingAttempt.status === 'auto_submitted') {
            setAttempt(existingAttempt);
            setResults({
              score: existingAttempt.score || 0,
              maxScore: existingAttempt.max_score || formattedQuestions.reduce((sum, q) => sum + q.marks, 0),
              correctCount: existingAttempt.correct_answers || 0,
              incorrectCount: existingAttempt.incorrect_answers || 0,
              totalQuestions: formattedQuestions.length,
              unanswered: formattedQuestions.length - (existingAttempt.correct_answers || 0) - (existingAttempt.incorrect_answers || 0)
            });

            const { data: existingResponses } = await supabase
              .from('mcq_responses')
              .select('question_id, selected_option_ids')
              .eq('attempt_id', existingAttempt.id);

            const responseMap: Record<string, string> = {};
            existingResponses?.forEach((r: any) => {
              if (r.selected_option_ids && r.selected_option_ids.length > 0) {
                responseMap[r.question_id] = r.selected_option_ids[0];
              }
            });
            setResponses(responseMap);
            setIsSubmitted(true);
          } else {
            // RESUME ACTIVE ATTEMPT
            setAttempt(existingAttempt);

            // Set resuming question index
            if (existingAttempt.last_question_index) {
              setCurrentQuestionIndex(Math.min(existingAttempt.last_question_index, formattedQuestions.length - 1));
            }

            const { data: existingResponses } = await supabase
              .from('mcq_responses')
              .select('question_id, selected_option_ids')
              .eq('attempt_id', existingAttempt.id);

            const responseMap: Record<string, string> = {};
            existingResponses?.forEach((r: any) => {
              if (r.selected_option_ids && r.selected_option_ids.length > 0) {
                responseMap[r.question_id] = r.selected_option_ids[0];
              }
            });
            setResponses(responseMap);

            toast({
              title: "Test Resumed",
              description: "Continuing from where you left off.",
            });
          }
        } else {
          // No attempt exists - create new one
          const now = new Date();
          const endsAt = new Date(now.getTime() + (testData.duration_minutes * 60 * 1000));

          const { data: newAttempt, error: attemptError } = await supabase
            .from('mcq_attempts')
            .insert({
              test_id: testId,
              user_id: user?.id,
              status: 'active',
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
              total_questions: formattedQuestions.length,
              max_score: formattedQuestions.reduce((sum, q) => sum + q.marks, 0)
            })
            .select()
            .single();

          if (attemptError) throw attemptError;
          setAttempt(newAttempt);
        }

      } catch (error: any) {
        console.error('Error loading test:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load test",
          variant: "destructive",
        });
        navigate('/mcq');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId, navigate, toast]);

  // Prevent accidental close/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attempt && attempt.status === 'active' && !isSubmitted) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to show confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt, isSubmitted]);

  // Save current question index as student navigates
  useEffect(() => {
    if (attempt && attempt.status === 'active' && !isSubmitted) {
      const saveProgress = async () => {
        try {
          await supabase
            .from('mcq_attempts')
            .update({ last_question_index: currentQuestionIndex })
            .eq('id', attempt.id);
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
      };
      saveProgress();
    }
  }, [currentQuestionIndex]);

  // Timer logic... (keep existing)
  useEffect(() => {
    if (!attempt || isSubmitted) return;

    const updateTimer = () => {
      if (attempt.ends_at) {
        const endTime = new Date(attempt.ends_at).getTime();
        const now = new Date().getTime();
        const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(secondsLeft);

        if (secondsLeft === 0) {
          handleSubmitTest(true); // Auto-submit
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt, isSubmitted]);

  const handleAnswerChange = async (questionId: string, optionId: string) => {
    if (isSubmitted) return;

    // Update local state first for responsiveness
    setResponses(prev => ({
      ...prev,
      [questionId]: optionId
    }));

    // Save response to database immediately (Robust sync)
    if (attempt) {
      try {
        const { error } = await supabase
          .from('mcq_responses')
          .upsert({
            attempt_id: attempt.id,
            question_id: questionId,
            selected_option_ids: [optionId],
            time_spent_seconds: 0
          }, {
            onConflict: 'attempt_id,question_id'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving response:', error);
        // Fallback or retry logic can be added here
      }
    }
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!attempt || isSubmitted) return;

    try {
      setIsSubmitted(true);

      // Final calculation of scores
      const { data: allResponses } = await supabase
        .from('mcq_responses')
        .select('*')
        .eq('attempt_id', attempt.id);

      let totalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;

      for (const response of allResponses || []) {
        // Find the question in our local State
        const question = questions.find(q => q.id === response.question_id);
        if (!question) continue;

        const selectedId = response.selected_option_ids?.[0];
        const correctOption = question.options.find(o => o.is_correct);

        const isCorrect = selectedId === correctOption?.id;

        if (isCorrect) {
          totalScore += question.marks;
          correctCount++;
        } else if (selectedId) {
          totalScore -= question.negative_marks;
          incorrectCount++;
        }

        // Update response one last time
        await supabase
          .from('mcq_responses')
          .update({
            is_correct: isCorrect,
            marks_awarded: isCorrect ? question.marks : -question.negative_marks
          })
          .eq('id', response.id);
      }

      totalScore = Math.max(0, totalScore);

      // Final update of attempt
      const { data: updatedAttempt } = await supabase
        .from('mcq_attempts')
        .update({
          status: autoSubmit ? 'auto_submitted' : 'submitted',
          submitted_at: new Date().toISOString(),
          score: totalScore,
          correct_answers: correctCount,
          incorrect_answers: incorrectCount
        })
        .eq('id', attempt.id)
        .select()
        .single();

      setResults({
        score: totalScore,
        maxScore: attempt.max_score,
        correctCount,
        incorrectCount,
        totalQuestions: questions.length,
        unanswered: questions.length - correctCount - incorrectCount
      });

      toast({
        title: autoSubmit ? "Time's Up!" : "Test Completed",
        description: `Your final score: ${totalScore}/${attempt.max_score}`,
      });

    } catch (error: any) {
      console.error('Critical error submitting test:', error);
      toast({
        title: "Submission Error",
        description: "Your responses are safe, but we couldn't finalize the test. Please check your connection.",
        variant: "destructive",
      });
      setIsSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;

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
          <Button onClick={() => navigate('/mcq')}>Back to MCQ Dashboard</Button>
        </div>
      </div>
    );
  }

  // Results view - show if test was already submitted or just completed
  if (results && isSubmitted) {
    return (
      <div className="min-h-screen bg-subtle-gradient">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-card-gradient shadow-card max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Test Results</CardTitle>
                {attempt?.status === 'submitted' || attempt?.status === 'auto_submitted' ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Already Completed
                  </Badge>
                ) : null}
              </div>
              {attempt?.status === 'submitted' || attempt?.status === 'auto_submitted' ? (
                <p className="text-muted-foreground mt-2">
                  You have already taken this test. Here are your results.
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-primary mb-2">
                  {results.score}/{results.maxScore}
                </div>
                <div className="text-xl text-muted-foreground">
                  {Math.round((results.score / results.maxScore) * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.correctCount}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.incorrectCount}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{results.unanswered}</div>
                  <div className="text-sm text-muted-foreground">Unanswered</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Question Review</h3>
                {questions.map((question, index) => {
                  const response = responses[question.id];
                  const selectedOption = question.options.find(opt => opt.id === response);
                  const isCorrect = selectedOption?.is_correct;

                  return (
                    <Card key={question.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Q{index + 1}</span>
                            {isCorrect !== undefined && (
                              isCorrect ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Correct
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Incorrect
                                </Badge>
                              )
                            )}
                          </div>
                          <p className="text-sm">{question.question_text}</p>
                        </div>
                      </div>
                      {question.explanation && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Button
                className="w-full"
                onClick={() => navigate('/mcq')}
              >
                Back to MCQ Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{test.title}</h1>
            {isSubmitted && (
              <Badge>
                <CheckCircle className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Question Navigation */}
            {!isSubmitted && questions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Question:</span>
                <div className="flex gap-1 flex-wrap max-w-md">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${i === currentQuestionIndex
                        ? 'bg-primary text-primary-foreground'
                        : responses[q.id]
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${timeLeft <= 300 ? 'text-destructive' : 'text-foreground'
              }`}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>

            {!isSubmitted && timeLeft > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant={timeLeft <= 300 ? "destructive" : "default"}>
                    Submit Test
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Test</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit your test? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSubmitTest(false)}>
                      Submit Test
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentQuestion && (
          <Card className="bg-card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardTitle>
                <Badge variant="outline">{currentQuestion.marks} marks</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-lg">
                {currentQuestion.question_text}
              </div>

              <RadioGroup
                value={currentResponse}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                disabled={isSubmitted}
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer text-base"
                    >
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0 || isSubmitted}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1 || isSubmitted}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default McqTest;

