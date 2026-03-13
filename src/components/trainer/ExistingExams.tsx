import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Edit, Trash2, Users, Clock, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Exam {
  id: string;
  name: string;
  time_limit_minutes: number;
  created_at: string;
  batch_ids?: string[];
  batch_names?: string[];
  question_count: number;
  status: 'upcoming' | 'active' | 'completed';
  start_at?: string;
  end_at?: string;
  type: 'coding' | 'mcq';
  is_public?: boolean;
  sharing_token?: string;
}

interface Batch {
  id: string;
  name: string;
}

interface ExistingExamsProps {
  refreshTrigger: number;
}

export const ExistingExams = ({ refreshTrigger }: ExistingExamsProps) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingExam, setSharingExam] = useState<Exam | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
    fetchBatches();
  }, [refreshTrigger]);

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all coding tests created by the user
      const { data: tests, error: testsError } = await (supabase as any)
        .from('tests')
        .select('id, name, time_limit_minutes, created_at, is_public, sharing_token')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // 2. Fetch all MCQ tests created by the user
      const { data: mcqTests, error: mcqTestsError } = await (supabase as any)
        .from('mcq_tests')
        .select('id, title, duration_minutes, created_at, is_public, sharing_token')
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
        const testAssignments = assignments.filter(a => a.test_id === test.id);
        const testQuestions = questions.filter(q => q.test_id === test.id);

        const firstAssignment = testAssignments[0];
        const now = new Date();
        const startAt = firstAssignment?.start_at ? new Date(firstAssignment.start_at) : null;
        const endAt = firstAssignment?.end_at ? new Date(firstAssignment.end_at) : null;

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
          batch_ids: testAssignments.map(a => a.batch_id),
          batch_names: testAssignments.map(a => a.batches?.name),
          question_count: testQuestions.length,
          status,
          start_at: firstAssignment?.start_at,
          end_at: firstAssignment?.end_at,
          type: 'coding' as const,
          is_public: test.is_public,
          sharing_token: test.sharing_token
        };
      });

      // 6. Format MCQ exams
      const formattedMcqExams = (mcqTests || []).map((test: any) => {
        const testAssignments = mcqAssignments.filter((a: any) => a.test_id === test.id);
        const testQuestions = mcqQuestions.filter((q: any) => q.test_id === test.id);

        const firstAssignment = testAssignments[0];
        const now = new Date();
        const startAt = firstAssignment?.start_at ? new Date(firstAssignment.start_at) : null;
        const endAt = firstAssignment?.end_at ? new Date(firstAssignment.end_at) : null;

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
          batch_ids: testAssignments.map(a => a.batch_id),
          batch_names: testAssignments.map(a => a.batches?.name),
          question_count: testQuestions.length,
          status,
          start_at: firstAssignment?.start_at,
          end_at: firstAssignment?.end_at,
          type: 'mcq' as const,
          is_public: test.is_public,
          sharing_token: test.sharing_token
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

  const handleDeleteExam = async (exam: Exam) => {
    try {
      if (exam.type === 'coding') {
        // Cascading deletes are mostly handled by DB but some might need manual cleanup
        const { error } = await supabase
          .from('tests')
          .delete()
          .eq('id', exam.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('mcq_tests')
          .delete()
          .eq('id', exam.id);
        if (error) throw error;
      }

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

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !editingExam.name.trim()) return;

    setUpdating(true);
    try {
      const startAt = editingExam.start_at ? new Date(editingExam.start_at).toISOString() : null;
      const endAt = editingExam.end_at ? new Date(editingExam.end_at).toISOString() : null;

      if (editingExam.type === 'coding') {
        const { error: testError } = await supabase
          .from('tests')
          .update({
            name: editingExam.name.trim(),
            time_limit_minutes: editingExam.time_limit_minutes
          } as any)
          .eq('id', editingExam.id);
        if (testError) throw testError;

        if (editingExam.batch_ids && startAt && endAt) {
          // Sync coding test assignments
          // 1. Delete all existing for this test
          const { error: delError } = await supabase
            .from('test_assignments')
            .delete()
            .eq('test_id', editingExam.id);
          if (delError) throw delError;

          // 2. Insert new ones
          if (editingExam.batch_ids.length > 0) {
            const { error: insError } = await supabase
              .from('test_assignments')
              .insert(editingExam.batch_ids.map(bid => ({
                test_id: editingExam.id,
                batch_id: bid,
                start_at: startAt,
                end_at: endAt
              })));
            if (insError) throw insError;
          }
        }
      } else {
        const { error: testError } = await (supabase as any)
          .from('mcq_tests')
          .update({
            title: editingExam.name.trim(),
            duration_minutes: editingExam.time_limit_minutes
          } as any)
          .eq('id', editingExam.id);
        if (testError) throw testError;

        if (editingExam.batch_ids && startAt && endAt) {
          // Sync MCQ test assignments
          // 1. Delete all existing for this test
          const { error: delError } = await (supabase as any)
            .from('mcq_test_assignments')
            .delete()
            .eq('test_id', editingExam.id);
          if (delError) throw delError;

          // 2. Insert new ones
          if (editingExam.batch_ids.length > 0) {
            const { error: insError } = await (supabase as any)
              .from('mcq_test_assignments')
              .insert(editingExam.batch_ids.map(bid => ({
                test_id: editingExam.id,
                batch_id: bid,
                start_at: startAt,
                end_at: endAt
              } as any)));
            if (insError) throw insError;
          }
        }
      }

      toast({
        title: "Success",
        description: "Exam updated successfully",
      });

      setEditModalOpen(false);
      setEditingExam(null);
      fetchExams();
    } catch (error) {
      console.error('Error updating exam:', error);
      toast({
        title: "Error",
        description: "Failed to update exam",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const toggleShare = async (exam: Exam) => {
    try {
      const newVal = !exam.is_public;
      if (exam.type === 'coding') {
        const { error } = await supabase
          .from('tests')
          .update({ is_public: newVal } as any)
          .eq('id', exam.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('mcq_tests')
          .update({ is_public: newVal } as any)
          .eq('id', exam.id);
        if (error) throw error;
      }

      toast({
        title: newVal ? "Exam Published" : "Exam Unpublished",
        description: newVal ? "Anyone with the link can now take this exam." : "This exam is now private.",
      });

      fetchExams();
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: "Error",
        description: "Failed to update share status",
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

  const formatForInput = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
  };

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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-semibold text-foreground truncate">{exam.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(exam.status)}>
                            {exam.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {exam.type}
                          </Badge>
                          {exam.is_public && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
                        {exam.batch_names && exam.batch_names.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{exam.batch_names.join(", ")}</span>
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

                    <div className="flex gap-2 ml-4 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Share Link"
                        className={exam.is_public ? "text-emerald-600 border-emerald-200 bg-emerald-50" : ""}
                        onClick={() => {
                          setSharingExam(exam);
                          setShareModalOpen(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingExam({
                            ...exam,
                            start_at: exam.start_at ? formatForInput(exam.start_at) : "",
                            end_at: exam.end_at ? formatForInput(exam.end_at) : ""
                          });
                          setEditModalOpen(true);
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
                              Are you sure you want to delete "{exam.name}"? This will also delete all student attempts.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExam(exam)}
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

        {/* Edit Exam Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exam & Assignments</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateExam} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Name</Label>
                  <Input
                    value={editingExam?.name || ""}
                    onChange={(e) => setEditingExam(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Exam Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={editingExam?.time_limit_minutes || 0}
                    onChange={(e) => setEditingExam(prev => prev ? { ...prev, time_limit_minutes: parseInt(e.target.value) } : null)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Assigned Batches (Select one or more)</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  <ScrollArea className="h-40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {batches.map(batch => (
                        <div key={batch.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`batch-${batch.id}`}
                            checked={editingExam?.batch_ids?.includes(batch.id)}
                            onCheckedChange={(checked) => {
                              setEditingExam(prev => {
                                if (!prev) return null;
                                const currentBatchIds = prev.batch_ids || [];
                                if (checked) {
                                  return { ...prev, batch_ids: [...currentBatchIds, batch.id] };
                                } else {
                                  return { ...prev, batch_ids: currentBatchIds.filter(id => id !== batch.id) };
                                }
                              });
                            }}
                          />
                          <Label htmlFor={`batch-${batch.id}`} className="text-sm font-normal cursor-pointer">
                            {batch.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editingExam?.start_at || ""}
                    onChange={(e) => setEditingExam(prev => prev ? { ...prev, start_at: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editingExam?.end_at || ""}
                    onChange={(e) => setEditingExam(prev => prev ? { ...prev, end_at: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Update Exam Details"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Share Exam Dialog */}
        <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sharable Exam Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Public Access</p>
                  <p className="text-xs text-muted-foreground">
                    {sharingExam?.is_public ? "Anyone with the link can take this test." : "Only assigned students can take this test."}
                  </p>
                </div>
                <Button
                  variant={sharingExam?.is_public ? "destructive" : "default"}
                  size="sm"
                  onClick={() => sharingExam && toggleShare(sharingExam).then(() => {
                    setSharingExam(prev => prev ? { ...prev, is_public: !prev.is_public } : null);
                  })}
                >
                  {sharingExam?.is_public ? "Disable" : "Enable"}
                </Button>
              </div>

              {sharingExam?.is_public && (
                <div className="space-y-2">
                  <Label>Direct Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/${sharingExam.type === 'coding' ? 'exam' : 'mcq/test'}/${sharingExam.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/${sharingExam.type === 'coding' ? 'exam' : 'mcq/test'}/${sharingExam.id}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Copied!", description: "Link copied to clipboard." });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};