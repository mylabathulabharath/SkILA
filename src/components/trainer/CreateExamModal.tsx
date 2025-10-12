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
import { Plus, BookOpen, Users, Clock } from "lucide-react";
import { start } from "repl";



interface Question {
  id: string;
  title: string;
  difficulty: number;
  supported_languages: string[];
  tags?: string | null;
}

interface QuestionWithMarks extends Question {
  marks: number;
}

interface Batch {
  id: string;
  name: string;
}

interface CreateExamModalProps {
  onExamCreated: () => void;
}

export const CreateExamModal = ({ onExamCreated }: CreateExamModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  
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

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, title, difficulty, supported_languages')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
      setFilteredQuestions(data || []);
      
      // Extract unique tags (temporarily disabled until tags column is properly available)
      setAvailableTags([]);
    } catch (error) {
      console.error('Error fetching questions:', error);
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
        // Add question with default marks
        setQuestionMarks(prevMarks => ({
          ...prevMarks,
          [questionId]: 100 // Default marks
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

  const handleTagFilter = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      
      // Filter questions based on selected tags (temporarily disabled)
      setFilteredQuestions(questions);
      
      return newTags;
    });
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
      // Create test
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert({
          name: formData.name,
          time_limit_minutes: parseInt(formData.timeLimit),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (testError) throw testError;

      // Add questions to test with custom marks
      const testQuestions = selectedQuestions.map((questionId, index) => ({
        test_id: test.id,
        question_id: questionId,
        points: questionMarks[questionId] || 100,
        order_index: index
      }));

      const { error: questionsError } = await supabase
        .from('test_questions')
        .insert(testQuestions);

      if (questionsError) throw questionsError;

      // Convert local datetime to UTC properly
      // The datetime-local input returns a string in local timezone
      // We need to create a Date object and convert it to UTC
      const startAt = new Date(formData.startAt).toISOString();
      const endAt = new Date(formData.endAt).toISOString();
      
      // Assign test to batch
      const { error: assignmentError } = await supabase
        .from('test_assignments')
        .insert({
          test_id: test.id,
          batch_id: formData.batchId,
          start_at: startAt,
          end_at: endAt
        });

      if (assignmentError) throw assignmentError;

      toast({
        title: "Success",
        description: "Exam created and assigned successfully",
      });

      setOpen(false);
      setFormData({ name: "", timeLimit: "", batchId: "", startAt: "", endAt: "" });
      setSelectedQuestions([]);
      setQuestionMarks({});
      onExamCreated();

    } catch (error) {
      console.error('Error creating exam:', error);
      toast({
        title: "Error",
        description: "Failed to create exam",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-100 text-green-800";
    if (difficulty <= 4) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Easy";
    if (difficulty <= 4) return "Medium";
    return "Hard";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-sm">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  Create New Exam
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Create and assign new assessments
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Exam
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter exam name"
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
                placeholder="90"
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
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} available
              </div>
            </div>
            
            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleTagFilter(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTags([]);
                        setFilteredQuestions(questions);
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid gap-3 max-h-80 overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <Card className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {questions.length === 0 ? "No questions available" : "No questions match the selected filters"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {questions.length === 0 ? "Create questions first to build exams" : "Try selecting different tags or clear filters"}
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
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">{question.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {getDifficultyLabel(question.difficulty)}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 mt-2">
                          <div className="flex gap-1">
                            {question.supported_languages.slice(0, 3).map((lang) => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                            {question.supported_languages.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{question.supported_languages.length - 3}
                              </Badge>
                            )}
                          </div>
                          {/* Tags display temporarily disabled until tags column is properly available */}
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
                                value={questionMarks[question.id] || 100}
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
                        total + (questionMarks[questionId] || 100), 0
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
              {loading ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};