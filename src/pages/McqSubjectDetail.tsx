import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Play, FileText, Hash, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface McqSubject {
  id: string;
  name: string;
  description: string | null;
}

interface McqConcept {
  id: string;
  name: string;
  description: string | null;
  question_count?: number;
}

const McqSubjectDetail = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subject, setSubject] = useState<McqSubject | null>(null);
  const [concepts, setConcepts] = useState<McqConcept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) {
      navigate('/mcq');
      return;
    }

    const loadSubjectData = async () => {
      try {
        // Load user and profile
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        setProfile(profileData);

        // Load subject
        const { data: subjectData, error: subjectError } = await supabase
          .from('mcq_subjects')
          .select('id, name, description')
          .eq('id', subjectId)
          .eq('status', 'active')
          .single();

        if (subjectError) throw subjectError;
        if (!subjectData) {
          toast({
            title: "Subject not found",
            description: "The subject you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate('/mcq');
          return;
        }

        setSubject(subjectData);

        // Load concepts
        const { data: conceptsData, error: conceptsError } = await supabase
          .from('mcq_concepts')
          .select('id, name, description')
          .eq('subject_id', subjectId)
          .order('name');

        if (conceptsError) throw conceptsError;

        // Get question counts for each concept
        const conceptsWithCounts = await Promise.all(
          (conceptsData || []).map(async (concept) => {
            const { count, error: countError } = await supabase
              .from('mcq_questions')
              .select('*', { count: 'exact', head: true })
              .eq('concept_id', concept.id);
            
            if (countError) {
              console.error('Error counting questions for concept:', concept.id, countError);
            }
            
            return {
              ...concept,
              question_count: count || 0,
            };
          })
        );

        setConcepts(conceptsWithCounts);

      } catch (error: any) {
        console.error('Error loading subject:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load subject",
          variant: "destructive",
        });
        navigate('/mcq');
      } finally {
        setLoading(false);
      }
    };

    loadSubjectData();
  }, [subjectId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader studentName={profile?.full_name || user?.email || "Student"} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!subject) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Student"} />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/mcq')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to MCQ Dashboard
          </Button>

          {/* Subject Header */}
          <Card className="bg-card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-foreground mb-2">
                    {subject.name}
                  </CardTitle>
                  {subject.description && (
                    <CardDescription className="text-base mt-2">
                      {subject.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  MCQ Subject
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Concepts Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Concepts
              </h2>
              <Badge variant="secondary">
                {concepts.length} {concepts.length === 1 ? 'Concept' : 'Concepts'}
              </Badge>
            </div>

            {concepts.length === 0 ? (
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  No concepts available for this subject yet. Check back later!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {concepts.map((concept) => (
                  <Card
                    key={concept.id}
                    className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 bg-card-gradient cursor-pointer"
                    onClick={() => navigate(`/mcq/concept/${concept.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {concept.name}
                        </CardTitle>
                        {concept.question_count > 0 && (
                          <Badge variant="outline">
                            {concept.question_count} {concept.question_count === 1 ? 'Question' : 'Questions'}
                          </Badge>
                        )}
                      </div>
                      {concept.description && (
                        <CardDescription className="mt-2">
                          {concept.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <FileText className="mr-2 h-4 w-4" />
                          {concept.question_count || 0} questions
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Navigate to concept practice/test
                            toast({
                              title: "Coming Soon",
                              description: "Concept-based practice mode will be available soon!",
                            });
                          }}
                        >
                          Practice
                          <Play className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">About This Subject</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore concepts, practice questions, and take tests to master {subject.name}.
                    Click on a concept card to see available questions and practice options.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default McqSubjectDetail;

