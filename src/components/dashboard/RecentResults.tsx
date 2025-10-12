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

      const { data: attempts, error } = await supabase
        .from('attempts')
        .select(`
          id,
          score,
          max_score,
          submitted_at,
          status,
          started_at,
          test_id,
          tests(
            name
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedResults = attempts?.map(attempt => {
        const timeTaken = attempt.submitted_at && attempt.started_at
          ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)
          : undefined;

        return {
          id: attempt.id,
          test_name: attempt.tests?.name || `Test ${attempt.test_id?.slice(0, 8)}`,
          score: attempt.score || 0,
          max_score: attempt.max_score || 100,
          submitted_at: attempt.submitted_at,
          status: attempt.status,
          time_taken: timeTaken
        };
      }) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching recent results:', error);
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
    
    // Set up real-time subscription to listen for new attempts
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
          (payload) => {
            console.log('Attempt updated:', payload);
            // Refresh results when an attempt is submitted
            fetchRecentResults();
          }
        )
        .subscribe();
    } catch (error) {
      console.warn('Failed to set up real-time subscription:', error);
      // Continue without real-time updates - the event-driven system will still work
    }

    // Fallback: periodic refresh every 30 seconds as backup
    const interval = setInterval(() => {
      fetchRecentResults();
    }, 30000);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error removing channel:', error);
        }
      }
      clearInterval(interval);
    };
  }, [fetchRecentResults]);

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-green-100 text-green-800";
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreLabel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Recent Results</h2>
          <p className="text-muted-foreground">Your latest test performances</p>
        </div>
        <Card className="border-0 bg-card-gradient">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading recent results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Recent Results</h2>
        <p className="text-muted-foreground">Your latest test performances</p>
      </div>

      {results.length === 0 ? (
        <Card className="border-0 bg-card-gradient">
          <CardContent className="p-8 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Results Yet</h3>
            <p className="text-muted-foreground">
              Complete your first test to see your results here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="border-0 bg-card-gradient hover:shadow-card transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{result.test_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {result.status === 'submitted' ? 'Completed' : 'Auto-submitted'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                      </div>
                      {result.time_taken && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{result.time_taken} min</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">
                          {result.score}/{result.max_score}
                        </span>
                        <Badge className={getScoreColor(result.score, result.max_score)}>
                          {getScoreLabel(result.score, result.max_score)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((result.score / result.max_score) * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
