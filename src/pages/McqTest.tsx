import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Institutional Grade */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-primary/10 rounded-xl">
                <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase tracking-widest text-[10px]">MCQ Assessment</Badge>
             </div>
             <div className="h-6 w-px bg-slate-200 hidden sm:block" />
             <h1 className="text-xl font-black text-slate-800 tracking-tight">{test.title}</h1>
          </div>

          <div className="flex items-center gap-8">
            <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all duration-500 ${
              timeLeft <= 300 
              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
              : 'bg-slate-900 border-slate-800 text-white shadow-lg'
            }`}>
              <Clock className={`h-5 w-5 ${timeLeft <= 300 ? 'text-rose-500' : 'text-primary-glow'}`} />
              <span className="font-mono text-xl font-black tracking-tighter">{formatTime(timeLeft)}</span>
            </div>

            {!isSubmitted && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="btn-premium px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-primary hover:scale-105 transition-all">
                    Finish Assessment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Submit Validation?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 font-medium">
                      Ensure you have reviewed all items. Once submitted, your cognitive profile will be updated and results finalized.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="rounded-xl border-slate-200 font-bold">Review More</AlertDialogCancel>
                    <AlertDialogAction 
                       onClick={() => handleSubmitTest(false)} 
                       className="rounded-xl bg-primary hover:bg-primary-glow text-white font-black uppercase tracking-widest text-[10px] py-4"
                    >
                      Process Final Submission
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Engine */}
      <div className="flex-1 container mx-auto px-6 lg:px-12 py-10 flex flex-col lg:flex-row gap-10">
        
        {/* Left: Question Engine */}
        <main className="flex-1 max-w-4xl space-y-8 animate-reveal">
          {currentQuestion && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Validation Track</span>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Question {currentQuestionIndex + 1}</h2>
                </div>
                <div className="flex gap-3">
                   <Badge className="bg-primary/5 text-primary border-primary/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                     {currentQuestion.marks} Marks
                   </Badge>
                   {currentQuestion.negative_marks > 0 && (
                     <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        -{currentQuestion.negative_marks} Penalty
                     </Badge>
                   )}
                </div>
              </div>

              <Card className="glass-card border-none rounded-[3.5rem] shadow-premium-sm p-10 lg:p-14 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                
                <CardContent className="p-0 space-y-12 relative z-10">
                  <div className="text-2xl font-bold text-slate-800 leading-relaxed tracking-tight">
                    {currentQuestion.question_text}
                  </div>

                  <RadioGroup
                    value={currentResponse}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={isSubmitted}
                    className="grid gap-5"
                  >
                    {currentQuestion.options.map((option) => (
                      <Label
                        key={option.id}
                        htmlFor={option.id}
                        className={`flex items-center gap-6 p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer group hover:shadow-md ${
                          currentResponse === option.id
                          ? 'border-primary bg-primary/5 shadow-inner'
                          : 'border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50'
                        }`}
                      >
                        <RadioGroupItem value={option.id} id={option.id} className="h-6 w-6 border-2 border-slate-300 text-primary focus:ring-primary shadow-none" />
                        <span className={`text-lg font-bold transition-colors ${
                          currentResponse === option.id ? 'text-primary' : 'text-slate-600 group-hover:text-slate-900'
                        }`}>
                          {option.option_text}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>

                  {/* Navigation Interlock */}
                  <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0 || isSubmitted}
                      className="group flex items-center gap-3 px-8 py-7 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-500 hover:text-slate-800"
                    >
                      <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      PREVIOUS
                    </Button>
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full hidden sm:block">
                       <div 
                         className="h-full bg-primary rounded-full transition-all duration-500" 
                         style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                       />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === questions.length - 1 || isSubmitted}
                      className="group flex items-center gap-3 px-8 py-7 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-500 hover:text-slate-800"
                    >
                      NEXT
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Right: Intelligence Navigator */}
        <aside className="w-full lg:w-96 space-y-8 animate-reveal stagger-1">
           <Card className="glass-card border-none rounded-[3rem] shadow-premium-sm p-8 flex flex-col h-fit sticky top-32">
              <div className="mb-8 border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                   <div className="p-2 bg-slate-900 rounded-lg">
                      <LayoutDashboard className="h-4 w-4 text-white" />
                   </div>
                   Navigator
                </h3>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                {questions.map((q, i) => {
                  const isAnswered = responses[q.id];
                  const isCurrent = i === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`
                        aspect-square rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center border-2
                        ${isCurrent 
                          ? 'border-primary bg-primary text-white scale-110 shadow-lg shadow-primary/20 rotate-3' 
                          : isAnswered 
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-100'
                        }
                      `}
                    >
                      {(i + 1).toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              {/* Navigator Legend */}
              <div className="mt-10 pt-8 border-t border-slate-50 space-y-4">
                 {[
                   { label: 'Active Focus', color: 'bg-primary' },
                   { label: 'Cloud Synced', color: 'bg-emerald-400' },
                   { label: 'Pending Item', color: 'bg-slate-200' }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-3">
                     <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                   </div>
                 ))}
              </div>
           </Card>

           <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary group-hover:bg-primary-glow transition-colors opacity-10 blur-2xl -mr-16 -mt-16"></div>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Assistance Engine</p>
              <p className="text-xs font-medium text-white/70 leading-relaxed uppercase tracking-widest italic">
                Proctoring sync active. Your validation progress is securely mirrored to the institutional cloud.
              </p>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default McqTest;

