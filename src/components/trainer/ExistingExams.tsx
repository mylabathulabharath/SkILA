import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Edit, Trash2, Users, Clock, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Exam {
  id: string;
  name: string;
  time_limit_minutes: number;
  created_at: string;
  batch_name?: string;
  question_count: number;
  status: 'upcoming' | 'active' | 'completed';
  start_at?: string;
  end_at?: string;
  type: 'coding' | 'mcq';
}

interface ExistingExamsProps {
  refreshTrigger: number;
}

export const ExistingExams = ({ refreshTrigger }: ExistingExamsProps) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, [refreshTrigger]);

  const fetchExams = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch all coding tests created by the user
    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .select('id, name, time_limit_minutes, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (testsError) throw testsError;

    // 2. Fetch all MCQ tests created by the user
    const { data: mcqTests, error: mcqTestsError } = await (supabase as any)
      .from('mcq_tests')
      .select('id, title, duration_minutes, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (mcqTestsError) throw mcqTestsError;

    // 3. Fetch all assignments for coding tests
    const testIds = tests?.map(t => t.id) || [];
    let assignments: any[] = [];
    let questions: any[] = [];

    if (testIds.length > 0) {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('test_assignments')
        .select('test_id, start_at, end_at, batch_id, batches(name)')
        .in('test_id', testIds);

      if (assignmentsError) throw assignmentsError;
      assignments = assignmentsData || [];

      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('test_id, question_id')
        .in('test_id', testIds);

      if (questionsError) throw questionsError;
      questions = questionsData || [];
    }

    // 4. Fetch all assignments for MCQ tests
    const mcqTestIds = (mcqTests || []).map((t: any) => t.id) || [];
    let mcqAssignments: any[] = [];
    let mcqQuestions: any[] = [];

    if (mcqTestIds.length > 0) {
      const { data: mcqAssignmentsData, error: mcqAssignmentsError } = await (supabase as any)
        .from('mcq_test_assignments')
        .select('test_id, start_at, end_at, batch_id, batches(name)')
        .in('test_id', mcqTestIds);

      if (mcqAssignmentsError) throw mcqAssignmentsError;
      mcqAssignments = mcqAssignmentsData || [];

      const { data: mcqQuestionsData, error: mcqQuestionsError } = await (supabase as any)
        .from('mcq_test_questions')
        .select('test_id, question_id')
        .in('test_id', mcqTestIds);

      if (mcqQuestionsError) throw mcqQuestionsError;
      mcqQuestions = mcqQuestionsData || [];
    }

    // 5. Format coding exams
    const formattedCodingExams = (tests || []).map(test => {
      const assignment = assignments.find(a => a.test_id === test.id);
      const testQuestions = questions.filter(q => q.test_id === test.id);

      const now = new Date();
      const startAt = assignment?.start_at ? new Date(assignment.start_at) : null;
      const endAt = assignment?.end_at ? new Date(assignment.end_at) : null;

      let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
      if (startAt && endAt) {
        if (now < startAt) {
          status = 'upcoming';
        } else if (now >= startAt && now <= endAt) {
          status = 'active';
        } else {
          status = 'completed';
        }
      }

      return {
        id: test.id,
        name: test.name,
        time_limit_minutes: test.time_limit_minutes,
        created_at: test.created_at,
        batch_name: assignment?.batches?.name,
        question_count: testQuestions.length,
        status,
        start_at: assignment?.start_at,
        end_at: assignment?.end_at,
        type: 'coding' as const,
      };
    });

    // 6. Format MCQ exams
    const formattedMcqExams = (mcqTests || []).map((test: any) => {
      const assignment = mcqAssignments.find((a: any) => a.test_id === test.id);
      const testQuestions = mcqQuestions.filter((q: any) => q.test_id === test.id);

      const now = new Date();
      const startAt = assignment?.start_at ? new Date(assignment.start_at) : null;
      const endAt = assignment?.end_at ? new Date(assignment.end_at) : null;

      let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
      if (startAt && endAt) {
        if (now < startAt) {
          status = 'upcoming';
        } else if (now >= startAt && now <= endAt) {
          status = 'active';
        } else {
          status = 'completed';
        }
      }

      return {
        id: test.id,
        name: test.title,
        time_limit_minutes: test.duration_minutes,
        created_at: test.created_at,
        batch_name: assignment?.batches?.name,
        question_count: testQuestions.length,
        status,
        start_at: assignment?.start_at,
        end_at: assignment?.end_at,
        type: 'mcq' as const,
      };
    });

    // 7. Combine and sort by created_at
    const allExams = [...formattedCodingExams, ...formattedMcqExams].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setExams(allExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    toast({
      title: "Error",
      description: "Failed to load exams",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const handleDeleteExam = async (examId: string) => {
    try {
      const {error: questionsError} = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', examId);

      if (questionsError) throw questionsError;

      const {error: assignmentsError} = await supabase
        .from('test_assignments')
        .delete()
        .eq('test_id', examId);

      if (assignmentsError) throw assignmentsError;

      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exam deleted successfully",
      });

      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Error",
        description: "Failed to delete exam",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',

    });
  };

  if (loading) {
    return (
      <Card className="bg-card-gradient shadow-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Existing Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-gradient shadow-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Existing Exams
        </CardTitle>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Exams Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first exam to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="border border-border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground">{exam.name}</h4>
                        <Badge className={getStatusColor(exam.status)}>
                          {exam.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
                        {exam.batch_name && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{exam.batch_name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{exam.time_limit_minutes} min</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <ClipboardList className="h-4 w-4 flex-shrink-0" />
                          <span>{exam.question_count} questions</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{formatDate(exam.created_at)}</span>
                        </div>
                      </div>

                      {exam.start_at && exam.end_at && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span>Available: {formatDate(exam.start_at)} - {formatDate(exam.end_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          toast({
                            title: "Coming Soon",
                            description: "Edit functionality will be available soon",
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{exam.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteExam(exam.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};