import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Star, Play, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UpcomingTest {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: "Class Test" | "Practice";
  batch_name?: string;
  start_at: string;
  end_at: string;
  status: 'upcoming' | 'active';
  model_type: 'code' | 'mcq';
}

export const UpcomingTests = () => {
  const [tests, setTests] = useState<UpcomingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingTests();
  }, []);

  // Listen for exam submission events to refresh the list
  useEffect(() => {
    const handleExamSubmitted = () => {
      console.log('Refreshing upcoming tests after exam submission');
      fetchUpcomingTests();
    };

    window.addEventListener('examSubmitted', handleExamSubmitted);

    return () => {
      window.removeEventListener('examSubmitted', handleExamSubmitted);
    };
  }, []);

  const fetchUpcomingTests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Fetching upcoming tests for user:', user.id);

      // 1. Get user's batch memberships
      const { data: userBatches, error: batchesError } = await supabase
        .from('batch_members')
        .select('batch_id')
        .eq('user_id', user.id);

      if (batchesError) {
        console.error('Error fetching user batches:', batchesError);
        throw batchesError;
      }

      console.log('User batch memberships:', userBatches);

      if (!userBatches || userBatches.length === 0) {
        console.log('User has no batch memberships');
        setTests([]);
        return;
      }
      const userBatchIds = userBatches.map(b => b.batch_id);
      console.log('User batch IDs:', userBatchIds);

      // 2. Fetch Coding Test Assignments
      const { data: codeAssignments, error: codeAssignmentsError } = await supabase
        .from('test_assignments')
        .select(`
          test_id,
          start_at,
          end_at,
          batch_id,
          batches(name),
          tests(
            id,
            name,
            time_limit_minutes
          )
        `)
        .in('batch_id', userBatchIds)
        .gte('end_at', new Date().toISOString()); // Only future or current tests

      if (codeAssignmentsError) {
        console.error('Error fetching coding test assignments:', codeAssignmentsError);
        throw codeAssignmentsError;
      }
      console.log('Raw coding test assignments data:', codeAssignments);

      // 3. Fetch MCQ Test Assignments
      const { data: mcqAssignments, error: mcqAssignmentsError } = await supabase
        .from('mcq_test_assignments') // Assuming 'mcq_test_assignments' table exists
        .select(`
          test_id,
          start_at,
          end_at,
          batch_id,
          batches(name),
          mcq_tests(
            id,
            title,
            duration_minutes
          )
        `)
        .in('batch_id', userBatchIds)
        .gte('end_at', new Date().toISOString()); // Only future or current tests

      if (mcqAssignmentsError) {
        console.error('Error fetching MCQ test assignments:', mcqAssignmentsError);
        throw mcqAssignmentsError;
      }
      console.log('Raw MCQ test assignments data:', mcqAssignments);

      // 4. Fetch User Attempts (Both types)
      const { data: codeAttempts, error: codeAttemptsError } = await supabase
        .from('attempts')
        .select('test_id, status')
        .eq('user_id', user.id);

      if (codeAttemptsError) {
        console.error('Error fetching coding attempts:', codeAttemptsError);
        throw codeAttemptsError;
      }

      const { data: mcqAttempts, error: mcqAttemptsError } = await supabase
        .from('mcq_attempts') // Assuming 'mcq_attempts' table exists
        .select('test_id, status')
        .eq('user_id', user.id);

      if (mcqAttemptsError) {
        console.error('Error fetching MCQ attempts:', mcqAttemptsError);
        throw mcqAttemptsError;
      }

      const attemptMap: Record<string, string> = {};
      [...(codeAttempts || []), ...(mcqAttempts || [])].forEach(a => {
        attemptMap[a.test_id] = a.status;
      });
      console.log('User attempt map:', attemptMap);

      // Combine and format
      const allUpcoming: UpcomingTest[] = [];

      // Process Coding Tests
      codeAssignments?.forEach(a => {
        const test = a.tests;
        if (!test) return; // Skip if test details are missing

        const status = attemptMap[a.test_id];
        if (status === 'submitted' || status === 'auto_submitted') return; // Filter out completed tests

        const startDate = new Date(a.start_at);
        const endDate = new Date(a.end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date found for coding test:', a);
          return;
        }

        allUpcoming.push({
          id: test.id,
          title: test.name,
          subject: "Programming",
          date: startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          time: startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          duration: `${test.time_limit_minutes} min`,
          difficulty: "Medium", // Simplified for now, can be calculated later
          type: "Class Test",
          batch_name: a.batches?.name,
          start_at: a.start_at,
          end_at: a.end_at,
          status: status === 'active' ? 'active' : 'upcoming', // Mark as active if user is currently taking it
          model_type: 'code'
        });
      });

      // Process MCQ Tests
      mcqAssignments?.forEach(a => {
        const test = a.mcq_tests;
        if (!test) return; // Skip if test details are missing

        const status = attemptMap[a.test_id];
        if (status === 'submitted' || status === 'auto_submitted') return; // Filter out completed tests

        const startDate = new Date(a.start_at);
        const endDate = new Date(a.end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date found for MCQ test:', a);
          return;
        }

        allUpcoming.push({
          id: test.id,
          title: test.title,
          subject: "MCQ Assessment",
          date: startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          time: startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          duration: `${test.duration_minutes} min`,
          difficulty: "Medium", // Simplified for now
          type: "Class Test",
          batch_name: a.batches?.name,
          start_at: a.start_at,
          end_at: a.end_at,
          status: status === 'active' ? 'active' : 'upcoming', // Mark as active if user is currently taking it
          model_type: 'mcq'
        });
      });

      // Sort all upcoming tests by start_at
      const sortedTests = allUpcoming.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      console.log('Formatted and sorted upcoming tests:', sortedTests);
      setTests(sortedTests);

    } catch (error: any) {
      console.error('Error fetching comprehensive upcoming tests:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: `Failed to load upcoming tests: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Hard":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const handleStartTest = async (test: UpcomingTest) => {
    try {
      const now = new Date();
      const startTime = new Date(test.start_at);
      const endTime = new Date(test.end_at);

      if (now < startTime) {
        toast({
          title: "Assessment Not Started",
          description: `This test will be available from ${test.time}`,
          variant: "default",
        });
        return;
      }

      if (now > endTime) {
        toast({
          title: "Assessment Expired",
          description: "This test is no longer available",
          variant: "destructive",
        });
        return;
      }

      navigate(`/exam/${test.id}`);
    } catch (error) {
      console.error('Error starting test:', error);
      toast({
        title: "Error",
        description: "Failed to start assessment",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg"></div>
        <Card className="border-0 bg-white/50 backdrop-blur-md">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Upcoming Assessments</h2>
          <p className="text-sm text-muted-foreground mt-1">Assignments scheduled for your batches</p>
        </div>
        <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
          {tests.length} Found
        </div>
      </div>

      {tests.length > 0 ? (
        <div className="grid gap-6">
          {tests.map((test) => {
            const isLive = new Date() >= new Date(test.start_at) && new Date() <= new Date(test.end_at);

            return (
              <Card key={test.id} className="group overflow-hidden border border-white/40 bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 rounded-3xl">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row lg:items-center">
                    <div className="flex-1 p-6 lg:p-8 space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyStyles(test.difficulty)}`}>
                          <Star className="w-3 h-3" />
                          {test.difficulty}
                        </div>
                        {isLive && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-xs font-bold animate-pulse uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            Live Now
                          </div>
                        )}
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-transparent text-[10px] uppercase font-bold tracking-widest">
                          {test.type}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-slate-800 group-hover:text-primary transition-colors line-clamp-1">{test.title}</h3>
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-sm uppercase tracking-wider">{test.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-slate-500 text-sm font-normal italic">{test.batch_name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Schedule</p>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-primary/60" />
                            <span className="text-sm font-semibold">{test.date}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Starts At</p>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-primary/60" />
                            <span className="text-sm font-semibold">{test.time}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Duration</p>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-primary/60" />
                            <span className="text-sm font-semibold">{test.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 lg:p-8 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col gap-3 min-w-[220px]">
                      <Button
                        variant="auth"
                        className={`w-full py-6 rounded-2xl shadow-sm ${isLive ? 'bg-primary shadow-primary/20 hover:scale-[1.02]' : 'opacity-60'} transition-all`}
                        onClick={() => handleStartTest(test)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Assessment
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full py-6 rounded-2xl border-slate-200 hover:bg-white hover:text-primary transition-all text-slate-500 font-bold text-xs uppercase tracking-widest"
                        onClick={() => {
                          toast({
                            title: test.title,
                            description: `Batch: ${test.batch_name} | Available until ${new Date(test.end_at).toLocaleString()}`,
                          });
                        }}
                      >
                        View Guidelines
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 bg-white/40 backdrop-blur-md rounded-3xl p-12 text-center border-dashed border-2 border-slate-200">
          <CardContent className="p-0">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Upcoming Assessments</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
              Your calendar looks clear for now. New assignments will appear here as they are scheduled.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};