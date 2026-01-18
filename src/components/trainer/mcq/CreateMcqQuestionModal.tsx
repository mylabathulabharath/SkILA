import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, BookOpen, Tag } from "lucide-react";

interface CreateMcqQuestionModalProps {
  onQuestionCreated: () => void;
}

export const CreateMcqQuestionModal = ({ onQuestionCreated }: CreateMcqQuestionModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [concepts, setConcepts] = useState<Array<{ id: string; name: string }>>([]);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [creatingConcept, setCreatingConcept] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newConceptName, setNewConceptName] = useState("");
  const [newConceptDescription, setNewConceptDescription] = useState("");
  
  const [formData, setFormData] = useState({
    subjectId: "",
    conceptId: "",
    questionText: "",
    difficulty: "Medium",
    marks: "1",
    negativeMarks: "0",
    explanation: "",
  });

  const [options, setOptions] = useState<Array<{ id: string; text: string; isCorrect: boolean }>>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
    { id: "3", text: "", isCorrect: false },
    { id: "4", text: "", isCorrect: false },
  ]);

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSubjects();
    }
  }, [open]);

  useEffect(() => {
    if (formData.subjectId) {
      fetchConcepts(formData.subjectId);
    } else {
      setConcepts([]);
    }
  }, [formData.subjectId]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('mcq_subjects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchConcepts = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('mcq_concepts')
        .select('id, name')
        .eq('subject_id', subjectId)
        .order('name');

      if (error) throw error;
      setConcepts(data || []);
    } catch (error) {
      console.error('Error fetching concepts:', error);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newSubject, error } = await supabase
        .from('mcq_subjects')
        .insert({
          name: newSubjectName.trim(),
          description: newSubjectDescription.trim() || null,
          status: 'active',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subject created successfully",
      });

      setSubjects([...subjects, { id: newSubject.id, name: newSubject.name }]);
      setFormData({ ...formData, subjectId: newSubject.id });
      setCreatingSubject(false);
      setNewSubjectName("");
      setNewSubjectDescription("");
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create subject",
        variant: "destructive",
      });
    }
  };

  const handleCreateConcept = async () => {
    if (!newConceptName.trim() || !formData.subjectId) {
      toast({
        title: "Validation Error",
        description: "Concept name is required and a subject must be selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newConcept, error } = await supabase
        .from('mcq_concepts')
        .insert({
          subject_id: formData.subjectId,
          name: newConceptName.trim(),
          description: newConceptDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Concept created successfully",
      });

      setConcepts([...concepts, { id: newConcept.id, name: newConcept.name }]);
      setFormData({ ...formData, conceptId: newConcept.id });
      setCreatingConcept(false);
      setNewConceptName("");
      setNewConceptDescription("");
    } catch (error: any) {
      console.error('Error creating concept:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create concept",
        variant: "destructive",
      });
    }
  };

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      toast({
        title: "Error",
        description: "At least 2 options are required",
        variant: "destructive",
      });
      return;
    }
    setOptions(options.filter(opt => opt.id !== id));
  };

  const updateOption = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setOptions(options.map(opt => 
      opt.id === id ? { ...opt, [field]: value } : opt
    ));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.subjectId || !formData.conceptId || !formData.questionText) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (options.filter(opt => opt.text.trim()).length < 2) {
      toast({
        title: "Validation Error",
        description: "At least 2 options are required",
        variant: "destructive",
      });
      return;
    }

    const correctOptions = options.filter(opt => opt.isCorrect && opt.text.trim());
    if (correctOptions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one option must be marked as correct",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create question
      const { data: question, error: questionError } = await supabase
        .from('mcq_questions')
        .insert({
          subject_id: formData.subjectId,
          concept_id: formData.conceptId,
          question_text: formData.questionText,
          difficulty: formData.difficulty as any,
          marks: parseInt(formData.marks),
          negative_marks: parseFloat(formData.negativeMarks),
          explanation: formData.explanation || null,
          tags: tags.length > 0 ? tags : null,
          created_by: user.id
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create options
      const optionsData = options
        .filter(opt => opt.text.trim())
        .map((opt, index) => ({
          question_id: question.id,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          order_index: index
        }));

      const { error: optionsError } = await supabase
        .from('mcq_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast({
        title: "Success",
        description: "MCQ question created successfully",
      });

      setOpen(false);
      resetForm();
      onQuestionCreated();

    } catch (error: any) {
      console.error('Error creating MCQ question:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create question",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subjectId: "",
      conceptId: "",
      questionText: "",
      difficulty: "Medium",
      marks: "1",
      negativeMarks: "0",
      explanation: "",
    });
    setOptions([
      { id: "1", text: "", isCorrect: false },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
      { id: "4", text: "", isCorrect: false },
    ]);
    setTags([]);
    setNewTag("");
    setCreatingSubject(false);
    setCreatingConcept(false);
    setNewSubjectName("");
    setNewSubjectDescription("");
    setNewConceptName("");
    setNewConceptDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Create MCQ Question</h3>
                <p className="text-sm text-muted-foreground">Add a new multiple choice question</p>
              </div>
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create MCQ Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject *</Label>
                {!creatingSubject && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreatingSubject(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create New
                  </Button>
                )}
              </div>
              {creatingSubject ? (
                <div className="space-y-2 border rounded-lg p-3">
                  <Input
                    placeholder="Subject name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newSubjectDescription}
                    onChange={(e) => setNewSubjectDescription(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateSubject}
                      className="flex-1"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreatingSubject(false);
                        setNewSubjectName("");
                        setNewSubjectDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value, conceptId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Concept *</Label>
                {!creatingConcept && formData.subjectId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreatingConcept(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create New
                  </Button>
                )}
              </div>
              {creatingConcept ? (
                <div className="space-y-2 border rounded-lg p-3">
                  <Input
                    placeholder="Concept name"
                    value={newConceptName}
                    onChange={(e) => setNewConceptName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newConceptDescription}
                    onChange={(e) => setNewConceptDescription(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateConcept}
                      className="flex-1"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreatingConcept(false);
                        setNewConceptName("");
                        setNewConceptDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.conceptId}
                  onValueChange={(value) => setFormData({ ...formData, conceptId: value })}
                  disabled={!formData.subjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select concept" />
                  </SelectTrigger>
                  <SelectContent>
                    {concepts.map((concept) => (
                      <SelectItem key={concept.id} value={concept.id}>
                        {concept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question Text *</Label>
            <Textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              placeholder="Enter the question..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Difficulty *</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marks *</Label>
              <Input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Negative Marks</Label>
              <Input
                type="number"
                value={formData.negativeMarks}
                onChange={(e) => setFormData({ ...formData, negativeMarks: e.target.value })}
                min="0"
                step="0.25"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Answer Options *</Label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="flex gap-2 items-start">
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={option.isCorrect ? "default" : "outline"}
                    onClick={() => updateOption(option.id, 'isCorrect', !option.isCorrect)}
                  >
                    {option.isCorrect ? "Correct" : "Mark Correct"}
                  </Button>
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(option.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addOption} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain the correct answer..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag (e.g., arrays, loops, oop)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Question"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

