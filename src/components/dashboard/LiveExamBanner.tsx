import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LiveExam {
    id: string;
    title: string;
    type: 'code' | 'mcq';
    end_at: string;
}

export const LiveExamBanner = () => {
    const [liveExams, setLiveExams] = useState<LiveExam[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLiveExams();
    }, []);

    const fetchLiveExams = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get user's batch memberships
            const { data: userBatches } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('user_id', user.id);

            if (!userBatches || userBatches.length === 0) return;
            const userBatchIds = userBatches.map(b => b.batch_id);

            const now = new Date().toISOString();

            // 2. Fetch Active Coding Test Assignments
            const { data: codeAssignments } = await supabase
                .from('test_assignments')
                .select(`
          test_id,
          end_at,
          tests(name)
        `)
                .in('batch_id', userBatchIds)
                .lte('start_at', now)
                .gte('end_at', now);

            // 3. Fetch Active MCQ Test Assignments
            const { data: mcqAssignments } = await (supabase as any)
                .from('mcq_test_assignments')
                .select(`
          test_id,
          end_at,
          mcq_tests(title)
        `)
                .in('batch_id', userBatchIds)
                .lte('start_at', now)
                .gte('end_at', now);

            // 4. Fetch User Attempts to filter out submitted ones
            const { data: codeAttempts } = await supabase
                .from('attempts')
                .select('test_id, status')
                .eq('user_id', user.id);

            const { data: mcqAttempts } = await (supabase as any)
                .from('mcq_attempts')
                .select('test_id, status')
                .eq('user_id', user.id);

            const submittedTestIds = new Set([
                ...(codeAttempts || []).filter(a => a.status === 'submitted' || a.status === 'auto_submitted').map(a => a.test_id),
                ...(mcqAttempts || []).filter(a => a.status === 'submitted' || a.status === 'auto_submitted').map(a => a.test_id)
            ]);

            const active: LiveExam[] = [];

            codeAssignments?.forEach(a => {
                if (!submittedTestIds.has(a.test_id)) {
                    active.push({
                        id: a.test_id,
                        title: a.tests?.name || 'Coding Test',
                        type: 'code',
                        end_at: a.end_at
                    });
                }
            });

            mcqAssignments?.forEach((a: any) => {
                if (!submittedTestIds.has(a.test_id)) {
                    active.push({
                        id: a.test_id,
                        title: a.mcq_tests?.title || 'MCQ Test',
                        type: 'mcq',
                        end_at: a.end_at
                    });
                }
            });

            setLiveExams(active);
        } catch (error) {
            console.error('Error fetching live exams for banner:', error);
        }
    };

    if (liveExams.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {liveExams.map((exam) => (
                <Alert key={exam.id} className="relative overflow-hidden border-primary/20 bg-primary/5 dark:bg-primary/10 backdrop-blur-sm border-l-4 border-l-primary py-4 px-6 rounded-2xl shadow-lg group transition-all hover:shadow-xl hover:bg-primary/10">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Play className="w-24 h-24 text-primary" strokeWidth={1} />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/20 rounded-xl mt-0.5">
                                <AlertCircle className="h-6 w-6 text-primary animate-pulse" />
                            </div>
                            <div>
                                <AlertTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                    Ongoing {exam.type === 'code' ? 'Coding' : 'MCQ'} Assessment
                                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                                </AlertTitle>
                                <AlertDescription className="text-muted-foreground mt-1 max-w-lg">
                                    You have an active test: <span className="font-semibold text-foreground">"{exam.title}"</span>.
                                    It will expire on {new Date(exam.end_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                                </AlertDescription>
                            </div>
                        </div>

                        <Button
                            onClick={() => navigate(exam.type === 'code' ? `/exam/${exam.id}` : `/mcq/test/${exam.id}`)}
                            className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-all"
                        >
                            Start Now
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </Alert>
            ))}
        </div>
    );
};
