import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ArrowRight, Play, CheckCircle2, Clock, RefreshCcw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface LiveExam {
    id: string;
    title: string;
    type: 'code' | 'mcq';
    end_at: string;
    // Session state
    hasActiveAttempt: boolean;
    attemptStatus: 'fresh' | 'active' | 'expired' | 'submitted';
    timeRemainingMs?: number;
    score?: number;
    maxScore?: number;
}

export const LiveExamBanner = () => {
    const [liveExams, setLiveExams] = useState<LiveExam[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLiveExams();
        // Refresh every 30 seconds to keep time remaining accurate
        const interval = setInterval(fetchLiveExams, 30000);
        return () => clearInterval(interval);
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

            // 4. Fetch ALL User Attempts (not just submitted ones)
            const { data: codeAttempts } = await supabase
                .from('attempts')
                .select('test_id, status, ends_at, score, max_score')
                .eq('user_id', user.id);

            const { data: mcqAttempts } = await (supabase as any)
                .from('mcq_attempts')
                .select('test_id, status, ends_at, score, max_score')
                .eq('user_id', user.id);

            // Build a map of test_id -> attempt info
            const attemptMap = new Map<string, { status: string; ends_at: string; score?: number; maxScore?: number }>();
            for (const a of (codeAttempts || [])) {
                const existing = attemptMap.get(a.test_id);
                // Keep the most relevant status (active > submitted > auto_submitted)
                if (!existing || a.status === 'active' ||
                    (a.status === 'submitted' && existing.status !== 'active')) {
                    attemptMap.set(a.test_id, {
                        status: a.status,
                        ends_at: a.ends_at,
                        score: a.score,
                        maxScore: a.max_score
                    });
                }
            }
            for (const a of (mcqAttempts || [])) {
                const existing = attemptMap.get(a.test_id);
                if (!existing || a.status === 'active' ||
                    (a.status === 'submitted' && existing.status !== 'active')) {
                    attemptMap.set(a.test_id, {
                        status: a.status,
                        ends_at: a.ends_at,
                        score: a.score,
                        maxScore: a.max_score
                    });
                }
            }

            const active: LiveExam[] = [];
            const currentTime = new Date();

            codeAssignments?.forEach(a => {
                const attempt = attemptMap.get(a.test_id);
                let attemptStatus: LiveExam['attemptStatus'] = 'fresh';
                let hasActiveAttempt = false;
                let timeRemainingMs: number | undefined;

                if (attempt) {
                    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
                        attemptStatus = 'submitted';
                    } else if (attempt.status === 'active') {
                        const endsAt = new Date(attempt.ends_at);
                        if (currentTime > endsAt) {
                            attemptStatus = 'expired';
                        } else {
                            attemptStatus = 'active';
                            hasActiveAttempt = true;
                            timeRemainingMs = endsAt.getTime() - currentTime.getTime();
                        }
                    }
                }

                // Don't show submitted tests
                if (attemptStatus === 'submitted') return;

                active.push({
                    id: a.test_id,
                    title: a.tests?.name || 'Coding Test',
                    type: 'code',
                    end_at: a.end_at,
                    hasActiveAttempt,
                    attemptStatus,
                    timeRemainingMs,
                    score: attempt?.score,
                    maxScore: attempt?.maxScore
                });
            });

            mcqAssignments?.forEach((a: any) => {
                const attempt = attemptMap.get(a.test_id);
                let attemptStatus: LiveExam['attemptStatus'] = 'fresh';
                let hasActiveAttempt = false;
                let timeRemainingMs: number | undefined;

                if (attempt) {
                    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
                        attemptStatus = 'submitted';
                    } else if (attempt.status === 'active') {
                        const endsAt = new Date(attempt.ends_at);
                        if (currentTime > endsAt) {
                            attemptStatus = 'expired';
                        } else {
                            attemptStatus = 'active';
                            hasActiveAttempt = true;
                            timeRemainingMs = endsAt.getTime() - currentTime.getTime();
                        }
                    }
                }

                if (attemptStatus === 'submitted') return;

                active.push({
                    id: a.test_id,
                    title: a.mcq_tests?.title || 'MCQ Test',
                    type: 'mcq',
                    end_at: a.end_at,
                    hasActiveAttempt,
                    attemptStatus,
                    timeRemainingMs,
                    score: attempt?.score,
                    maxScore: attempt?.maxScore
                });
            });

            setLiveExams(active);
        } catch (error) {
            console.error('Error fetching live exams for banner:', error);
        }
    };

    const formatTimeRemaining = (ms: number) => {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
    };

    if (liveExams.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {liveExams.map((exam) => {
                const isResume = exam.attemptStatus === 'active';
                const isExpired = exam.attemptStatus === 'expired';

                return (
                    <Alert
                        key={exam.id}
                        className={`relative overflow-hidden border-l-4 py-5 px-6 rounded-2xl shadow-lg group transition-all hover:shadow-xl ${isResume
                                ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10 border-l-amber-500 hover:bg-amber-500/10'
                                : isExpired
                                    ? 'border-red-500/20 bg-red-500/5 border-l-red-500'
                                    : 'border-primary/20 bg-primary/5 dark:bg-primary/10 border-l-primary hover:bg-primary/10'
                            } backdrop-blur-sm`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            {isResume ? (
                                <RefreshCcw className="w-24 h-24 text-amber-500" strokeWidth={1} />
                            ) : (
                                <Play className="w-24 h-24 text-primary" strokeWidth={1} />
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl mt-0.5 ${isResume ? 'bg-amber-500/20' : isExpired ? 'bg-red-500/20' : 'bg-primary/20'
                                    }`}>
                                    {isResume ? (
                                        <Clock className="h-6 w-6 text-amber-500 animate-pulse" />
                                    ) : isExpired ? (
                                        <AlertCircle className="h-6 w-6 text-red-500" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-primary animate-pulse" />
                                    )}
                                </div>
                                <div>
                                    <AlertTitle className={`text-xl font-bold flex items-center gap-3 ${isResume ? 'text-amber-600 dark:text-amber-400' : isExpired ? 'text-red-500' : 'text-primary'
                                        }`}>
                                        {isResume ? (
                                            <>
                                                Resume Your {exam.type === 'code' ? 'Coding' : 'MCQ'} Exam
                                                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                    IN PROGRESS
                                                </Badge>
                                            </>
                                        ) : isExpired ? (
                                            <>Session Expired</>
                                        ) : (
                                            <>
                                                Ongoing {exam.type === 'code' ? 'Coding' : 'MCQ'} Assessment
                                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                                            </>
                                        )}
                                    </AlertTitle>
                                    <AlertDescription className="text-muted-foreground mt-1.5 max-w-lg text-sm">
                                        {isResume ? (
                                            <>
                                                You have an active session for <span className="font-bold text-foreground">"{exam.title}"</span>.
                                                {exam.timeRemainingMs && (
                                                    <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
                                                        {formatTimeRemaining(exam.timeRemainingMs)}
                                                    </span>
                                                )}
                                                . Your progress has been saved.
                                            </>
                                        ) : isExpired ? (
                                            <>Your session for <span className="font-bold text-foreground">"{exam.title}"</span> has expired and been auto-submitted.</>
                                        ) : (
                                            <>
                                                You have a pending test: <span className="font-semibold text-foreground">"{exam.title}"</span>.
                                                Window closes {new Date(exam.end_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                                            </>
                                        )}
                                    </AlertDescription>
                                    {isResume && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Shield className="h-3 w-3 text-muted-foreground/60" />
                                            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                                                Session Protected · Auto-Save Enabled · 3 Reconnect Attempts
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isExpired && (
                                <Button
                                    onClick={() => navigate(exam.type === 'code' ? `/exam/${exam.id}` : `/mcq/test/${exam.id}`)}
                                    className={`font-bold px-8 py-6 rounded-xl shadow-lg transition-all group-hover:scale-105 ${isResume
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                            : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                        }`}
                                >
                                    {isResume ? (
                                        <>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Resume Exam
                                        </>
                                    ) : (
                                        <>
                                            Start Now
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </Alert>
                );
            })}
        </div>
    );
};
