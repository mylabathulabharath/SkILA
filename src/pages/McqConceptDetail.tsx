import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface McqConcept {
  id: string;
  name: string;
  description: string | null;
  subject_id: string;
}

interface McqSubject {
  id: string;
  name: string;
}

interface McqQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  explanation: string | null;
}

const McqConceptDetail = () => {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [concept, setConcept] = useState<McqConcept | null>(null);
  const [subject, setSubject] = useState<McqSubject | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conceptId) {
      navigate('/mcq');
      return;
    }

    const loadConceptData = async () => {
      try {
        // Load concept with subject info
        const { data: conceptData, error: conceptError } = await supabase
          .from('mcq_concepts')
          .select(`
            id,
            name,
            description,
            subject_id,
            mcq_subjects!inner (
              id,
              name
            )
          `)
          .eq('id', conceptId)
          .single();

        if (conceptError) throw conceptError;
        if (!conceptData) {
          toast({
            title: "Concept not found",
            description: "The concept you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate('/mcq');
          return;
        }

        setConcept({
          id: conceptData.id,
          name: conceptData.name,
          description: conceptData.description,
          subject_id: (conceptData.mcq_subjects as any).id,
        });
        setSubject({
          id: (conceptData.mcq_subjects as any).id,
          name: (conceptData.mcq_subjects as any).name,
        });

        // Load questions for this concept
        const { data: questionsData, error: questionsError } = await supabase
          .from('mcq_questions')
          .select('id, question_text, difficulty, marks, explanation')
          .eq('concept_id', conceptId)
          .order('created_at', { ascending: false });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

      } catch (error: any) {
        console.error('Error loading concept:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load concept",
          variant: "destructive",
        });
        navigate('/mcq');
      } finally {
        setLoading(false);
      }
    };

    loadConceptData();
  }, [conceptId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!concept || !subject) {
    return null;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/mcq/subject/${subject.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {subject.name}
          </Button>

          {/* Concept Header */}
          <Card className="bg-card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-foreground mb-2">
                    {concept.name}
                  </CardTitle>
                  {concept.description && (
                    <CardDescription className="text-base mt-2">
                      {concept.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Questions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questions
              </h2>
            </div>

            {questions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No questions available for this concept yet. Check back later!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className="bg-card-gradient">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Q{index + 1}
                            </span>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline">
                              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg font-semibold text-foreground">
                            {question.question_text}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    {question.explanation && (
                      <CardContent>
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default McqConceptDetail;

