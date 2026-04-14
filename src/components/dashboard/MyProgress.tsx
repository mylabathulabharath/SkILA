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
      <div className="space-y-10 animate-pulse">
        <div className="h-10 w-64 bg-slate-200/50 rounded-xl"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100/50 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between pl-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personal Analytics</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time performance metrics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat, index) => (
          <div key={index} className="glass-card p-6 rounded-[2rem] hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="flex flex-col gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{stat.label}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Performance Over Time */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden group">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Growth Trajectory
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-12">Historical Average Score %</p>
          </div>
          <div className="p-8 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis
                  dataKey="month"
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                  axisLine={false}
                  tickLine={false}
                  dy={15}
                />
                <YAxis
                  className="text-[10px] font-black text-slate-400"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: 'none',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: '900', color: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={5}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 3, r: 6, stroke: 'white' }}
                  activeDot={{ r: 9, fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden group">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                Skill Proficiency
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-12">Average Correctness By Topic %</p>
          </div>
          <div className="p-8 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis
                  dataKey="subject"
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                  axisLine={false}
                  tickLine={false}
                  dy={15}
                />
                <YAxis
                  className="text-[10px] font-black text-slate-400"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(var(--primary), 0.03)', radius: 12 }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: 'none',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    padding: '16px'
                  }}
                />
                <Bar
                  dataKey="score"
                  fill="url(#progressGradient)"
                  radius={[10, 10, 4, 4]}
                  barSize={36}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};