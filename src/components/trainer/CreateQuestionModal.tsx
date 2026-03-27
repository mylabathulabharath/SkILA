import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Tag, Image as ImageIcon, Eye, Edit3, Sparkles, List, ListOrdered, Code, Link as LinkIcon, Table, Loader2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { QuestionPanel } from "../exam/QuestionPanel";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRef } from "react";

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

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sync image URL from state to form data if needed, but we typically use them separately
  // console.log("Current Form Stat:", { title: formData.title, image: imageUrl });

  const insertMarkdown = (prefix: string, suffix: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setFormData(prev => ({ ...prev, problem_statement: newText }));

    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  const loadMagicTemplate = () => {
    const template =
      `# Problem Title

## Problem Description
Briefly describe the challenge here. What is the core logic the student needs to solve?

---

## Input Format
- **Line 1:** Describe the first part of the input.
- **Line 2:** Describe the second part, and so on.

---

## Output Format
- Describe exactly what the student should print or return.

---

## Constraints
- **1 <= N <= 10^5**
- **Time Limit:** 1.0s
- **Memory Limit:** 256MB

---

## Example Input:
\`\`\`
Sample data here...
\`\`\`

## Example Output:
\`\`\`
Expected result here...
\`\`\``;

    setFormData(prev => ({ ...prev, problem_statement: template }));
    toast({
      title: "Magic Blueprint Applied!",
      description: "We've pre-filled a professional structure for you.",
    });
  };

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

      // Prepare tags as array
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== "");

      // Create question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          title: formData.title,
          problem_statement: formData.problem_statement,
          difficulty: parseInt(formData.difficulty),
          supported_languages: formData.supported_languages,
          tags: tagsArray,
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
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="h-12 w-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Create Question
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Design premium coding challenges with markdown support
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            <Edit3 className="h-6 w-6 text-primary" />
            Create Premium Question
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <form onSubmit={handleSubmit} className="space-y-8 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form Fields */}
              <div className="space-y-6">
                {/* Basic Information */}
                <Card className="border-0 bg-muted/30 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      General Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Question Title *</Label>
                      <Input
                        id="title"
                        className="bg-background/50 focus-visible:ring-primary"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Optimal Path in a Weighted Graph"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="difficulty" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Difficulty Level</Label>
                        <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Easy</SelectItem>
                            <SelectItem value="2">Easy-Medium</SelectItem>
                            <SelectItem value="3">Medium</SelectItem>
                            <SelectItem value="4">Medium-Hard</SelectItem>
                            <SelectItem value="5">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languages" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Primary Language</Label>
                        <Select
                          value={formData.supported_languages[0]}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, supported_languages: [value] }))}
                        >
                          <SelectTrigger className="bg-background/50">
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

                {/* Problem Statement with Formatting Toolbar */}
                <Card className="border-0 bg-muted/30 shadow-none overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-md flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        Problem Statement *
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-mono">RICH FORMATTING</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-1 px-4 py-2 border-b bg-background/50 overflow-x-auto scrollbar-hide">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('**', '**')}
                        title="Bold"
                      >
                        <span className="font-bold">B</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 italic"
                        onClick={() => insertMarkdown('*', '*')}
                        title="Italic"
                      >
                        <span>I</span>
                      </Button>
                      <div className="w-px h-4 bg-muted-foreground/20 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('# ', '')}
                        title="Heading"
                      >
                        <h3 className="font-bold text-sm">H1</h3>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('## ', '')}
                        title="Heading 2"
                      >
                        <h4 className="font-bold text-xs">H2</h4>
                      </Button>
                      <div className="w-px h-4 bg-muted-foreground/20 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('\n- ', '')}
                        title="List"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('\n1. ', '')}
                        title="Numbered List"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-4 bg-muted-foreground/20 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 font-mono"
                        onClick={() => insertMarkdown('`', '`')}
                        title="Inline Code"
                      >
                        <span className="text-xs">{"<>"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('\n```\n', '\n```\n')}
                        title="Code Block"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-4 bg-muted-foreground/20 mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => insertMarkdown('| Header | Header |\n| --- | --- |\n| Cell | Cell |', '')}
                        title="Table"
                      >
                        <Table className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-4 bg-muted-foreground/20 mx-1" />

                      {/* Magic Template Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all ml-auto flex items-center gap-2 rounded-lg"
                        onClick={loadMagicTemplate}
                        title="Load Blueprint Template"
                      >
                        <Sparkles className="h-3 w-3" />
                        Magic Blueprint
                      </Button>
                    </div>

                    <Textarea
                      id="problem_statement"
                      ref={textAreaRef}
                      className="min-h-[350px] bg-background/50 font-mono text-sm leading-relaxed resize-none focus-visible:ring-primary border-0 shadow-none ring-0 placeholder:italic p-4"
                      value={formData.problem_statement}
                      onChange={(e) => setFormData(prev => ({ ...prev, problem_statement: e.target.value }))}
                      placeholder="# Problem Title\n\n## Description\nExplain the logic here...\n\n### Constraints\n- 1 <= n <= 100"
                      required
                    />
                  </CardContent>
                </Card>

                {/* Image Upload */}
                <Card className="border-0 bg-muted/30 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      Visual Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUpload
                      onImageUploaded={setImageUrl}
                      currentImageUrl={imageUrl}
                      label="Upload Question Image (e.g., Graph/Tree/Matrix)"
                    />
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card className="border-0 bg-muted/30 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      Taxonomy & Discovery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="e.g., dynamic-programming, bts, greedy"
                        className="bg-background/50"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} variant="secondary" className="px-3">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {tags && tags.trim() && (
                      <div className="flex flex-wrap gap-2">
                        {tags.split(',').map((tag, index) => (
                          <Badge key={index} variant="secondary" className="group/badge bg-background/50 hover:bg-primary/10 transition-colors py-1 pl-3 pr-2 flex items-center gap-2">
                            <span className="text-xs font-medium">{tag.trim()}</span>
                            <X
                              className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => removeTag(tag.trim())}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Preview & Test Cases */}
              <div className="space-y-6">
                <div className="sticky top-0 space-y-6">
                  {/* Full Preview Tile */}
                  <Card className="border border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
                    <CardHeader className="py-3 bg-primary/10 border-b border-primary/10">
                      <CardTitle className="text-xs uppercase font-extrabold tracking-[0.2em] text-primary flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Live Student Preview
                      </CardTitle>
                    </CardHeader>
                    <div className="p-0 h-[500px] overflow-hidden relative">
                      <div className="absolute inset-0 scale-[0.95] transform-gpu origin-top">
                        <QuestionPanel
                          question={{
                            id: "preview-id",
                            title: formData.title || "Question Title Placeholder",
                            problem_statement: formData.problem_statement || "Problem statement will appear here...",
                            difficulty: formData.difficulty,
                            image_url: imageUrl,
                            testCases: testCases.map(tc => ({
                              input: tc.input,
                              output: tc.expected_output,
                              explanation: "Mock explanation for preview"
                            }))
                          }}
                        />

                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                    </div>
                  </Card>

                  {/* Test Cases */}
                  <Card className="border-0 bg-muted/10 shadow-none border-l-2 border-l-primary/30 rounded-none">
                    <CardHeader className="pb-3 border-b border-muted">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-md font-bold">Standard Test Cases</CardTitle>
                        <Button type="button" onClick={addTestCase} variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Case
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4 overflow-y-auto max-h-[400px] scrollbar-thin">
                      {testCases.map((testCase, index) => (
                        <div key={testCase.id} className="relative group/case bg-background/50 rounded-xl p-4 border border-transparent hover:border-primary/20 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-2 border-l-2 border-primary">Case #{index + 1}</h4>
                            {testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTestCase(testCase.id)}
                                className="p-1.5 opacity-0 group-hover/case:opacity-100 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Input</Label>
                              <Textarea
                                value={testCase.input}
                                onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                                className="bg-muted/30 border-0 focus-visible:ring-1 min-h-[60px] font-mono text-xs"
                                placeholder="Input data..."
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Output</Label>
                              <Textarea
                                value={testCase.expected_output}
                                onChange={(e) => updateTestCase(testCase.id, 'expected_output', e.target.value)}
                                className="bg-muted/30 border-0 focus-visible:ring-1 min-h-[60px] font-mono text-xs"
                                placeholder="Expected result..."
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-muted/50">
                            <input
                              type="checkbox"
                              id={`public-${testCase.id}`}
                              checked={testCase.is_public}
                              onChange={(e) => updateTestCase(testCase.id, 'is_public', e.target.checked)}
                              className="rounded-sm border-muted-foreground/30 accent-primary"
                            />
                            <Label htmlFor={`public-${testCase.id}`} className="text-[10px] font-medium text-muted-foreground cursor-pointer">
                              VISIBLE AS SAMPLE TO STUDENTS
                            </Label>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Actions Footer */}
        <div className="p-4 border-t bg-background/80 backdrop-blur-md flex justify-end gap-3 px-8">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-full px-6">
            Discard Changes
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full px-8 bg-gradient-to-r from-primary to-indigo-600 hover:shadow-lg transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Publishing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Deploy Question
                <Sparkles className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

