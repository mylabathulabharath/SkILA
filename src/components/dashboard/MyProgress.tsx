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

      // 1. Fetch Coding Attempts
      const { data: codeAttempts, error: codeError } = await supabase
        .from('attempts')
        .select('id, score, max_score, submitted_at, tests(time_limit_minutes)')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted']);

      if (codeError) throw codeError;

      // 2. Fetch MCQ Attempts
      const { data: mcqAttempts, error: mcqError } = await supabase
        .from('mcq_attempts')
        .select('id, score, max_score, submitted_at, test_id, mcq_tests(duration_minutes)')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted']);

      if (mcqError) throw mcqError;

      // COMBINE DATA
      const allAttempts = [
        ...(codeAttempts || []).map(a => ({
          ...a,
          type: 'code',
          duration: a.tests?.time_limit_minutes || 0
        })),
        ...(mcqAttempts || []).map(a => ({
          ...a,
          type: 'mcq',
          duration: (a as any).mcq_tests?.duration_minutes || 0
        }))
      ].sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime());

      // Calculate stats
      const totalTests = allAttempts.length;
      const averageScore = allAttempts.length > 0
        ? Math.round(allAttempts.reduce((sum, a) => sum + (a.score! / a.max_score!) * 100, 0) / allAttempts.length)
        : 0;
      const lastScore = allAttempts.length > 0
        ? Math.round((allAttempts[allAttempts.length - 1].score! / allAttempts[allAttempts.length - 1].max_score!) * 100)
        : 0;
      const timeSaved = allAttempts.reduce((sum, a) => sum + (a.duration || 0), 0);

      setStats({
        totalTests,
        averageScore,
        lastScore,
        timeSaved
      });

      // Generate progress data by month
      const monthlyData: Record<string, { total: number; count: number }> = {};
      allAttempts.forEach(attempt => {
        const date = new Date(attempt.submitted_at!);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const score = Math.round((attempt.score! / attempt.max_score!) * 100);

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

      setProgressData(progressChartData.slice(-6)); // Show last 6 months

      // 3. Subject Performance (Coding + MCQ)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('language, verdict')
        .eq('run_type', 'submit');

      const { data: mcqResponses } = await supabase
        .from('mcq_responses')
        .select('is_correct, mcq_questions(mcq_subjects(name))');

      const subjectStats: Record<string, { passed: number; total: number }> = {};

      // Add coding languages
      submissions?.forEach(s => {
        const lang = s.language.charAt(0).toUpperCase() + s.language.slice(1);
        if (!subjectStats[lang]) subjectStats[lang] = { passed: 0, total: 0 };
        subjectStats[lang].total += 1;
        if (s.verdict === 'passed') subjectStats[lang].passed += 1;
      });

      // Add MCQ subjects
      mcqResponses?.forEach(r => {
        const subject = (r.mcq_questions as any)?.mcq_subjects?.name || 'General';
        if (!subjectStats[subject]) subjectStats[subject] = { passed: 0, total: 0 };
        subjectStats[subject].total += 1;
        if (r.is_correct) subjectStats[subject].passed += 1;
      });

      const subjectChartData = Object.entries(subjectStats)
        .map(([name, data]) => ({
          subject: name,
          score: Math.round((data.passed / data.total) * 100)
        }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      setSubjectData(subjectChartData);

    } catch (error) {
      console.error('Error fetching comprehensive progress data:', error);
      toast({
        title: "Analytics Sync Error",
        description: "Some data might be missing. Try refreshing.",
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
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-3xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Personal Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time performance metrics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => (
          <Card key={index} className="border-0 bg-white/50 backdrop-blur-md shadow-sm hover:translate-y-[-2px] transition-transform rounded-2xl">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Over Time */}
        <Card className="border border-white/40 bg-white/40 backdrop-blur-md shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Growth Trajectory
            </CardTitle>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Average Score %</p>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-10" />
                <XAxis
                  dataKey="month"
                  className="text-[10px] font-bold text-slate-400 uppercase"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  className="text-[10px] font-bold text-slate-400"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={4}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5, stroke: 'white' }}
                  activeDot={{ r: 8, fill: 'hsl(var(--secondary))', stroke: 'white', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="border border-white/40 bg-white/40 backdrop-blur-md shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-0 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Skill Proficiency
            </CardTitle>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Correct Answers %</p>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-10" />
                <XAxis
                  dataKey="subject"
                  className="text-[10px] font-bold text-slate-400 uppercase"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  className="text-[10px] font-bold text-slate-400"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                />
                <Bar
                  dataKey="score"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                  barSize={32}
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