import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, TrendingUp, CheckCircle, Play, FileText, Home, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface McqSubject {
  id: string;
  name: string;
  description: string | null;
}

interface UpcomingMcqTest {
  id: string;
  title: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  batch_name: string;
  subject_name: string;
}

const McqDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<McqSubject[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<UpcomingMcqTest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        setUser(user);

        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // Load active subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('mcq_subjects')
          .select('id, name, description')
          .eq('status', 'active')
          .order('name');

        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);

        // Load upcoming tests
        const { data: testsData, error: testsError } = await supabase
          .from('vw_upcoming_mcq_tests')
          .select('*')
          .gte('end_at', new Date().toISOString())
          .order('start_at');

        if (testsError) throw testsError;
        setUpcomingTests(testsData || []);

      } catch (error: any) {
        console.error('Error loading MCQ dashboard:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-subtle-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Student"} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">MCQ Assessments</h1>
              <p className="text-muted-foreground">
                Practice and take multiple choice question tests
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{subjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  Subjects to explore
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Tests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{upcomingTests.length}</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled assessments
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/mcq/practice')}
                  variant="default"
                >
                  Start Practice
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Subjects Grid */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Subjects</h2>
            {subjects.length === 0 ? (
              <Card className="bg-card-gradient shadow-card">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Subjects Available</h3>
                  <p className="text-muted-foreground">
                    Check back later for new MCQ subjects
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <Card 
                    key={subject.id}
                    className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card-gradient"
                    onClick={() => navigate(`/mcq/subject/${subject.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {subject.name}
                        </CardTitle>
                        <Badge variant="outline">MCQ</Badge>
                      </div>
                      {subject.description && (
                        <CardDescription className="mt-2">
                          {subject.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/mcq/subject/${subject.id}`);
                        }}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Explore Subject
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Tests */}
          {upcomingTests.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Upcoming Tests</h2>
              <div className="space-y-4">
                {upcomingTests.map((test) => {
                  const startDate = new Date(test.start_at);
                  const endDate = new Date(test.end_at);
                  const now = new Date();
                  const isAvailable = now >= startDate && now <= endDate;
                  
                  return (
                    <Card key={test.id} className="bg-card-gradient shadow-card">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl font-semibold text-foreground mb-2">
                              {test.title}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="secondary">{test.subject_name}</Badge>
                              <Badge variant="outline">{test.batch_name}</Badge>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {test.duration_minutes} min
                              </Badge>
                            </div>
                            <CardDescription>
                              Starts: {startDate.toLocaleString()}<br />
                              Ends: {endDate.toLocaleString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {isAvailable ? (
                            <Button 
                              className="flex-1"
                              onClick={() => navigate(`/mcq/test/${test.id}`)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Start Test
                            </Button>
                          ) : (
                            <Button 
                              className="flex-1"
                              variant="outline"
                              disabled
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {now < startDate ? 'Not Started' : 'Expired'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default McqDashboard;

