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
  is_public?: boolean;
  sharing_token?: string | null;
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

      // No early return when the user has no batches — public exams are shown
      // to everyone regardless of batch membership.
      const userBatchIds = (userBatches || []).map(b => b.batch_id);
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

      // 3b. Fetch PUBLIC exams — available to everyone via their share link,
      //     no batch membership or assignment required.
      const { data: publicTests, error: publicTestsError } = await supabase
        .from('tests')
        .select('id, name, time_limit_minutes, overall_time_limit_minutes, sharing_token, is_sectioned')
        .eq('is_public', true);
      if (publicTestsError) {
        console.error('Error fetching public tests:', publicTestsError);
      }
      console.log('Raw public tests data:', publicTests);

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

      // Process PUBLIC exams — always available (open now), launched via the
      // sharing token. Skipped if already surfaced as a batch assignment.
      const assignedIds = new Set(allUpcoming.map(t => t.id));
      publicTests?.forEach(t => {
        if (assignedIds.has(t.id)) return;
        allUpcoming.push({
          id: t.id,
          title: t.name,
          subject: t.is_sectioned ? "Professional Exam" : "Programming",
          date: "Open now",
          time: "Available anytime",
          duration: `${t.overall_time_limit_minutes || t.time_limit_minutes} min`,
          difficulty: "Medium",
          type: "Practice",
          batch_name: "Public",
          start_at: new Date(0).toISOString(),
          end_at: new Date(8640000000000000).toISOString(), // always open
          status: 'active',
          model_type: 'code',
          is_public: true,
          sharing_token: t.sharing_token,
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

      // Public exams are entered via their sharing token; assigned exams by id.
      navigate(`/exam/${test.is_public && test.sharing_token ? test.sharing_token : test.id}`);
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
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200/50 rounded-xl"></div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-slate-100/50 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pl-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Active Assignments</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assigned &amp; public assessments available to you</p>
        </div>
        <div className="px-4 py-1.5 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-[0.2em] shadow-sm">
          {tests.length} ASSESSMENTS
        </div>
      </div>

      {tests.length > 0 ? (
        <div className="grid gap-8">
          {tests.map((test) => {
            const isLive = new Date() >= new Date(test.start_at) && new Date() <= new Date(test.end_at);

            return (
              <div key={test.id} className="group glass-card rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                  <div className="flex-1 p-8 lg:p-10 space-y-8 relative">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getDifficultyStyles(test.difficulty)}`}>
                        <Star className="w-3 h-3 fill-current" />
                        {test.difficulty}
                      </div>
                      {isLive && (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 text-rose-600 rounded-full text-[10px] font-black animate-pulse uppercase tracking-[0.15em] border border-rose-200/50">
                          <span className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]"></span>
                          LIVE SESSION
                        </div>
                      )}
                      <div className="px-3.5 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200/50">
                        {test.type}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-3xl font-black text-slate-800 group-hover:text-primary transition-colors duration-300 leading-tight">
                        {test.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">{test.subject}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{test.batch_name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100/80">
                      <div className="space-y-2">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Date</p>
                        <div className="flex items-center gap-2.5 text-slate-700 font-bold">
                          <Calendar className="w-4 h-4 text-primary/50" />
                          <span className="text-[13px]">{test.date}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Opening</p>
                        <div className="flex items-center gap-2.5 text-slate-700 font-bold">
                          <Clock className="w-4 h-4 text-primary/50" />
                          <span className="text-[13px]">{test.time}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Time Limit</p>
                        <div className="flex items-center gap-2.5 text-slate-700 font-bold">
                          <Clock className="w-4 h-4 text-primary/50" />
                          <span className="text-[13px]">{test.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 lg:p-10 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100/80 flex flex-col justify-center gap-4 min-w-[260px]">
                    <Button
                      className={`h-16 rounded-2xl ${isLive ? 'btn-premium text-white shadow-primary' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300`}
                      onClick={() => handleStartTest(test)}
                    >
                      <Play className="w-4 h-4 mr-2.5 fill-current" />
                      {isLive ? 'Launch Session' : 'Locked'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-14 rounded-2xl border-2 border-slate-200/50 hover:bg-white hover:border-primary/30 transition-all text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95"
                      onClick={() => {
                        toast({
                          title: test.title,
                          description: `Scheduled for: ${test.batch_name} | Closes at ${new Date(test.end_at).toLocaleTimeString()}`,
                        });
                      }}
                    >
                      Special Instructions
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-[3rem] p-16 text-center border-dashed border-2 grow">
          <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Calendar className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Optimal Calendar</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium leading-relaxed">
            All assigned tasks are currently accounted for. Check back later for new module rollouts.
          </p>
        </div>
      )}
    </div>
  );
};