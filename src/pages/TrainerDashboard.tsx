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
  RefreshCw,
  LayoutDashboard
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-sm">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Welcome back, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Trainer'}</span>!
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor performance, manage assessments, and organize your batches.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex items-center gap-2 bg-white/50 hover:bg-white transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-8">
            <div className="flex items-center justify-between bg-white/30 backdrop-blur-sm p-1 rounded-xl border border-white/20 sticky top-4 z-40 shadow-sm">
              <TabsList className="bg-transparent border-0 gap-1 overflow-x-auto no-scrollbar justify-start w-full md:w-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="exams" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="batches" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
                  <Users className="h-4 w-4 mr-2" />
                  Batches
                </TabsTrigger>
                <TabsTrigger value="questions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Question Bank
                </TabsTrigger>
                <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Results
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500">
              {/* Stats Overview */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0 hover:translate-y-[-4px] transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {stats ? stats.totalStudents : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enrolled in your batches
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0 hover:translate-y-[-4px] transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Question Bank</CardTitle>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {stats ? stats.totalQuestions : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available questions
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0 hover:translate-y-[-4px] transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Assessments</CardTitle>
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <ClipboardList className="h-4 w-4 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {stats ? stats.totalTests : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exams created
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0 hover:translate-y-[-4px] transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {stats ? stats.activeTests : '...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Currently running
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Recent Activity */}
                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">No recent activity</p>
                          <p className="text-xs text-muted-foreground">Activities will appear here as you work</p>
                        </div>
                      ) : (
                        recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-white/50 shadow-sm">
                            <div className="p-2.5 rounded-lg bg-white shadow-sm">
                              {activity.type === 'test_created' && <ClipboardList className="h-5 w-5 text-blue-500" />}
                              {activity.type === 'question_added' && <BookOpen className="h-5 w-5 text-purple-500" />}
                              {activity.type === 'student_assigned' && <Users className="h-5 w-5 text-green-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-foreground truncate">{activity.title}</h4>
                                <span className="text-[10px] text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border shadow-sm whitespace-nowrap">
                                  {activity.timestamp}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                              {activity.status && (
                                <Badge variant="outline" className="mt-2 text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                                  {activity.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      System Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-yellow-50/50 border border-yellow-100">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-yellow-100">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-yellow-900 line-clamp-1">Arrays & Strings Internal</h4>
                          <p className="text-xs text-yellow-700 font-medium">Ends in 2 days</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-blue-100">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 line-clamp-1">Coding Challenge Finals</h4>
                          <p className="text-xs text-blue-700 font-medium">Scheduled for next Monday</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50/50 border border-green-100">
                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-green-100">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-green-900 line-clamp-1">Grading Status</h4>
                          <p className="text-xs text-green-700 font-medium">All submissions evaluated</p>
                        </div>
                      </div>

                      <Card className="bg-white border-dashed border-2 p-6 flex flex-col items-center justify-center text-center">
                        <div className="p-3 bg-primary/10 rounded-full mb-3">
                          <Plus className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold">Need more tasks?</h4>
                        <p className="text-xs text-muted-foreground mt-1">Schedule more assessments to track progress.</p>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="exams" className="animate-in slide-in-from-left-4 duration-500">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold">Assessments</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage ongoing and upcoming tests</p>
                  </div>
                  <div className="flex gap-2">
                    <CreateExamModal onExamCreated={handleExamCreated} />
                    <CreateMcqTestModal onTestCreated={handleExamCreated} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ExistingExams refreshTrigger={refreshTrigger} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batches" className="animate-in slide-in-from-left-4 duration-500">
              <div className="bg-white/80 backdrop-blur-sm border-0 rounded-2xl shadow-card overflow-hidden">
                <BatchManagement />
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-8 animate-in slide-in-from-left-4 duration-500">
              <Card className="bg-white/80 backdrop-blur-sm shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Question Management</CardTitle>
                  <p className="text-sm text-muted-foreground">Build your library of coding and MCQ questions</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Coding Questions</h3>
                      <div className="grid gap-3">
                        <CreateQuestionModal onQuestionCreated={handleQuestionCreated} />
                        <ExcelUploadModal onQuestionsAdded={handleQuestionCreated} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">MCQ Questions</h3>
                      <div className="grid gap-3">
                        <CreateMcqQuestionModal onQuestionCreated={handleQuestionCreated} />
                        <McqExcelUpload onQuestionsAdded={handleQuestionCreated} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Storage & Stats</h3>
                      <Card className="bg-muted/10 p-4 border border-dashed text-center flex flex-col items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <span className="text-2xl font-bold">{stats?.totalQuestions || 0}</span>
                        <span className="text-xs text-muted-foreground">Total records in bank</span>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3">
                {quickActions.map((action, index) => (
                  <Card
                    key={index}
                    className="group hover:shadow-lg transition-all duration-300 hover:translate-y-[-4px] cursor-pointer border-0 bg-white shadow-sm overflow-hidden"
                    onClick={action.action}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${action.color}`} />
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-sm group-hover:scale-110 transition-transform`}>
                          <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                            {action.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div className="space-y-8">
                <ExamResultsView />
                <McqResultsView />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TrainerDashboard;