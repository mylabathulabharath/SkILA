import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Target, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProgressData {
  month: string;
  score: number;
}

interface SubjectData {
  subject: string;
  score: number;
}

interface ProgressStats {
  totalTests: number;
  averageScore: number;
  lastScore: number;
  timeSaved: number;
}

export const MyProgress = () => {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalTests: 0,
    averageScore: 0,
    lastScore: 0,
    timeSaved: 0
  });
  const { toast } = useToast();
  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's attempts with scores
      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          id,
          score,
          max_score,
          submitted_at,
          test_id,
          tests(
            name,
            time_limit_minutes
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: true });

      if (attemptsError) throw attemptsError;

      // Calculate stats
      const totalTests = attempts?.length || 0;
      const averageScore = attempts && attempts.length > 0 
        ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.max_score) * 100, 0) / attempts.length)
        : 0;
      const lastScore = attempts && attempts.length > 0 
        ? Math.round((attempts[attempts.length - 1].score / attempts[attempts.length - 1].max_score) * 100)
        : 0;
      const timeSaved = attempts && attempts.length > 0
        ? attempts.reduce((sum, attempt) => sum + (attempt.tests?.time_limit_minutes || 0), 0)
        : 0;

      setStats({
        totalTests,
        averageScore,
        lastScore,
        timeSaved
      });

      // Generate progress data by month
      const monthlyData: Record<string, { total: number; count: number }> = {};
      attempts?.forEach(attempt => {
        const date = new Date(attempt.submitted_at);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const score = Math.round((attempt.score / attempt.max_score) * 100);
        
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, count: 0 };
        }
        monthlyData[month].total += score;
        monthlyData[month].count += 1;
      });

      const progressChartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        score: Math.round(data.total / data.count)
      }));

      setProgressData(progressChartData);

      // Generate subject performance data
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          language,
          verdict,
          attempts!inner(
            user_id
          )
        `)
        .eq('attempts.user_id', user.id)
        .eq('run_type', 'submit');

      if (submissionsError) throw submissionsError;

      const languageStats: Record<string, { passed: number; total: number }> = {};
      submissions?.forEach(submission => {
        if (!languageStats[submission.language]) {
          languageStats[submission.language] = { passed: 0, total: 0 };
        }
        languageStats[submission.language].total += 1;
        if (submission.verdict === 'passed') {
          languageStats[submission.language].passed += 1;
        }
      });

      const subjectChartData = Object.entries(languageStats).map(([language, data]) => ({
        subject: language.charAt(0).toUpperCase() + language.slice(1),
        score: Math.round((data.passed / data.total) * 100)
      }));

      setSubjectData(subjectChartData);

    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statsConfig = [
    {
      label: "Total Tests",
      value: stats.totalTests.toString(),
      icon: Target,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      label: "Average Score",
      value: `${stats.averageScore}%`,
      icon: Award,
      color: "text-secondary",
      bg: "bg-secondary/10"
    },
    {
      label: "Last Score",
      value: `${stats.lastScore}%`,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      label: "Time Saved",
      value: `${Math.round(stats.timeSaved / 60)}h`,
      icon: Clock,
      color: "text-muted-foreground",
      bg: "bg-muted"
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">My Progress</h2>
          <p className="text-muted-foreground">Track your performance over time</p>
        </div>
        <Card className="border-0 bg-card-gradient">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading progress data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Progress</h2>
        <p className="text-muted-foreground">Track your performance over time</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => (
          <Card key={index} className="border-0 bg-card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Over Time */}
        <Card className="border-0 bg-card-gradient">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--secondary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="border-0 bg-card-gradient">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="subject" 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  className="text-xs" 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="score" 
                  fill="url(#colorGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};