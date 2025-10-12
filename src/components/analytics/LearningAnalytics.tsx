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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Learning Analytics</h2>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Real-time
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{stats?.totalAssessments || 0}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{Math.round(stats?.averageScore || 0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Spent</p>
                <p className="text-2xl font-bold">{Math.round((stats?.totalTimeSpent || 0) / 60)}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Streak</p>
                <p className="text-2xl font-bold">{stats?.streak || 0} days</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Accuracy</span>
                    <span>{Math.round(stats?.accuracy || 0)}%</span>
                  </div>
                  <Progress value={stats?.accuracy || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Improvement Rate</span>
                    <span className={stats?.improvementRate && stats.improvementRate > 0 ? "text-green-500" : "text-red-500"}>
                      {stats?.improvementRate && stats.improvementRate > 0 ? "+" : ""}{Math.round(stats?.improvementRate || 0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(stats?.improvementRate || 0)} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Language Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Strongest Language</p>
                  <Badge variant="default" className="text-sm">
                    {stats?.strongestLanguage || 'None'}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Focus Area</p>
                  <Badge variant="destructive" className="text-sm">
                    {stats?.weakestLanguage || 'None'}
                  </Badge>
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
