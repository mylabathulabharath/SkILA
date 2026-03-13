import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, UserPlus, Edit, Trash2, Search, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Batch {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
}

interface Student {
  id: string;
  email: string;
  full_name: string;
  is_member: boolean;
}

interface StudentManagementModalProps {
  batch: Batch;
  isOpen: boolean;
  onClose: () => void;
  onStudentsUpdated: () => void;
}

const StudentManagementModal = ({ batch, isOpen, onClose, onStudentsUpdated }: StudentManagementModalProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, batch.id]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      // Fetch current batch members
      const { data: batchMembersData, error: batchMembersError } = await supabase
        .from('batch_members')
        .select('user_id')
        .eq('batch_id', batch.id);

      if (batchMembersError) throw batchMembersError;

      const currentMemberIds = new Set(batchMembersData?.map(bm => bm.user_id) || []);

      const studentsWithMembership = studentsData?.map(student => ({
        id: student.id,
        email: student.email,
        full_name: student.full_name,
        is_member: currentMemberIds.has(student.id)
      })) || [];

      setStudents(studentsWithMembership);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select students to add to the batch",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const batchMembersToAdd = selectedStudents.map(studentId => ({
        batch_id: batch.id,
        user_id: studentId,
        role_in_batch: 'student'
      }));

      const { error } = await supabase
        .from('batch_members')
        .insert(batchMembersToAdd);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedStudents.length} student(s) added to ${batch.name}`,
      });

      onStudentsUpdated();
      onClose();
    } catch (error) {
      console.error('Error adding students:', error);
      toast({
        title: "Error",
        description: "Failed to add students to batch",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('batch_members')
        .delete()
        .eq('batch_id', batch.id)
        .eq('user_id', studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student removed from batch",
      });

      onStudentsUpdated();
      fetchStudents();
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: "Error",
        description: "Failed to remove student from batch",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nonMembers = filteredStudents.filter(student => !student.is_member);
  const members = filteredStudents.filter(student => student.is_member);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Students - {batch.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Students */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Available Students</h3>
                  <Badge variant="secondary">{nonMembers.length}</Badge>
                </div>

                <ScrollArea className="h-64 border rounded-md p-4">
                  {nonMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No students found" : "All students are already in this batch"}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nonMembers.map((student) => (
                        <div key={student.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedStudents([...selectedStudents, student.id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{student.full_name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Current Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Current Members</h3>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>

                <ScrollArea className="h-64 border rounded-md p-4">
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No students in this batch yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{student.full_name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudents}
              disabled={updating || selectedStudents.length === 0}
              className="flex items-center gap-2"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Add Selected ({selectedStudents.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const BatchManagement = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchDesc, setNewBatchDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: batchesData, error: batchesError } = await (supabase as any)
        .from('batches')
        .select('id, name, description, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      const batchIds = batchesData?.map(b => b.id) || [];
      let memberCounts: Record<string, number> = {};

      if (batchIds.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from('batch_members')
          .select('batch_id')
          .in('batch_id', batchIds);

        if (membersError) throw membersError;

        membersData?.forEach((bm) => {
          memberCounts[bm.batch_id] = (memberCounts[bm.batch_id] || 0) + 1;
        });
      }

      const formattedBatches = batchesData?.map((batch) => ({
        id: batch.id,
        name: batch.name,
        description: batch.description,
        created_at: batch.created_at,
        member_count: memberCounts[batch.id] || 0,
      })) || [];

      setBatches(formattedBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: "Error",
        description: "Failed to load batches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a batch name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('batches')
        .insert({
          name: newBatchName.trim(),
          description: newBatchDesc.trim() || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch created successfully",
      });

      setCreateModalOpen(false);
      setNewBatchName("");
      setNewBatchDesc("");
      fetchBatches();
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });

      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editingBatch.name.trim()) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('batches')
        .update({
          name: editingBatch.name.trim(),
          description: editingBatch.description?.trim() || null
        })
        .eq('id', editingBatch.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch updated successfully",
      });

      setEditModalOpen(false);
      setEditingBatch(null);
      fetchBatches();
    } catch (error) {
      console.error('Error updating batch:', error);
      toast({
        title: "Error",
        description: "Failed to update batch",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="bg-card-gradient shadow-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Management
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" />
          Batch Management
        </CardTitle>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBatch} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. MERN Stack 2024"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g. Morning Batch"
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Batch"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/60">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No batches yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Create your first batch to start managing students and assigning exams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <Card key={batch.id} className="border border-border/50 bg-white/60 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{batch.name}</h3>
                      <p className="text-xs text-muted-foreground">Created {formatDate(batch.created_at)}</p>
                      {batch.description && (
                        <p className="text-sm text-muted-foreground mt-2 italic">{batch.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                      {batch.member_count} Students
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 font-bold text-xs"
                      onClick={() => {
                        setSelectedBatch(batch);
                        setStudentModalOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Students
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold text-xs"
                      onClick={() => {
                        setEditingBatch(batch);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the batch "{batch.name}" and remove all student associations.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Batch
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Batch Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateBatch} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Batch Name</Label>
                <Input
                  id="edit-name"
                  value={editingBatch?.name || ""}
                  onChange={(e) => setEditingBatch(prev => prev ? { ...prev, name: e.target.value } : null)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingBatch?.description || ""}
                  onChange={(e) => setEditingBatch(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Updating..." : "Update Batch"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {selectedBatch && (
          <StudentManagementModal
            batch={selectedBatch}
            isOpen={studentModalOpen}
            onClose={() => {
              setStudentModalOpen(false);
              setSelectedBatch(null);
            }}
            onStudentsUpdated={fetchBatches}
          />
        )}
      </CardContent>
    </Card>
  );
};