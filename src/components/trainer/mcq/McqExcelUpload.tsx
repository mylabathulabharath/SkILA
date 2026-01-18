import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface McqExcelUploadProps {
  onQuestionsAdded: () => void;
}

interface ParsedMcqData {
  subject: string;
  concept: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  difficulty: string;
  marks: number;
  tags: string;
  errors?: string[];
}

export const McqExcelUpload = ({ onQuestionsAdded }: McqExcelUploadProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedMcqData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create sample data with headers and example rows
    const templateData = [
      // Header row
      ['Subject', 'Concept', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Difficulty', 'Marks', 'Tags'],
      // Example row 1
      ['Mathematics', 'Algebra', 'What is 2 + 2?', '3', '4', '5', '6', 'B', 'Easy', '1', 'basic, arithmetic'],
      // Example row 2
      ['Science', 'Physics', 'What is the speed of light?', '300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s', 'A', 'Medium', '2', 'physics, constants'],
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MCQ Questions');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // Subject
      { wch: 15 }, // Concept
      { wch: 40 }, // Question
      { wch: 20 }, // Option A
      { wch: 20 }, // Option B
      { wch: 20 }, // Option C
      { wch: 20 }, // Option D
      { wch: 15 }, // Correct Option
      { wch: 12 }, // Difficulty
      { wch: 8 },  // Marks
      { wch: 25 }, // Tags
    ];

    // Generate Excel file and download
    XLSX.writeFile(workbook, 'MCQ_Questions_Template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Sample template downloaded successfully. Fill in your questions and upload.",
    });
  };

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
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '', 
        raw: false 
      }) as any[][];

      if (jsonData.length < 2) {
        setErrors(['Excel file must have at least a header row and one data row']);
        return;
      }

      const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim() || '');
      const requiredHeaders = ['subject', 'concept', 'question', 'option a', 'option b', 'option c', 'option d', 'correct option', 'difficulty', 'marks'];
      
      // Flexible header matching - check exact matches first, then partial
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        const headerLower = h.toLowerCase().trim();
        // Exact matches first
        if (headerLower === 'subject') headerMap['subject'] = i;
        else if (headerLower === 'concept') headerMap['concept'] = i;
        else if (headerLower === 'question') headerMap['question'] = i;
        else if (headerLower === 'option a' || headerLower === 'optiona') headerMap['optionA'] = i;
        else if (headerLower === 'option b' || headerLower === 'optionb') headerMap['optionB'] = i;
        else if (headerLower === 'option c' || headerLower === 'optionc') headerMap['optionC'] = i;
        else if (headerLower === 'option d' || headerLower === 'optiond') headerMap['optionD'] = i;
        else if (headerLower === 'correct option' || headerLower === 'correctoption') headerMap['correctOption'] = i;
        else if (headerLower === 'difficulty') headerMap['difficulty'] = i;
        else if (headerLower === 'marks' || headerLower === 'mark') headerMap['marks'] = i;
        else if (headerLower === 'tags' || headerLower === 'tag') headerMap['tags'] = i;
        // Partial matches as fallback
        else if (!headerMap['subject'] && headerLower.includes('subject')) headerMap['subject'] = i;
        else if (!headerMap['concept'] && headerLower.includes('concept')) headerMap['concept'] = i;
        else if (!headerMap['question'] && headerLower.includes('question')) headerMap['question'] = i;
        else if (!headerMap['optionA'] && headerLower.includes('option') && (headerLower.includes('a') || headerLower.endsWith(' a'))) headerMap['optionA'] = i;
        else if (!headerMap['optionB'] && headerLower.includes('option') && (headerLower.includes('b') || headerLower.endsWith(' b'))) headerMap['optionB'] = i;
        else if (!headerMap['optionC'] && headerLower.includes('option') && (headerLower.includes('c') || headerLower.endsWith(' c'))) headerMap['optionC'] = i;
        else if (!headerMap['optionD'] && headerLower.includes('option') && (headerLower.includes('d') || headerLower.endsWith(' d'))) headerMap['optionD'] = i;
        else if (!headerMap['correctOption'] && headerLower.includes('correct')) headerMap['correctOption'] = i;
        else if (!headerMap['difficulty'] && headerLower.includes('difficulty')) headerMap['difficulty'] = i;
        else if (!headerMap['marks'] && headerLower.includes('mark')) headerMap['marks'] = i;
        else if (!headerMap['tags'] && headerLower.includes('tag')) headerMap['tags'] = i;
      });

      // Validate that required headers were found
      const missingHeaders: string[] = [];
      if (headerMap['subject'] === undefined) missingHeaders.push('Subject');
      if (headerMap['concept'] === undefined) missingHeaders.push('Concept');
      if (headerMap['question'] === undefined) missingHeaders.push('Question');
      if (headerMap['correctOption'] === undefined) missingHeaders.push('Correct Option');
      
      if (missingHeaders.length > 0) {
        console.error('Headers found:', headers);
        console.error('Header map:', headerMap);
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}. Please check your Excel file format.`]);
        setLoading(false);
        return;
      }

      const parsed: ParsedMcqData[] = [];
      const validationErrors: string[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row[headerMap['question']]) continue; // Skip empty rows

        const rowErrors: string[] = [];
        
        // Safely extract correct option with better handling
        const correctOptionIndex = headerMap['correctOption'];
        const correctOptionRaw = correctOptionIndex !== undefined ? row[correctOptionIndex] : undefined;
        let correctOption = '';
        if (correctOptionRaw !== undefined && correctOptionRaw !== null && correctOptionRaw !== '') {
          correctOption = String(correctOptionRaw).trim().toUpperCase();
          // Handle if it's a number (1, 2, 3, 4) instead of letter
          if (correctOption === '1') correctOption = 'A';
          else if (correctOption === '2') correctOption = 'B';
          else if (correctOption === '3') correctOption = 'C';
          else if (correctOption === '4') correctOption = 'D';
        }
        
        // Debug logging for first row
        if (i === 1) {
          console.log('Row data:', row);
          console.log('Correct option index:', correctOptionIndex);
          console.log('Correct option raw value:', correctOptionRaw);
          console.log('Correct option processed:', correctOption);
        }
        
        // Parse tags - can be comma or semicolon separated
        const tagsRaw = headerMap['tags'] !== undefined ? row[headerMap['tags']]?.toString().trim() : '';
        const tags = tagsRaw 
          ? tagsRaw.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0)
          : [];

        const questionData: ParsedMcqData = {
          subject: row[headerMap['subject']]?.toString().trim() || '',
          concept: row[headerMap['concept']]?.toString().trim() || '',
          question: row[headerMap['question']]?.toString().trim() || '',
          optionA: row[headerMap['optionA']]?.toString().trim() || '',
          optionB: row[headerMap['optionB']]?.toString().trim() || '',
          optionC: row[headerMap['optionC']]?.toString().trim() || '',
          optionD: row[headerMap['optionD']]?.toString().trim() || '',
          correctOption: correctOption,
          difficulty: row[headerMap['difficulty']]?.toString().trim() || 'Medium',
          marks: parseInt(row[headerMap['marks']]?.toString() || '1') || 1,
          tags: tagsRaw,
        };

        // Validation
        if (!questionData.subject) rowErrors.push('Subject is required');
        if (!questionData.concept) rowErrors.push('Concept is required');
        if (!questionData.question) rowErrors.push('Question is required');
        if (!questionData.optionA && !questionData.optionB && !questionData.optionC && !questionData.optionD) {
          rowErrors.push('At least one option is required');
        }
        if (!['A', 'B', 'C', 'D'].includes(questionData.correctOption)) {
          rowErrors.push('Correct option must be A, B, C, or D');
        }

        if (rowErrors.length > 0) {
          questionData.errors = rowErrors;
          validationErrors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
        }

        parsed.push(questionData);
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      setParsedData(parsed);

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
      const errorMessages: string[] = [];

      for (let i = 0; i < parsedData.length; i++) {
        const q = parsedData[i];
        if (q.errors && q.errors.length > 0) {
          errorCount++;
          continue;
        }

        try {
          // Get or create subject
          let { data: subject } = await supabase
            .from('mcq_subjects')
            .select('id')
            .eq('name', q.subject)
            .eq('status', 'active')
            .single();

          if (!subject) {
            const { data: newSubject, error: subjectError } = await supabase
              .from('mcq_subjects')
              .insert({
                name: q.subject,
                status: 'active',
                created_by: user.id
              })
              .select()
              .single();

            if (subjectError) throw subjectError;
            subject = newSubject;
          }

          // Get or create concept
          let { data: concept } = await supabase
            .from('mcq_concepts')
            .select('id')
            .eq('subject_id', subject.id)
            .eq('name', q.concept)
            .single();

          if (!concept) {
            const { data: newConcept, error: conceptError } = await supabase
              .from('mcq_concepts')
              .insert({
                subject_id: subject.id,
                name: q.concept
              })
              .select()
              .single();

            if (conceptError) throw conceptError;
            concept = newConcept;
          }

          // Parse tags from string
          const tags = q.tags 
            ? q.tags.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0)
            : [];

          // Create question
          const { data: question, error: questionError } = await supabase
            .from('mcq_questions')
            .insert({
              subject_id: subject.id,
              concept_id: concept.id,
              question_text: q.question,
              difficulty: q.difficulty as any,
              marks: q.marks,
              negative_marks: 0,
              tags: tags.length > 0 ? tags : null,
              created_by: user.id
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Create options
          const options = [
            { text: q.optionA, isCorrect: q.correctOption === 'A' },
            { text: q.optionB, isCorrect: q.correctOption === 'B' },
            { text: q.optionC, isCorrect: q.correctOption === 'C' },
            { text: q.optionD, isCorrect: q.correctOption === 'D' },
          ].filter(opt => opt.text); // Only include non-empty options

          const optionsData = options.map((opt, index) => ({
            question_id: question.id,
            option_text: opt.text,
            is_correct: opt.isCorrect,
            order_index: index
          }));

          const { error: optionsError } = await supabase
            .from('mcq_options')
            .insert(optionsData);

          if (optionsError) throw optionsError;

          successCount++;
        } catch (error: any) {
          console.error(`Error processing row ${i + 1}:`, error);
          errorCount++;
          errorMessages.push(`Row ${i + 1}: ${error.message || 'Failed to create question'}`);
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
        setErrors([]);
        onQuestionsAdded();
      } else if (errorMessages.length > 0) {
        setErrors(errorMessages);
      }

    } catch (error: any) {
      console.error('Error uploading questions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Upload MCQ Questions (Excel)</h3>
                <p className="text-sm text-muted-foreground">Bulk upload questions from Excel</p>
              </div>
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload MCQ Questions from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Sample Template
            </Button>
          </div>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="mcq-excel-upload"
            />
            <label
              htmlFor="mcq-excel-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to select Excel file
              </span>
              <span className="text-xs text-muted-foreground">
                Format: Subject | Concept | Question | Option A | Option B | Option C | Option D | Correct Option (A/B/C/D) | Difficulty | Marks | Tags (comma-separated)
              </span>
            </label>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">
                  Found {parsedData.length} questions
                </p>
                <Button onClick={handleUpload} disabled={loading}>
                  {loading ? "Uploading..." : `Upload ${parsedData.filter(q => !q.errors).length} Questions`}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Subject</th>
                      <th className="p-2 text-left">Concept</th>
                      <th className="p-2 text-left">Question</th>
                      <th className="p-2 text-left">Tags</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((q, index) => (
                      <tr key={index} className={q.errors ? "bg-red-50" : ""}>
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">{q.subject}</td>
                        <td className="p-2">{q.concept}</td>
                        <td className="p-2 truncate max-w-xs">{q.question}</td>
                        <td className="p-2 text-xs text-muted-foreground">{q.tags || '-'}</td>
                        <td className="p-2">
                          {q.errors ? (
                            <span className="text-red-600 text-xs">Error</span>
                          ) : (
                            <span className="text-green-600 text-xs">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

