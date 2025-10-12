import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Tag, Image as ImageIcon } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_public: boolean;
}

interface CreateQuestionModalProps {
  onQuestionCreated: () => void;
}

export const CreateQuestionModal = ({ onQuestionCreated }: CreateQuestionModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<string>("");
  const [newTag, setNewTag] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: "1", input: "", expected_output: "", is_public: true }
  ]);

  const [formData, setFormData] = useState({
    title: "",
    problem_statement: "",
    difficulty: "1",
    supported_languages: ["python"]
  });

  const { toast } = useToast();

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = tags ? tags.split(',').map(t => t.trim()) : [];
      if (!currentTags.includes(newTag.trim())) {
        const updatedTags = [...currentTags, newTag.trim()];
        setTags(updatedTags.join(', '));
        setNewTag("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = tags ? tags.split(',').map(t => t.trim()) : [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags.join(', '));
  };

  const addTestCase = () => {
    const newId = (testCases.length + 1).toString();
    setTestCases([...testCases, { id: newId, input: "", expected_output: "", is_public: true }]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter(tc => tc.id !== id));
    }
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string | boolean) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.problem_statement || testCases.some(tc => !tc.input || !tc.expected_output)) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and test cases",
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
        .from('questions')
        .insert({
          title: formData.title,
          problem_statement: formData.problem_statement,
          difficulty: parseInt(formData.difficulty),
          supported_languages: formData.supported_languages,
          tags: tags,
          image_url: imageUrl || null,
          created_by: user.id
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create test cases
      const testCasesData = testCases.map((tc, index) => ({
        question_id: question.id,
        input: tc.input,
        expected_output: tc.expected_output,
        is_public: tc.is_public,
        order_index: index
      }));

      const { error: testCasesError } = await supabase
        .from('question_test_cases')
        .insert(testCasesData);

      if (testCasesError) throw testCasesError;

      toast({
        title: "Success",
        description: "Question created successfully",
      });

      setOpen(false);
      resetForm();
      onQuestionCreated();

    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      problem_statement: "",
      difficulty: "1",
      supported_languages: ["python"]
    });
    setTags("");
    setNewTag("");
    setImageUrl("");
    setTestCases([{ id: "1", input: "", expected_output: "", is_public: true }]);
  };

  const languages = [
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "javascript", label: "JavaScript" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  Create Question
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Add new coding problems
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Question
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Two Sum Problem"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem_statement">Problem Statement *</Label>
                <Textarea
                  id="problem_statement"
                  value={formData.problem_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem_statement: e.target.value }))}
                  placeholder="Describe the problem in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Easy (1)</SelectItem>
                      <SelectItem value="2">Easy-Medium (2)</SelectItem>
                      <SelectItem value="3">Medium (3)</SelectItem>
                      <SelectItem value="4">Medium-Hard (4)</SelectItem>
                      <SelectItem value="5">Hard (5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languages">Supported Languages</Label>
                  <Select 
                    value={formData.supported_languages[0]} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supported_languages: [value] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Question Image (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                onImageUploaded={setImageUrl}
                currentImageUrl={imageUrl}
                label="Upload question image"
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag (e.g., arrays, strings, dynamic-programming)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tags && tags.trim() && (
                <div className="flex flex-wrap gap-2">
                  {tags.split(',').map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag.trim()}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag.trim())}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Cases *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {testCases.map((testCase, index) => (
                <div key={testCase.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Test Case {index + 1}</h4>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeTestCase(testCase.id)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Input</Label>
                      <Textarea
                        value={testCase.input}
                        onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                        placeholder="Test input"
                        rows={2}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Output</Label>
                      <Textarea
                        value={testCase.expected_output}
                        onChange={(e) => updateTestCase(testCase.id, 'expected_output', e.target.value)}
                        placeholder="Expected output"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`public-${testCase.id}`}
                      checked={testCase.is_public}
                      onChange={(e) => updateTestCase(testCase.id, 'is_public', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`public-${testCase.id}`} className="text-sm">
                      Make this test case public (visible to students)
                    </Label>
                  </div>
                </div>
              ))}
              
              <Button type="button" onClick={addTestCase} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Test Case
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
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
