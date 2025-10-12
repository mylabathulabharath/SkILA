import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Star, Play } from "lucide-react";
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Fetching upcoming tests for user:', user.id);

      // First, get user's batch memberships
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

      // Get all test assignments for user's batches
      const { data: testAssignments, error: assignmentsError } = await supabase
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
        .gte('end_at', new Date().toISOString()) // Only future or current tests
        .lte('start_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Within next 7 days
        .order('start_at', { ascending: true });

      if (assignmentsError) {
        console.error('Error fetching test assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Raw test assignments data:', testAssignments);

      if (!testAssignments || testAssignments.length === 0) {
        console.log('No test assignments found');
        setTests([]);
        return;
      }

      // Get user's existing attempts to filter out completed tests
      const { data: userAttempts, error: attemptsError } = await supabase
        .from('attempts')
        .select('test_id, status')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted', 'active']);

      if (attemptsError) {
        console.error('Error fetching user attempts:', attemptsError);
        throw attemptsError;
      }

      const attemptedTestIds = new Set(userAttempts?.map(attempt => attempt.test_id) || []);
      console.log('User attempted test IDs:', attemptedTestIds);

      // Filter out tests that user has already attempted
      const availableTests = testAssignments.filter(assignment => 
        !attemptedTestIds.has(assignment.test_id)
      );

      console.log('Available tests after filtering:', availableTests);

      if (availableTests.length === 0) {
        console.log('No available tests after filtering attempts');
        setTests([]);
        return;
      }

      // Fetch additional test details and questions for difficulty calculation
      const testIds = availableTests.map(test => test.test_id);
      let questionsData: any[] = [];

      if (testIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('test_questions')
          .select(`
            test_id,
            questions(difficulty)
          `)
          .in('test_id', testIds);

        if (questionsError) throw questionsError;
        questionsData = questions || [];
      }

      // Calculate average difficulty for each test
      const testDifficulties: Record<string, number> = {};
      questionsData.forEach(q => {
        if (!testDifficulties[q.test_id]) {
          testDifficulties[q.test_id] = 0;
        }
        testDifficulties[q.test_id] += q.questions?.difficulty || 0;
      });

      // Format the tests
      const formattedTests: UpcomingTest[] = availableTests.map(assignment => {
        const test = assignment.tests;
        const avgDifficulty = testDifficulties[test.id] || 0;
        const questionCount = questionsData.filter(q => q.test_id === test.id).length;
        const difficulty = questionCount > 0 ? avgDifficulty / questionCount : 0;

        // Parse UTC dates and convert to local time for display
        const startDate = new Date(assignment.start_at);
        const endDate = new Date(assignment.end_at);

        // Skip if dates are invalid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date found for test:', assignment);
          return null;
        }

        return {
          id: test.id,
          title: test.name,
          subject: "Programming", // Default subject since it's not in the schema
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
          difficulty: difficulty <= 2 ? "Easy" : difficulty <= 3.5 ? "Medium" : "Hard",
          type: "Class Test" as const,
          batch_name: assignment.batches?.name,
          start_at: assignment.start_at,
          end_at: assignment.end_at
        };
      }).filter(Boolean) as UpcomingTest[];

      console.log('Formatted tests:', formattedTests);
      setTests(formattedTests);
    } catch (error) {
      console.error('Error fetching upcoming tests:', error);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Hard":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Class Test" 
      ? "bg-primary/10 text-primary hover:bg-primary/10" 
      : "bg-secondary/10 text-secondary hover:bg-secondary/10";
  };

  const handleStartTest = async (test: UpcomingTest) => {
    try {
      // Check if test is currently available
      const now = new Date();
      const startTime = new Date(test.start_at);
      const endTime = new Date(test.end_at);

      if (now < startTime) {
        toast({
          title: "Test Not Available",
          description: `This test will be available from ${test.time}`,
          variant: "destructive",
        });
        return;
      }

      if (now > endTime) {
        toast({
          title: "Test Expired",
          description: "This test is no longer available",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the exam page
      navigate(`/exam/${test.id}`);
    } catch (error) {
      console.error('Error starting test:', error);
      toast({
        title: "Error",
        description: "Failed to start test",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Upcoming Tests</h2>
          <p className="text-muted-foreground">Stay prepared for your scheduled assessments</p>
        </div>
        <Card className="border-0 bg-card-gradient">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading upcoming tests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Upcoming Tests</h2>
        <p className="text-muted-foreground">Stay prepared for your scheduled assessments</p>
      </div>

      {tests.length > 0 ? (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id} className="border-0 bg-card-gradient hover:shadow-card transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{test.title}</h3>
                      <Badge variant="secondary" className={getTypeColor(test.type)}>
                        {test.type}
                      </Badge>
                      <Badge variant="secondary" className={getDifficultyColor(test.difficulty)}>
                        <Star className="w-3 h-3 mr-1" />
                        {test.difficulty}
                      </Badge>
                      {test.batch_name && (
                        <Badge variant="outline" className="text-xs">
                          {test.batch_name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{test.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{test.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground">
                      Subject: <span className="text-primary">{test.subject}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="authSecondary" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: test.title,
                          description: `Duration: ${test.duration} | Batch: ${test.batch_name} | Available until ${new Date(test.end_at).toLocaleString()}`,
                        });
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="auth" 
                      size="sm"
                      onClick={() => handleStartTest(test)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 bg-card-gradient">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Upcoming Tests</h3>
            <p className="text-muted-foreground">
              You're all caught up! Check back later for new assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};