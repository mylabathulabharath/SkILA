import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MyProgress } from "@/components/dashboard/MyProgress";
import { UpcomingTests } from "@/components/dashboard/UpcomingTests";
import { RecentResults } from "@/components/dashboard/RecentResults";
import { LearningAnalytics } from "@/components/analytics/LearningAnalytics";
import { BatchEnrollment } from "@/components/dashboard/BatchEnrollment";
import { LearningPath } from "@/components/dashboard/LearningPath";
import { LiveExamBanner } from "@/components/dashboard/LiveExamBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  BookOpen,
  Settings,
  GraduationCap
} from "lucide-react";
import { useLocation } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();

  // Determine default tab based on URL path
  const getDefaultTab = () => {
    if (location.pathname === '/practice') return 'assessments';
    if (location.pathname === '/progress') return 'performance';
    return 'overview';
  };

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({ averageScore: 0, testsDone: 0 });

  useEffect(() => {
    const getProfileAndStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);

        // Fetch Coding Test stats
        const { data: codeAttempts } = await supabase
          .from('attempts')
          .select('score, max_score')
          .eq('user_id', user.id)
          .in('status', ['submitted', 'auto_submitted']);

        // Fetch MCQ Test stats
        const { data: mcqAttempts } = await (supabase as any)
          .from('mcq_attempts')
          .select('score, max_score')
          .eq('user_id', user.id)
          .in('status', ['submitted', 'auto_submitted']);

        const allAttempts = [
          ...(codeAttempts || []),
          ...(mcqAttempts || [])
        ];

        const totalTests = allAttempts.length;
        let avgScore = 0;

        if (totalTests > 0) {
          const totalPercentage = allAttempts.reduce((acc, curr) => {
            const perc = curr.max_score > 0 ? (curr.score / curr.max_score) * 100 : 0;
            return acc + perc;
          }, 0);
          avgScore = Math.round(totalPercentage / totalTests);
        }

        setStats({
          averageScore: avgScore,
          testsDone: totalTests
        });
      }
    };

    getProfileAndStats();
  }, [refreshTrigger]);

  // Listen for exam submission events
  useEffect(() => {
    const handleExamSubmitted = (event: CustomEvent) => {
      console.log('Exam submitted event received:', event.detail);
      // Trigger refresh of dashboard components
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('examSubmitted', handleExamSubmitted as EventListener);

    return () => {
      window.removeEventListener('examSubmitted', handleExamSubmitted as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Student"} />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome & Profile Summary Section */}
          <div className="bg-white/50 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
            <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors duration-700"></div>

            <div className="relative z-10 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Candidate Portal</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
                Hello, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'Student'}</span>!
              </h1>
              <p className="text-muted-foreground text-lg max-w-md">
                Ready to continue your learning journey? Your next milestone is waiting.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/80 p-4 rounded-2xl shadow-sm border border-white/40 text-center hover:translate-y-[-2px] transition-transform">
                <div className="text-2xl font-bold text-primary">{stats.averageScore}%</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Average Score</div>
              </div>
              <div className="bg-white/80 p-4 rounded-2xl shadow-sm border border-white/40 text-center hover:translate-y-[-2px] transition-transform">
                <div className="text-2xl font-bold text-secondary">{stats.testsDone}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Tests Done</div>
              </div>
            </div>
          </div>

          <Tabs key={location.pathname} defaultValue={getDefaultTab()} className="space-y-8">
            <div className="flex items-center justify-center md:justify-start bg-white/30 backdrop-blur-sm p-1 rounded-2xl border border-white/20 w-fit sticky top-4 z-40 shadow-sm mx-auto md:mx-0">
              <TabsList className="bg-transparent border-0 gap-1 overflow-x-auto no-scrollbar">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 transition-all gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="assessments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 transition-all gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 transition-all gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="learning" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 transition-all gap-2">
                  <BookOpen className="h-4 w-4" />
                  Learning Path
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
              {/* Ongoing Exams Alert */}
              <LiveExamBanner />

              {/* Batch Enrollment Section at top for visibility */}
              <BatchEnrollment />

              {/* Quick Actions and My Progress */}
              <div className="grid gap-8 lg:grid-cols-2 items-start">
                <QuickActions />
                <MyProgress />
              </div>

              {/* Learning Analytics for more detail */}
              <LearningAnalytics />
            </TabsContent>

            <TabsContent value="assessments" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-8 lg:grid-cols-2 items-start">
                <UpcomingTests key={`upcoming-${refreshTrigger}`} />
                <div className="space-y-6">
                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                    <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Assessment Tips
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                        <span>Ensure your internet connection is stable before starting.</span>
                      </li>
                      <li className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                        <span>Check the time limit for each assessment.</span>
                      </li>
                      <li className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                        <span>Practice with smaller problems before taking major tests.</span>
                      </li>
                    </ul>
                  </div>
                  <RecentResults key={`recent-${refreshTrigger}`} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <LearningAnalytics />
              <MyProgress />
            </TabsContent>

            <TabsContent value="learning" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <LearningPath />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white/50 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/SkILA.svg" alt="SkILA" className="h-8 w-auto opacity-70 grayscale" />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 AI-Powered Exam Portal. Empowering learners worldwide.
            </p>
            <div className="flex gap-6">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">Support</span>
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">Privacy</span>
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;