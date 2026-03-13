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
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg"></div>
        <Card className="border-0 bg-white/50 backdrop-blur-md">
          <CardContent className="p-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground font-medium italic">Analyzing results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
          <p className="text-sm text-muted-foreground mt-1">Summary of your latest performances</p>
        </div>
        <div className="p-2 bg-primary/5 rounded-xl">
          <Award className="h-5 w-5 text-primary" />
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="border-0 bg-white/40 backdrop-blur-md rounded-3xl p-12 text-center border-dashed border-2 border-slate-200">
          <CardContent className="p-0">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No Results Found</h3>
            <p className="text-slate-500 text-sm max-w-[240px] mx-auto leading-relaxed">
              Your recent performances will appear here once you complete an assessment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => {
            const percentage = Math.round((result.score / result.max_score) * 100);
            return (
              <Card key={result.id} className="group overflow-hidden border border-white/40 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${percentage >= 60 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-primary transition-colors">{result.test_name}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded-md">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                        </div>
                        {result.time_taken && (
                          <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded-md">
                            <Clock className="h-3 w-3" />
                            <span>{result.time_taken} min</span>
                          </div>
                        )}
                        <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-500 font-bold bg-white">
                          {result.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto pt-4 sm:pt-0 sm:border-l border-slate-100 sm:pl-6">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-2xl font-black text-slate-800">{percentage}%</span>
                          <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${getScoreStyles(percentage)}`}>
                            {percentage >= 80 ? 'Mastery' : percentage >= 60 ? 'Competent' : 'Novice'}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-1 italic line-clamp-1">{getScoreDescription(percentage)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors ml-auto"
                        onClick={() => {
                          toast({
                            title: result.test_name,
                            description: `Final Score: ${result.score}/${result.max_score} (${percentage}%)`,
                          });
                        }}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Visual progress bar at bottom of card */}
                  <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="ghost" className="w-full py-6 rounded-2xl border-dashed border-2 border-slate-200 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold">
        Show All History
      </Button>
    </div>
  );
};
