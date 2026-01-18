import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, BookOpen, Search, Filter } from "lucide-react";

interface McqQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  subject_id: string;
  tags?: string[] | null;
  concept_id?: string;
  subject_name?: string;
  concept_name?: string;
}

interface Batch {
  id: string;
  name: string;
}

interface CreateMcqTestModalProps {
  onTestCreated: () => void;
}

export const CreateMcqTestModal = ({ onTestCreated }: CreateMcqTestModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<McqQuestion[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    timeLimit: "",
    batchId: "",
    startAt: "",
    endAt: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchQuestions();
      fetchBatches();
    }
  }, [open]);

  // Filter and sort questions
  useEffect(() => {
    let filtered = [...questions];

    // Search filter - check tags, question text, subject, concept
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(q => {
        const matchesText = q.question_text?.toLowerCase().includes(query);
        const matchesTags = q.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesSubject = q.subject_name?.toLowerCase().includes(query);
        const matchesConcept = q.concept_name?.toLowerCase().includes(query);
        return matchesText || matchesTags || matchesSubject || matchesConcept;
      });
    }

    // Subject filter
    if (selectedSubject !== "all") {
      filtered = filtered.filter(q => q.subject_id === selectedSubject);
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => (b.id.localeCompare(a.id))); // Using ID as proxy for created_at
        break;
      case "oldest":
        filtered.sort((a, b) => (a.id.localeCompare(b.id)));
        break;
      case "difficulty_asc":
        const difficultyOrder: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
        filtered.sort((a, b) => (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0));
        break;
      case "difficulty_desc":
        const difficultyOrderDesc: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
        filtered.sort((a, b) => (difficultyOrderDesc[b.difficulty] || 0) - (difficultyOrderDesc[a.difficulty] || 0));
        break;
      case "marks_asc":
        filtered.sort((a, b) => a.marks - b.marks);
        break;
      case "marks_desc":
        filtered.sort((a, b) => b.marks - a.marks);
        break;
      case "subject":
        filtered.sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || ''));
        break;
      default:
        break;
    }

    setFilteredQuestions(filtered);
  }, [questions, searchQuery, sortBy, selectedSubject, selectedDifficulty]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('mcq_questions')
        .select(`
          id, 
          question_text, 
          difficulty, 
          marks, 
          subject_id,
          concept_id,
          tags,
          mcq_subjects!inner(name),
          mcq_concepts(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedQuestions = (data || []).map((q: any) => ({
        ...q,
        subject_name: q.mcq_subjects?.name,
        concept_name: q.mcq_concepts?.name,
      }));
      
      setQuestions(formattedQuestions);
      setFilteredQuestions(formattedQuestions);
      
      // Extract unique subjects for filter
      const uniqueSubjects = Array.from(
        new Map(formattedQuestions.map((q: any) => [q.subject_id, { id: q.subject_id, name: q.mcq_subjects?.name || 'Unknown' }])).values()
      );
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching MCQ questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    }
  };

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: "Error",
        description: "Failed to load batches",
        variant: "destructive",
      });
    }
  };

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestions(prev => {
      const isSelected = prev.includes(questionId);
      if (isSelected) {
        // Remove question and its marks
        const newSelected = prev.filter(id => id !== questionId);
        setQuestionMarks(prevMarks => {
          const newMarks = { ...prevMarks };
          delete newMarks[questionId];
          return newMarks;
        });
        return newSelected;
      } else {
        // Add question with default marks from question
        const question = questions.find(q => q.id === questionId);
        setQuestionMarks(prevMarks => ({
          ...prevMarks,
          [questionId]: question?.marks || 1
        }));
        return [...prev, questionId];
      }
    });
  };

  const handleMarksChange = (questionId: string, marks: number) => {
    setQuestionMarks(prev => ({
      ...prev,
      [questionId]: Math.max(1, marks) // Ensure minimum 1 mark
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.timeLimit || !formData.batchId || selectedQuestions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields and select at least one question",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get subject_id from first selected question (required by schema)
      const firstQuestion = questions.find(q => selectedQuestions.includes(q.id));
      if (!firstQuestion || !firstQuestion.subject_id) throw new Error('No questions selected or missing subject');

      // Calculate total marks
      const totalMarks = selectedQuestions.reduce((total, questionId) => 
        total + (questionMarks[questionId] || 1), 0
      );

      // Create test
      const { data: test, error: testError } = await supabase
        .from('mcq_tests')
        .insert({
          title: formData.name,
          subject_id: firstQuestion.subject_id,
          duration_minutes: parseInt(formData.timeLimit),
          total_marks: totalMarks,
          created_by: user.id
        })
        .select()
        .single();

      if (testError) throw testError;

      // Add questions to test
      const testQuestions = selectedQuestions.map((questionId, index) => ({
        test_id: test.id,
        question_id: questionId,
        marks_override: questionMarks[questionId] || null,
        order_index: index
      }));

      const { error: questionsError } = await supabase
        .from('mcq_test_questions')
        .insert(testQuestions);

      if (questionsError) throw questionsError;

      // Convert local datetime to UTC properly
      const startAt = new Date(formData.startAt).toISOString();
      const endAt = new Date(formData.endAt).toISOString();
      
      // Assign test to batch
      const { error: assignmentError } = await supabase
        .from('mcq_test_assignments')
        .insert({
          test_id: test.id,
          batch_id: formData.batchId,
          start_at: startAt,
          end_at: endAt
        });

      if (assignmentError) throw assignmentError;

      toast({
        title: "Success",
        description: "MCQ test created and assigned successfully",
      });

      setOpen(false);
      setFormData({ name: "", timeLimit: "", batchId: "", startAt: "", endAt: "" });
      setSelectedQuestions([]);
      setQuestionMarks({});
      onTestCreated();

    } catch (error: any) {
      console.error('Error creating MCQ test:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  Create MCQ Test
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Create and assign MCQ tests
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create MCQ Test
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter test name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes) *</Label>
              <Input
                id="timeLimit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                placeholder="60"
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Assign to Batch *</Label>
              <Select value={formData.batchId} onValueChange={(value) => setFormData(prev => ({ ...prev, batchId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start Date & Time *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">End Date & Time *</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Questions</Label>
              <div className="text-sm text-muted-foreground">
                {filteredQuestions.length} of {questions.length} question{questions.length !== 1 ? 's' : ''} shown
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tags, keywords, subject, or concept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Filter by Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Filter by Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="difficulty_asc">Difficulty (Easy → Hard)</SelectItem>
                      <SelectItem value="difficulty_desc">Difficulty (Hard → Easy)</SelectItem>
                      <SelectItem value="marks_asc">Marks (Low → High)</SelectItem>
                      <SelectItem value="marks_desc">Marks (High → Low)</SelectItem>
                      <SelectItem value="subject">Subject (A → Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(searchQuery || selectedSubject !== "all" || selectedDifficulty !== "all") && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSubject("all");
                        setSelectedDifficulty("all");
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid gap-3 max-h-80 overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <Card className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {questions.length === 0 ? "No questions available" : "No questions match your filters"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {questions.length === 0 
                      ? "Create questions first to build tests" 
                      : "Try adjusting your search or filters"}
                  </p>
                </Card>
              ) : (
                filteredQuestions.map((question) => (
                  <Card key={question.id} className={`p-4 transition-all ${
                    selectedQuestions.includes(question.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={question.id}
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={() => handleQuestionToggle(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-2">
                              {question.question_text}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {question.subject_name && (
                                <Badge variant="outline" className="text-xs">
                                  {question.subject_name}
                                </Badge>
                              )}
                              {question.concept_name && (
                                <Badge variant="outline" className="text-xs">
                                  {question.concept_name}
                                </Badge>
                              )}
                              {question.tags && question.tags.length > 0 && (
                                question.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                          </div>
                        </div>
                        {selectedQuestions.includes(question.id) && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`marks-${question.id}`} className="text-sm font-medium">
                                Marks:
                              </Label>
                              <Input
                                id={`marks-${question.id}`}
                                type="number"
                                min="1"
                                max="1000"
                                value={questionMarks[question.id] || question.marks}
                                onChange={(e) => handleMarksChange(question.id, parseInt(e.target.value) || 1)}
                                className="w-20 h-8"
                              />
                              <span className="text-sm text-muted-foreground">points</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            {selectedQuestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                </p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Marks:</span>
                    <span className="text-lg font-bold text-primary">
                      {selectedQuestions.reduce((total, questionId) => 
                        total + (questionMarks[questionId] || 1), 0
                      )} points
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Test"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
