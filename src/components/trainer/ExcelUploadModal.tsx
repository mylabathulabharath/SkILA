import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import * as XLSX from 'xlsx';

interface QuestionData {
  title: string;
  problem_statement: string;
  difficulty: number;
  supported_languages: string[];
  tags: string | null;
  test_cases: {
    input: string;
    expected_output: string;
    is_public: boolean;
  }[];
}

interface ExcelUploadModalProps {
  onQuestionsAdded: () => void;
}

export const ExcelUploadModal = ({ onQuestionsAdded }: ExcelUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<QuestionData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      setLoading(true);
      setErrors([]);
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        setErrors(['Excel file must have at least a header row and one data row']);
        return;
      }

      const headers = jsonData[0] as string[];
      const requiredHeaders = ['Title', 'Problem Statement', 'Difficulty', 'Languages', 'Tags'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
        return;
      }

      const questions: QuestionData[] = [];
      const validationErrors: string[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row[0]) continue; // Skip empty rows

        try {
          const question: QuestionData = {
            title: row[0]?.toString().trim() || '',
            problem_statement: row[1]?.toString().trim() || '',
            difficulty: parseInt(row[2]) || 1,
            supported_languages: row[3]?.toString().split(',').map((lang: string) => lang.trim()) || ['python'],
            tags: row[4]?.toString().trim() || '',
            test_cases: []
          };

          // Validate difficulty
          if (question.difficulty < 1 || question.difficulty > 5) {
            validationErrors.push(`Row ${i + 1}: Difficulty must be between 1 and 5`);
          }

          // Parse test cases from remaining columns
          for (let j = 5; j < row.length; j += 3) {
            if (row[j] && row[j + 1]) {
              question.test_cases.push({
                input: row[j]?.toString().trim() || '',
                expected_output: row[j + 1]?.toString().trim() || '',
                is_public: row[j + 2]?.toString().toLowerCase() === 'true' || false
              });
            }
          }

          if (question.test_cases.length === 0) {
            validationErrors.push(`Row ${i + 1}: At least one test case is required`);
          }

          questions.push(question);
        } catch (error) {
          validationErrors.push(`Row ${i + 1}: Invalid data format`);
        }
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setParsedData(questions);
      setPreviewMode(true);
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setErrors(['Failed to parse Excel file. Please check the format.']);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let successCount = 0;
      let errorCount = 0;

      for (const questionData of parsedData) {
        try {
          // Create question
          const { data: question, error: questionError } = await supabase
            .from('questions')
            .insert({
              title: questionData.title,
              problem_statement: questionData.problem_statement,
              difficulty: questionData.difficulty,
              supported_languages: questionData.supported_languages,
              tags: questionData.tags,
              created_by: user.id
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Create test cases
          if (questionData.test_cases.length > 0) {
            const testCases = questionData.test_cases.map((tc, index) => ({
              question_id: question.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_public: tc.is_public,
              order_index: index
            }));

            const { error: testCasesError } = await supabase
              .from('question_test_cases')
              .insert(testCases);

            if (testCasesError) throw testCasesError;
          }

          successCount++;
        } catch (error) {
          console.error('Error creating question:', error);
          errorCount++;
        }
      }

      toast({
        title: "Upload Complete",
        description: `Successfully added ${successCount} questions. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        setOpen(false);
        setFile(null);
        setParsedData([]);
        setPreviewMode(false);
        onQuestionsAdded();
      }

    } catch (error) {
      console.error('Error uploading questions:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Title', 'Problem Statement', 'Difficulty', 'Languages', 'Tags', 'Test Case 1 Input', 'Test Case 1 Output', 'Test Case 1 Public', 'Test Case 2 Input', 'Test Case 2 Output', 'Test Case 2 Public'],
      ['Two Sum', 'Given an array of integers, return indices of the two numbers such that they add up to target.', '2', 'python,java,cpp', 'arrays,hash-table', '[2,7,11,15]', '[0,1]', 'true', '[3,2,4]', '[1,2]', 'false'],
      ['Reverse String', 'Write a function that reverses a string.', '1', 'python,java', 'strings', 'hello', 'olleh', 'true', 'world', 'dlrow', 'true']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_template.xlsx');
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setPreviewMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  Upload Questions
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">
              Bulk upload from Excel files
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Questions from Excel
          </DialogTitle>
        </DialogHeader>

        {!previewMode ? (
          <div className="space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload an Excel file with questions and test cases. Download the template to see the required format.
                </p>
                <div className="space-y-2">
                  <h4 className="font-medium">Required Columns:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• <strong>Title:</strong> Question title</li>
                    <li>• <strong>Problem Statement:</strong> Full problem description</li>
                    <li>• <strong>Difficulty:</strong> 1-5 (1=Easy, 5=Hard)</li>
                    <li>• <strong>Languages:</strong> Comma-separated (python,java,cpp)</li>
                    <li>• <strong>Tags:</strong> Comma-separated tags for categorization</li>
                    <li>• <strong>Test Cases:</strong> Input, Output, Public (true/false) columns</li>
                  </ul>
                </div>
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="excel-file">Select Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={loading}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Validation Errors</span>
                  </div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview ({parsedData.length} questions)</h3>
                <Button onClick={resetForm} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Change File
                </Button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parsedData.map((question, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{question.title}</CardTitle>
                        <Badge variant="outline">Difficulty: {question.difficulty}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {question.problem_statement}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">Languages:</span>
                          {question.supported_languages.map((lang, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">Tags:</span>
                          {question.tags && question.tags.trim() && (
                            <span className="text-xs text-muted-foreground">
                              {question.tags}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {question.test_cases.length} test case(s)
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button onClick={resetForm} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? "Uploading..." : `Upload ${parsedData.length} Questions`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
