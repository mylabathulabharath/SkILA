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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-1000">
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Recommended Focus Area */}
                <Card className="lg:col-span-2 glass-card rounded-[3rem] border-primary/10 shadow-premium-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-1000"></div>
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-6 border-b border-primary/5">
                        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                            Personalized Focus Track
                        </CardTitle>
                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full">AI Recommended</Badge>
                    </CardHeader>
                    <CardContent className="relative z-10 p-8">
                        {weakestSubjects.length > 0 ? (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Flame className="h-4 w-4 text-orange-500" />
                                            Primary Domain: {weakestSubjects[0].subject}
                                        </h4>
                                        <span className="text-xl font-black text-primary">{weakestSubjects[0].score}% Proficiency</span>
                                    </div>
                                    <Progress value={weakestSubjects[0].score} className="h-3 bg-slate-50 [&>div]:bg-primary rounded-full shadow-inner" />
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed italic border-l-2 border-primary/20 pl-4 mt-6">
                                        "Strategic opportunity detected. Enhancing your {weakestSubjects[0].subject} fundamentals will accelerate your overall cognitive accuracy by approximately 12%."
                                    </p>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-6 pt-4">
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group/item hover:bg-white hover:border-primary/20 transition-all duration-300">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2">Recommended Activity</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight">MCQ Conceptual Refresher</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group/item hover:bg-white hover:border-secondary/20 transition-all duration-300">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2">Cognitive Complexity</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight">Adaptive Intermediate</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto grayscale opacity-50">
                                    <Target className="h-8 w-8 text-primary" />
                                </div>
                                <p className="text-slate-400 font-bold text-sm tracking-tight italic">Initial performance mapping in progress...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Skill Momentum / LMS Card */}
                <Card className="glass-card rounded-[3rem] bg-slate-900 border-none shadow-premium relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -mr-32 -mb-32"></div>
                    <CardHeader className="relative z-10 pb-6 border-b border-white/5">
                        <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-xl">
                                <Zap className="h-6 w-6 text-primary-glow" />
                            </div>
                            Cloud LMS
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 p-8 space-y-8">
                        <div className="space-y-6">
                            {[
                                { label: "Course Velocity", value: "84%", color: "text-emerald-400" },
                                { label: "Engagement Rank", value: "TOP 5%", color: "text-primary-glow" }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between group/row">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{s.label}</span>
                                    <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-10">
                            <Button 
                                className="w-full h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-[0.2em] text-[10px] transition-all group/btn flex items-center justify-between px-8"
                                onClick={() => window.open("https://learn.globaloneservices.com", "_blank")}
                            >
                                LEARN GLOBAL ONE
                                <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Roadmap Visualization */}
            <div className="glass-card rounded-[3.5rem] bg-slate-50/50 p-12 border border-slate-100">
                <div className="text-center mb-16 space-y-2">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Academic <span className="text-gradient">Milestones</span></h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Phase-based cognitive verification</p>
                </div>
                
                <div className="relative max-w-5xl mx-auto px-4">
                    {/* Background Line */}
                    <div className="absolute top-[40px] left-12 right-12 h-0.5 bg-slate-200 hidden md:block"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 md:gap-4">
                        {[
                            { name: "Fundamentals", icon: BookOpen, status: "completed", desc: "Core Logic" },
                            { name: "Validation", icon: Zap, status: "active", desc: "In-Depth" },
                            { name: "Speciality", icon: Target, status: "upcoming", desc: "Advanced" },
                            { name: "Gold Mastery", icon: Trophy, status: "locked", desc: "Certified" }
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center md:items-center text-center z-10 group flex-1">
                                <div className={`
                                    w-20 h-20 rounded-[2rem] flex items-center justify-center border-4 shadow-xl transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-3
                                    ${step.status === 'completed' ? 'bg-primary border-primary/20 text-white' :
                                    step.status === 'active' ? 'bg-white border-primary text-primary shadow-primary/20' :
                                    'bg-white border-slate-100 text-slate-300'}
                                `}>
                                    <step.icon className={`h-8 w-8 ${step.status === 'active' ? 'animate-pulse' : ''}`} />
                                </div>
                                <div className="mt-6 space-y-1">
                                    <p className={`text-sm font-black uppercase tracking-widest ${step.status === 'active' ? 'text-primary' : 'text-slate-500'}`}>
                                        {step.name}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{step.desc}</p>
                                </div>
                                <div className="mt-4">
                                    {step.status === 'completed' ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">Verified</Badge>
                                    ) : step.status === 'active' ? (
                                        <Badge className="bg-primary text-white border-none px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm">Syncing</Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-slate-100 text-slate-300 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase italic">Locked</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
