import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Users, 
  BookOpen, 
  ClipboardList,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  BarChart3,
  FileText,
  Upload,
  Settings,
  Eye,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { CreateExamModal } from "@/components/trainer/CreateExamModal";
import { CreateQuestionModal } from "@/components/trainer/CreateQuestionModal";
import { ExcelUploadModal } from "@/components/trainer/ExcelUploadModal";
import { CreateMcqQuestionModal } from "@/components/trainer/mcq/CreateMcqQuestionModal";
import { McqExcelUpload } from "@/components/trainer/mcq/McqExcelUpload";
import { CreateMcqTestModal } from "@/components/trainer/mcq/CreateMcqTestModal";
import { ExistingExams } from "@/components/trainer/ExistingExams";
import { BatchManagement } from "@/components/trainer/BatchManagement";
import ExamResultsView from "@/components/trainer/ExamResultsView";
import McqResultsView from "@/components/trainer/mcq/McqResultsView";

interface TrainerStats {
  totalStudents: number;
  totalQuestions: number;
  totalTests: number;
  activeTests: number;
}

interface RecentActivity {
  type: 'test_created' | 'question_added' | 'student_assigned';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

const TrainerDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleExamCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh stats when new exams are created
    if (user) {
      fetchTrainerStats(user.id);
      fetchRecentActivity(user.id);
    }
  };

  const handleQuestionCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refresh stats when new questions are created
    if (user) {
      fetchTrainerStats(user.id);
      fetchRecentActivity(user.id);
    }
  };

  const handleRefresh = async () => {
    if (user) {
      setLoading(true);
      try {
        await Promise.all([
          fetchTrainerStats(user.id),
          fetchRecentActivity(user.id)
        ]);
        setRefreshTrigger(prev => prev + 1);
        toast({
          title: "Success",
          description: "Dashboard refreshed successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to refresh dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchTrainerStats = async (userId: string) => {
    try {
      // Fetch total students from batches created by trainer
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .eq('created_by', userId);

      const batchIds = batches?.map(b => b.id) || [];
      let totalStudents = 0;

      if (batchIds.length > 0) {
        const { data: batchMembers } = await supabase
          .from('batch_members')
          .select('user_id')
          .in('batch_id', batchIds);
        
        totalStudents = batchMembers?.length || 0;
      }

      // Fetch total questions created by trainer
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('created_by', userId);

      // Fetch total tests created by trainer
      const { data: tests } = await supabase
        .from('tests')
        .select('id, created_at')
        .eq('created_by', userId);

      // Fetch active tests (tests with assignments that are currently active)
      const testIds = tests?.map(t => t.id) || [];
      let activeTests = 0;

      if (testIds.length > 0) {
        const now = new Date().toISOString();
        const { data: activeAssignments } = await supabase
          .from('test_assignments')
          .select('test_id')
          .in('test_id', testIds)
          .lte('start_at', now)
          .gte('end_at', now);

        activeTests = activeAssignments?.length || 0;
      }

      setStats({
        totalStudents,
        totalQuestions: questions?.length || 0,
        totalTests: tests?.length || 0,
        activeTests
      });
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      // Fallback to mock data if there's an error
      setStats({
        totalStudents: 0,
        totalQuestions: 0,
        totalTests: 0,
        activeTests: 0
      });
    }
  };

  const fetchRecentActivity = async (userId: string) => {
    try {
      const activities: RecentActivity[] = [];

      // Fetch recent tests
      const { data: recentTests } = await supabase
        .from('tests')
        .select('id, name, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentTests) {
        recentTests.forEach(test => {
          activities.push({
            type: 'test_created',
            title: test.name,
            description: 'Created new test',
            timestamp: formatTimeAgo(test.created_at),
            status: 'active'
          });
        });
      }

      // Fetch recent questions
      const { data: recentQuestions } = await supabase
        .from('questions')
        .select('id, title, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentQuestions) {
        recentQuestions.forEach(question => {
          activities.push({
            type: 'question_added',
            title: question.title,
            description: 'Added new question',
            timestamp: formatTimeAgo(question.created_at)
          });
        });
      }

      // Sort by timestamp and take the most recent 5
      activities.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback to empty array
      setRecentActivity([]);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const getTrainerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        setUser(user);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile?.role !== 'trainer' && profile?.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        
        setProfile(profile);

        // Fetch real stats and recent activity
        await Promise.all([
          fetchTrainerStats(user.id),
          fetchRecentActivity(user.id)
        ]);

      } catch (error) {
        console.error('Error fetching trainer data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    getTrainerData();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-subtle-gradient">
        <DashboardHeader studentName="Loading..." />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Loading Dashboard</h2>
              <p className="text-muted-foreground">Fetching your trainer data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Question Bank",
      description: "View and manage all questions",
      icon: BookOpen,
      action: () => {
        // Scroll to questions section or show modal
        toast({
          title: "Question Bank",
          description: "Question management features coming soon!",
        });
      },
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "View Results",
      description: "Analyze exam performance",
      icon: BarChart3,
      action: () => document.getElementById('exam-results')?.scrollIntoView({ behavior: 'smooth' }),
      color: "from-green-500 to-green-600"
    },
    {
      title: "Settings",
      description: "Configure your preferences",
      icon: Settings,
      action: () => {
        toast({
          title: "Settings",
          description: "Settings panel coming soon!",
        });
      },
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Trainer"} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Trainer'}!
              </h1>
              <p className="text-muted-foreground">
                Manage your questions, tests, and track student progress
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats ? stats.totalStudents : '...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all your batches
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questions Created</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats ? stats.totalQuestions : '...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  In question bank
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats ? stats.totalTests : '...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Created assessments
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats ? stats.activeTests : '...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {/* Primary Actions */}
              <CreateExamModal onExamCreated={handleExamCreated} />
              <CreateQuestionModal onQuestionCreated={handleQuestionCreated} />
              <ExcelUploadModal onQuestionsAdded={handleQuestionCreated} />
              <CreateMcqQuestionModal onQuestionCreated={handleQuestionCreated} />
              <McqExcelUpload onQuestionsAdded={handleQuestionCreated} />
              <CreateMcqTestModal onTestCreated={handleExamCreated} />
              
              {/* Secondary Actions */}
              {quickActions.map((action, index) => (
                <Card 
                  key={index}
                  className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient"
                  onClick={action.action}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-sm`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-sm">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Exam Management */}
          <div className="space-y-8">
            <ExistingExams refreshTrigger={refreshTrigger} />
            <BatchManagement />
          </div>

          {/* Exam Results */}
          <div id="exam-results" className="space-y-8">
            <ExamResultsView />
            <McqResultsView />
          </div>

          {/* Recent Activity */}
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                      <p className="text-xs text-muted-foreground">Start by creating questions or tests</p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {activity.type === 'test_created' && <ClipboardList className="h-4 w-4 text-primary" />}
                          {activity.type === 'question_added' && <BookOpen className="h-4 w-4 text-primary" />}
                          {activity.type === 'student_assigned' && <Users className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-foreground truncate">{activity.title}</h4>
                            {activity.status && (
                              <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                                {activity.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Arrays & Strings Test</h4>
                      <p className="text-sm text-yellow-600">Ends in 2 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Create Final Exam</h4>
                      <p className="text-sm text-blue-600">Due in 1 week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Grade Submissions</h4>
                      <p className="text-sm text-green-600">No pending items</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrainerDashboard;