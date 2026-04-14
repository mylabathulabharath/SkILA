import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Award, Eye } from "lucide-react";

interface RecentResult {
  id: string;
  test_name: string;
  score: number;
  max_score: number;
  submitted_at: string;
  status: string;
  time_taken?: number;
}

export const RecentResults = () => {
  const [results, setResults] = useState<RecentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecentResults = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Coding Attempts
      const { data: codeAttempts, error: codeError } = await supabase
        .from('attempts')
        .select(`
          id, score, max_score, submitted_at, status, started_at, test_id,
          tests(name)
        `)
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (codeError) throw codeError;

      // 2. Fetch MCQ Attempts
      const { data: mcqAttempts, error: mcqError } = await supabase
        .from('mcq_attempts' as any)
        .select(`
          id, score, max_score, submitted_at, status, started_at, test_id,
          mcq_tests(title)
        `)
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (mcqError) throw mcqError;

      // COMBINE AND FORMAT
      const allResults = [
        ...(codeAttempts || []).map(a => ({
          id: a.id,
          test_name: a.tests?.name || `Coding: ${a.test_id?.slice(0, 8)}`,
          score: a.score || 0,
          max_score: a.max_score || 100,
          submitted_at: a.submitted_at,
          status: a.status,
          started_at: a.started_at,
          type: 'code'
        })),
        ...(mcqAttempts || []).map((a: any) => ({
          id: a.id,
          test_name: a.mcq_tests?.title || `MCQ: ${a.test_id?.slice(0, 8)}`,
          score: a.score || 0,
          max_score: a.max_score || 100,
          submitted_at: a.submitted_at,
          status: a.status,
          started_at: a.started_at,
          type: 'mcq'
        }))
      ].sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())
        .slice(0, 5);

      const formattedResults = allResults.map(result => {
        const timeTaken = result.submitted_at && result.started_at
          ? Math.round((new Date(result.submitted_at).getTime() - new Date(result.started_at).getTime()) / 60000)
          : undefined;

        return {
          ...result,
          time_taken: timeTaken
        };
      }) as RecentResult[];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching comprehensive recent results:', error);
      toast({
        title: "Error",
        description: "Failed to load recent results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRecentResults();

    let channel: any = null;

    try {
      channel = supabase
        .channel('attempts_changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'attempts',
            filter: `status=in.(submitted,auto_submitted)`
          },
          () => fetchRecentResults()
        )
        .subscribe();
    } catch (error) {
      console.warn('Failed to set up real-time subscription:', error);
    }

    const interval = setInterval(() => {
      fetchRecentResults();
    }, 30000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchRecentResults]);

  const getScoreStyles = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  const getScoreDescription = (percentage: number) => {
    if (percentage >= 90) return "Outstanding Performance!";
    if (percentage >= 80) return "Great work, keep it up!";
    if (percentage >= 60) return "Good attempt, can improve.";
    return "Keep practicing, you'll get there.";
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-slate-200/50 rounded-xl"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in-up">
      <div className="flex items-center justify-between pl-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Recent Activity</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Summary of your latest performances</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/10">
          <Award className="h-6 w-6 text-primary" />
        </div>
      </div>

      {results.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] p-16 text-center border-dashed border-2 grow">
          <div className="bg-slate-50 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Award className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Activity Log Empty</h3>
          <p className="text-slate-500 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">
            Your results will populate here once you finalize your first assessment session.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {results.map((result) => {
            const percentage = Math.round((result.score / result.max_score) * 100);
            return (
              <div key={result.id} className="group glass-card rounded-[2rem] p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${percentage >= 80 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : percentage >= 60 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`} />
                      <h3 className="font-black text-slate-800 text-xl group-hover:text-primary transition-colors truncate tracking-tight">{result.test_name}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-5">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200/50">
                        <Calendar className="h-3.5 w-3.5 text-primary/60" />
                        <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                      </div>
                      {result.time_taken && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200/50">
                          <Clock className="h-3.5 w-3.5 text-primary/60" />
                          <span>{result.time_taken} MINS</span>
                        </div>
                      )}
                      <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {result.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row items-center gap-6 pt-4 sm:pt-0 sm:border-l border-slate-100/80 sm:pl-8">
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">{percentage}%</span>
                        <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getScoreStyles(percentage)} shadow-sm`}>
                          {percentage >= 80 ? 'EXPERT' : percentage >= 60 ? 'SKILLED' : 'NOVICE'}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight italic line-clamp-1">{getScoreDescription(percentage)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-2xl bg-primary/5 text-primary hover:bg-primary hover:text-white hover:rotate-12 transition-all duration-300 shadow-sm grow-0 shrink-0"
                      onClick={() => {
                        toast({
                          title: result.test_name,
                          description: `Session Result: ${result.score}/${result.max_score} | Efficiency: ${percentage}%`,
                        });
                      }}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Performance track bar */}
                <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-1500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)] ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button className="w-full h-16 rounded-[1.5rem] bg-white border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-300 text-xs font-black uppercase tracking-[0.2em] group">
        <span>ARCHIVED ASSIGNMENTS</span>
        <div className="ml-2 w-5 h-px bg-slate-300 group-hover:bg-primary group-hover:w-8 transition-all" />
      </Button>
    </div>
  );
};
