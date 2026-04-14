import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Brain, 
  Code, 
  Award,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";

interface LearningStats {
  totalAssessments: number;
  averageScore: number;
  totalTimeSpent: number;
  improvementRate: number;
  strongestLanguage: string;
  weakestLanguage: string;
  streak: number;
  accuracy: number;
}

interface PerformanceTrend {
  date: string;
  score: number;
  timeSpent: number;
  assessmentsCompleted: number;
}

interface LanguageBreakdown {
  language: string;
  assessments: number;
  averageScore: number;
  totalTime: number;
  improvement: number;
}

export const LearningAnalytics = () => {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [languageBreakdown, setLanguageBreakdown] = useState<LanguageBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's attempts and calculate stats
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select(`
          *,
          tests!inner(
            name,
            questions!inner(
              supported_languages,
              difficulty
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Calculate learning statistics
      const totalAssessments = attempts?.length || 0;
      const totalScore = attempts?.reduce((sum, attempt) => sum + (attempt.score || 0), 0) || 0;
      const averageScore = totalAssessments > 0 ? totalScore / totalAssessments : 0;
      
      // Calculate time spent (assuming average 30 minutes per assessment)
      const totalTimeSpent = totalAssessments * 30;
      
      // Calculate improvement rate (compare last 10 vs first 10)
      const recentAttempts = attempts?.slice(0, 10) || [];
      const olderAttempts = attempts?.slice(-10) || [];
      const recentAvg = recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / Math.max(recentAttempts.length, 1);
      const olderAvg = olderAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / Math.max(olderAttempts.length, 1);
      const improvementRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

      // Calculate language breakdown
      const languageStats = new Map<string, { assessments: number; totalScore: number; totalTime: number }>();
      
      attempts?.forEach(attempt => {
        const languages = attempt.tests?.questions?.supported_languages || ['python'];
        languages.forEach((lang: string) => {
          if (!languageStats.has(lang)) {
            languageStats.set(lang, { assessments: 0, totalScore: 0, totalTime: 0 });
          }
          const stats = languageStats.get(lang)!;
          stats.assessments++;
          stats.totalScore += attempt.score || 0;
          stats.totalTime += 30; // 30 minutes per assessment
        });
      });

      const languageBreakdownData: LanguageBreakdown[] = Array.from(languageStats.entries()).map(([language, data]) => ({
        language,
        assessments: data.assessments,
        averageScore: data.assessments > 0 ? data.totalScore / data.assessments : 0,
        totalTime: data.totalTime,
        improvement: 0, // Would need historical data to calculate
      }));

      // Find strongest and weakest languages
      const sortedLanguages = languageBreakdownData.sort((a, b) => b.averageScore - a.averageScore);
      const strongestLanguage = sortedLanguages[0]?.language || 'None';
      const weakestLanguage = sortedLanguages[sortedLanguages.length - 1]?.language || 'None';

      // Calculate streak (consecutive days with assessments)
      const streak = calculateStreak(attempts || []);

      // Calculate accuracy (percentage of passed assessments)
      const passedAssessments = attempts?.filter(a => (a.score || 0) >= 70).length || 0;
      const accuracy = totalAssessments > 0 ? (passedAssessments / totalAssessments) * 100 : 0;

      setStats({
        totalAssessments,
        averageScore,
        totalTimeSpent,
        improvementRate,
        strongestLanguage,
        weakestLanguage,
        streak,
        accuracy,
      });

      setLanguageBreakdown(languageBreakdownData);

      // Generate performance trends (last 30 days)
      const trendsData = generatePerformanceTrends(attempts || []);
      setTrends(trendsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (attempts: any[]): number => {
    if (attempts.length === 0) return 0;
    
    const dates = attempts.map(a => new Date(a.submitted_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = new Date(uniqueDates[i]);
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generatePerformanceTrends = (attempts: any[]): PerformanceTrend[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => {
      const dayAttempts = attempts.filter(a => 
        a.submitted_at && a.submitted_at.startsWith(date)
      );
      
      return {
        date,
        score: dayAttempts.length > 0 
          ? dayAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / dayAttempts.length 
          : 0,
        timeSpent: dayAttempts.length * 30,
        assessmentsCompleted: dayAttempts.length,
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Institutional <span className="text-gradient">Analytics</span>
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </div>
          </h2>
          <p className="text-sm font-medium text-slate-500">Global performance benchmarks and cognitive mapping.</p>
        </div>
        <div className="flex gap-4">
          <Badge className="bg-slate-900 text-white border-none px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase">Cloud Managed</Badge>
          <Badge variant="outline" className="border-slate-200 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase text-slate-400">Sync: Real-time</Badge>
        </div>
      </div>

      {/* Primary Intelligence Metrics */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Validation Tracks", value: stats?.totalAssessments || 0, icon: Target, color: "text-primary", bg: "bg-primary/5" },
          { label: "Aggregate Performance", value: `${Math.round(stats?.averageScore || 0)}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Engagement Velocity", value: `${Math.round((stats?.totalTimeSpent || 0) / 60)}h`, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Cognitive Streak", value: `${stats?.streak || 0}d`, icon: Award, color: "text-amber-500", bg: "bg-amber-50" }
        ].map((metric, i) => (
          <div key={i} className={`glass-card p-8 rounded-[2.5rem] border border-slate-100 shadow-premium-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 animate-reveal stagger-${i+1}`}>
            <div className="flex flex-col gap-6">
              <div className={`p-4 rounded-2xl ${metric.bg} ${metric.color} w-fit`}>
                <metric.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics Architecture */}
      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex items-center justify-center md:justify-start bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-100">
          <TabsList className="bg-transparent h-auto p-0 gap-1">
            {['overview', 'languages', 'trends'].map((t) => (
              <TabsTrigger 
                key={t} 
                value={t} 
                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 outline-none border-none">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="glass-card border-none rounded-[3rem] shadow-premium-sm p-10">
              <CardHeader className="p-0 mb-8 border-b border-slate-50 pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Brain className="h-6 w-6 text-primary" />
                    Cognitive Growth
                  </CardTitle>
                  <Activity className="h-5 w-5 text-slate-200" />
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Validation Accuracy</span>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">{Math.round(stats?.accuracy || 0)}%</p>
                    </div>
                  </div>
                  <Progress value={stats?.accuracy || 0} className="h-3 bg-slate-50 rounded-full" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Improvement</span>
                      <p className={`text-2xl font-black tracking-tighter ${stats?.improvementRate && stats.improvementRate > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {stats?.improvementRate && stats.improvementRate > 0 ? "+" : ""}{Math.round(stats?.improvementRate || 0)}%
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={Math.abs(stats?.improvementRate || 0)} 
                    className={`h-3 bg-slate-50 rounded-full ${stats?.improvementRate && stats.improvementRate > 0 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-rose-500"}`} 
                  />
                  <p className="text-[10px] font-medium text-slate-400 italic">Benchmarks updated dynamically based on campus averages.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none rounded-[3rem] shadow-premium-sm p-10">
              <CardHeader className="p-0 mb-8 border-b border-slate-50 pb-6">
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Code className="h-6 w-6 text-primary" />
                  Language Proficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Domain</p>
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center group hover:bg-primary transition-all duration-500">
                      <span className="text-xl font-black text-primary group-hover:text-white uppercase tracking-widest">{stats?.strongestLanguage || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Focus Requirement</p>
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center group hover:bg-rose-100 transition-all duration-500">
                      <span className="text-xl font-black text-rose-500 uppercase tracking-widest">{stats?.weakestLanguage || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary group-hover:bg-primary-glow transition-colors opacity-10 blur-2xl -mr-16 -mt-16"></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <BarChart3 className="h-5 w-5 text-primary-glow" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Status</p>
                      <p className="text-sm font-bold uppercase tracking-widest">Skill Set Validated</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="languages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Language Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {languageBreakdown.map((lang) => (
                  <div key={lang.language} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{lang.language}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{lang.assessments} assessments</Badge>
                        <Badge variant="secondary">{Math.round(lang.averageScore)}% avg</Badge>
                      </div>
                    </div>
                    <Progress value={lang.averageScore} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Trends (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.slice(-7).map((trend, index) => (
                  <div key={trend.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {new Date(trend.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trend.assessmentsCompleted} assessments
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Math.round(trend.score)}%</p>
                      <p className="text-sm text-muted-foreground">{trend.timeSpent}min</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
