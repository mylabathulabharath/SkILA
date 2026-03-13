import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Target, ArrowRight, Zap, Trophy, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SubjectScore {
    subject: string;
    score: number;
}

export const LearningPath = () => {
    const [weakestSubjects, setWeakestSubjects] = useState<SubjectScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const analyzePerformance = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch MCQ Responses
                const { data: mcqResponses } = await supabase
                    .from('mcq_responses' as any)
                    .select('is_correct, mcq_questions(mcq_subjects(name))');

                // Fetch Coding Submissions
                const { data: submissions } = await supabase
                    .from('submissions')
                    .select('language, verdict')
                    .eq('run_type', 'submit');

                const stats: Record<string, { passed: number; total: number }> = {};

                // Coding
                submissions?.forEach(s => {
                    const lang = s.language.charAt(0).toUpperCase() + s.language.slice(1);
                    if (!stats[lang]) stats[lang] = { passed: 0, total: 0 };
                    stats[lang].total += 1;
                    if (s.verdict === 'passed') stats[lang].passed += 1;
                });

                // MCQ
                if (mcqResponses) {
                    (mcqResponses as any[]).forEach(r => {
                        const subject = r.mcq_questions?.mcq_subjects?.name || 'General';
                        if (!stats[subject]) stats[subject] = { passed: 0, total: 0 };
                        stats[subject].total += 1;
                        if (r.is_correct) stats[subject].passed += 1;
                    });
                }

                const subjectScores: SubjectScore[] = Object.entries(stats).map(([subject, data]) => ({
                    subject,
                    score: Math.round((data.passed / data.total) * 100)
                })).sort((a, b) => a.score - b.score);

                setWeakestSubjects(subjectScores.slice(0, 3));
            } catch (error) {
                console.error('Error analyzing performance:', error);
            } finally {
                setLoading(false);
            }
        };

        analyzePerformance();
    }, []);

    if (loading) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Recommended Focus Area */}
                <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Your Priority Track
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-none">Personalized</Badge>
                    </CardHeader>
                    <CardContent>
                        {weakestSubjects.length > 0 ? (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Flame className="h-4 w-4 text-orange-500" />
                                        Focusing on: {weakestSubjects[0].subject}
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <Progress value={weakestSubjects[0].score} className="h-2 flex-1" />
                                        <span className="text-sm font-bold text-primary">{weakestSubjects[0].score}%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        You're almost there! We recommend focusing on {weakestSubjects[0].subject} concepts to boost your average.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/50 rounded-2xl border border-border/50">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Suggested Activity</p>
                                        <p className="text-sm font-semibold">MCQ Refresher</p>
                                    </div>
                                    <div className="p-4 bg-white/50 rounded-2xl border border-border/50">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Difficulty</p>
                                        <p className="text-sm font-semibold">Beginner-Inter</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm italic py-8 text-center">Take more assessments to unlock your personalized track!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Learning Statistics */}
                <Card className="bg-gradient-to-br from-orange-500/10 to-background border-orange-500/20 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            Skill Momentum
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Accuracy</span>
                                <span className="text-sm font-bold">78%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Velocity</span>
                                <span className="text-sm font-bold">High</span>
                            </div>
                            <div className="pt-4 border-t border-border/50">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm cursor-pointer hover:underline group">
                                    Continue Roadmap
                                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Roadmap Visualization */}
            <div className="relative pt-10 pb-4">
                <h3 className="text-2xl font-bold mb-8 text-center">Global Roadmap</h3>
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative max-w-4xl mx-auto">
                    {/* Connector Line */}
                    <div className="hidden md:block absolute top-[40px] left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 z-0"></div>

                    {[
                        { name: "Fundamentals", icon: BookOpen, status: "completed" },
                        { name: "Problem Solving", icon: Zap, status: "active" },
                        { name: "Core Speciality", icon: Target, status: "upcoming" },
                        { name: "Mastery", icon: Trophy, status: "locked" }
                    ].map((step, i) => (
                        <div key={i} className="flex flex-col items-center z-10 group cursor-pointer">
                            <div className={`
                w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg transition-all duration-300 transform group-hover:scale-110
                ${step.status === 'completed' ? 'bg-primary border-primary/20 text-white' :
                                    step.status === 'active' ? 'bg-white border-primary text-primary animate-pulse' :
                                        step.status === 'upcoming' ? 'bg-white border-border text-muted-foreground' :
                                            'bg-gray-50 border-gray-100 text-gray-300'}
              `}>
                                <step.icon className="h-8 w-8" />
                            </div>
                            <p className={`mt-4 text-sm font-bold text-center ${step.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.name}
                            </p>
                            {step.status === 'completed' && <Badge className="mt-2 bg-green-500 hover:bg-green-600">Done</Badge>}
                            {step.status === 'active' && <Badge className="mt-2 bg-primary">Ongoing</Badge>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
