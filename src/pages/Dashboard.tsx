import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MyProgress } from "@/components/dashboard/MyProgress";
import { UpcomingTests } from "@/components/dashboard/UpcomingTests";
import { RecentResults } from "@/components/dashboard/RecentResults";
import { LearningAnalytics } from "@/components/analytics/LearningAnalytics";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profile);
      }
    };

    getProfile();
  }, []);

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
        <div className="space-y-12">
          {/* Quick Actions and My Progress - Side by side on desktop */}
          <div className="grid gap-8 lg:grid-cols-2">
            <QuickActions />
            <MyProgress />
          </div>
          
          {/* Learning Analytics */}
          <LearningAnalytics />
          
          {/* Recent Results and Upcoming Tests - Side by side on desktop */}
          <div className="grid gap-8 lg:grid-cols-2">
            <RecentResults key={`recent-${refreshTrigger}`} />
            <UpcomingTests key={`upcoming-${refreshTrigger}`} />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 AI-Powered Exam Portal. Built for the future of learning.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;