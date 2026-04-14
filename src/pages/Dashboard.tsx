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

        const validAttempts = allAttempts.filter(a => a.max_score && a.max_score > 0);
        const totalTests = validAttempts.length;
        let avgScore = 0;

        if (totalTests > 0) {
          const totalPercentage = validAttempts.reduce((acc, curr) => {
            const perc = (curr.score / curr.max_score) * 100;
            return acc + perc;
          }, 0);
          avgScore = Math.round(totalPercentage / totalTests);
        }

        setStats({
          averageScore: avgScore,
          testsDone: allAttempts.length // Count all attempts for "Tests Completed", even if score is missing
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
    <div className="min-h-screen bg-subtle-gradient pb-20">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Student"} />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-10">
          {/* Welcome & Profile Summary Section */}
          <div className="glass-card p-8 md:p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group animate-slide-in-up">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-float"></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-secondary/10 rounded-full blur-[80px] animate-float stagger-2"></div>
            
            <div className="relative z-10 text-center md:text-left space-y-6 max-w-xl">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 backdrop-blur-sm self-start">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Institutional Sync Active</span>
                </div>
                {profile?.role === 'trainer' && (
                  <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm h-fit">Faculty Access</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95]">
                  Accelerate your <br />
                  <span className="text-gradient drop-shadow-sm">Future.</span>
                </h1>
                <p className="text-slate-500 text-lg md:text-xl font-medium max-w-md leading-relaxed">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'Candidate'}. Your learning cloud is optimized and ready.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-5 w-full md:w-auto mt-8 md:mt-0">
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-premium-sm border border-white/50 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group/stat">
                <div className="text-4xl font-black text-slate-900 mb-1 animate-pulse-premium">{stats.averageScore}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cognitive Accuracy</div>
                <div className="mt-4 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Analytics Ready</span>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-white/10 text-center hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-500 group/stat">
                <div className="text-4xl font-black text-white mb-1">{stats.testsDone}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Completed Trackers</div>
                <div className="mt-4 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Activity Live</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs key={location.pathname} defaultValue={getDefaultTab()} className="space-y-10">
            <div className="flex items-center justify-center md:justify-start bg-white/40 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white shadow-premium-sm w-fit sticky top-24 z-40 mx-auto md:mx-0">
              <TabsList className="bg-transparent border-0 gap-1.5 overflow-x-auto no-scrollbar h-auto p-0">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-[1rem] px-6 py-3 transition-all duration-300 gap-2.5 font-bold text-sm text-slate-500 hover:text-slate-700">
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="assessments" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-[1rem] px-6 py-3 transition-all duration-300 gap-2.5 font-bold text-sm text-slate-500 hover:text-slate-700">
                  <ClipboardList className="h-4 w-4" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-[1rem] px-6 py-3 transition-all duration-300 gap-2.5 font-bold text-sm text-slate-500 hover:text-slate-700">
                  <BarChart3 className="h-4 w-4" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="learning" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-[1rem] px-6 py-3 transition-all duration-300 gap-2.5 font-bold text-sm text-slate-500 hover:text-slate-700">
                  <BookOpen className="h-4 w-4" />
                  Pathways
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700 outline-none">
              <LiveExamBanner />
              <BatchEnrollment />
              <div className="grid gap-10 lg:grid-cols-2 items-start">
                <QuickActions />
                <MyProgress />
              </div>
              <LearningAnalytics />
            </TabsContent>

            <TabsContent value="assessments" className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 outline-none">
              <div className="grid gap-10 lg:grid-cols-2 items-start">
                <UpcomingTests key={`upcoming-${refreshTrigger}`} />
                <div className="space-y-8">
                  <div className="bg-primary-muted/50 p-8 rounded-[2rem] border border-primary/10 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                      <Settings className="h-32 w-32 rotate-12" />
                    </div>
                    <h3 className="font-black text-primary text-xl mb-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Settings className="h-5 w-5" />
                      </div>
                      Assessment Guidelines
                    </h3>
                    <ul className="space-y-4">
                      {[
                        "Stable high-speed connection required",
                        "Time management is critical for success",
                        "Conceptual mastery precedes high scores"
                      ].map((tip, i) => (
                        <li key={i} className="flex gap-4 group/item">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 group-hover/item:scale-150 transition-transform"></div>
                          <span className="text-sm font-semibold text-slate-600 group-hover/item:text-slate-900 transition-colors">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <RecentResults key={`recent-${refreshTrigger}`} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 outline-none">
              <LearningAnalytics />
              <MyProgress />
            </TabsContent>

            <TabsContent value="learning" className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 outline-none">
              <LearningPath />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200/50 bg-white/40 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <img src="/SkILA.svg" alt="SkILA" className="h-7 w-auto opacity-40 grayscale" />
              <div className="w-px h-4 bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Version 2.0</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              © 2025 SKILA ARTIFICIAL INTELLIGENCE. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-8">
              {['System Status', 'Privacy Policy', 'Terms of Use'].map(link => (
                <span key={link} className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors cursor-pointer uppercase tracking-widest">{link}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;