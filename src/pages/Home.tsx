import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Trophy,
  Users,
  Clock,
  TrendingUp,
  BookOpen,
  Code,
  CheckCircle,
  Star,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/home/Navigation";

interface FeaturedChallenge {
  id: string;
  title: string;
  difficulty: string;
  language: string;
  attempts: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  streak: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [featuredChallenges, setFeaturedChallenges] = useState<FeaturedChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      // Mock data for initial state
      setFeaturedChallenges([
        { id: '1', title: 'Data Structures Mastery', difficulty: 'Advanced', language: 'Python', attempts: 1240 },
        { id: '2', title: 'Full Stack Integration', difficulty: 'Intermediate', language: 'JavaScript', attempts: 940 },
        { id: '3', title: 'Cloud Infrastructure', difficulty: 'Expert', language: 'DevOps', attempts: 850 },
        { id: '4', title: 'AI/ML Fundamentals', difficulty: 'Intermediate', language: 'Python', attempts: 2100 }
      ]);

      setLeaderboard([
        { rank: 1, name: 'Candidate #4082', score: 9800, streak: 12 },
        { rank: 2, name: 'Candidate #1293', score: 9450, streak: 8 },
        { rank: 3, name: 'Candidate #3301', score: 9200, streak: 15 }
      ]);
    };

    fetchHomeData();
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-primary/20">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[80%] h-[100%] bg-gradient-to-bl from-primary/5 via-transparent to-transparent -z-10 blur-3xl" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10 animate-float" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float stagger-2" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-12">
            <div className="space-y-6 animate-slide-in-up">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm">
                Next-Gen Institutional Assessment
              </Badge>
              <h1 className="text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] max-w-5xl">
                The Gold Standard in <br />
                <span className="text-gradient">Intelligent Testing.</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                Empowering universities with precision technical assessments, automated proctoring, and deep talent analytics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 animate-slide-in-up stagger-2">
              <Button
                size="lg"
                className="btn-premium h-16 px-12 rounded-2xl shadow-primary group overflow-hidden"
                onClick={() => navigate('/login')}
              >
                <span className="relative z-10 text-sm font-black uppercase tracking-widest flex items-center">
                  Get Institutional Access
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 px-10 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase tracking-widest text-xs transition-all"
                onClick={() => navigate('/login')}
              >
                Request a Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-20 animate-slide-in-up stagger-3 flex flex-col items-center gap-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Grade Security & Compliance</p>
              <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                <div className="text-2xl font-black text-slate-800 tracking-tighter">GLOBAL <span className="text-primary">ONE</span></div>
                <div className="text-2xl font-black text-slate-800 tracking-tighter">SKILLA <span className="text-secondary text-lg uppercase tracking-[0.2em] ml-1">Enterprise</span></div>
                <div className="text-2xl font-black text-slate-800 tracking-tighter">EDU <span className="text-primary-glow">SYNC</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { label: "Faculty Members", value: "2,000+", icon: Users },
            { label: "Success Rate", value: "99.9%", icon: CheckCircle },
            { label: "Average Skill Gain", value: "48%", icon: TrendingUp }
          ].map((stat, i) => (
            <div key={i} className={`glass-card p-10 rounded-[3rem] border border-slate-100 shadow-premium-sm group hover:-translate-y-2 transition-all duration-500 animate-reveal stagger-${i+1}`}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <stat.icon className="h-8 w-8" />
                </div>
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center mb-24 space-y-4 animate-reveal">
          <h2 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter">Built for <span className="text-gradient">Academics.</span></h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Precision tools for every stakeholder in the education ecosystem.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          <div className="group relative overflow-hidden rounded-[3.5rem] bg-slate-900 p-12 text-white animate-reveal stagger-1">
            <div className="relative z-10 space-y-8">
              <div className="inline-flex p-4 rounded-2xl bg-white/10 text-primary-glow">
                <Users className="h-8 w-8" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black tracking-tight">For Faculty & Admin</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Deep analytics into student performance, automated batch management, and a robust question bank for private exam creation.
                </p>
              </div>
              <ul className="space-y-4">
                {["LMS Integration", "Plagiarism Detection", "Automated Grading"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-[3.5rem] border border-slate-100 p-12 animate-reveal stagger-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative z-10 space-y-8">
              <div className="inline-flex p-4 rounded-2xl bg-primary text-white">
                <Code className="h-8 w-8" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">For Students</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Interactive pathways, real-time performance tracking, and direct access to global learning resources.
                </p>
              </div>
              <ul className="space-y-4">
                {["Personalized Tracks", "Career Readiness", "Skill Validation"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="bg-slate-50 py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 animate-reveal">
            <div className="space-y-4">
              <h3 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter">Premium <span className="text-gradient">Assessments.</span></h3>
              <p className="text-lg text-slate-500 font-medium">Industry-standard validations for the modern workforce.</p>
            </div>
            <Button variant="ghost" className="font-black uppercase tracking-widest text-[10px] text-primary" onClick={() => navigate('/login')}>
              View All Certifications <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredChallenges.map((challenge, i) => (
              <div key={challenge.id} className={`glass-card p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group cursor-pointer bg-white animate-reveal stagger-${i+1}`}>
                <div className="flex flex-col h-full space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Code className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="uppercase text-[9px] font-black tracking-widest bg-emerald-50 text-emerald-600 border-none px-3 py-1">
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors leading-tight">
                      {challenge.title}
                    </h4>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{challenge.language}</p>
                  </div>
                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <Users className="h-3 w-3" />
                      {challenge.attempts} Enrolled
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-4 animate-reveal">
            <h3 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">Global <span className="text-gradient">Rankings</span></h3>
            <p className="text-lg text-slate-500 font-medium max-w-lg mx-auto">
              Real-time validation of top talent across university clouds.
            </p>
          </div>

          <div className="glass-card rounded-[3rem] p-4 shadow-premium-sm border border-slate-100 animate-reveal stagger-1">
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.rank}
                    className="flex items-center justify-between p-5 rounded-2xl bg-white hover:bg-slate-50/50 transition-all duration-300 border border-transparent hover:border-slate-100 group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {entry.rank}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-lg">{entry.name}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {entry.score} Points
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-primary">{entry.streak} Day Streak</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-200 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                ))}
                
                <div className="px-5 py-6 text-center">
                  <Button variant="ghost" className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors" onClick={() => navigate('/login')}>
                    View Full Cloud Access
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Trophy className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Intelligence Initializing</h3>
                <p className="text-sm text-slate-500 font-medium mb-10 max-w-xs mx-auto">Rankings are updated every 24 hours based on institutional performance.</p>
                <Button variant="auth" onClick={() => navigate('/login')} className="rounded-xl h-12 shadow-primary">
                  Start Validation
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 px-8 py-24 text-center group animate-reveal">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-20 blur-[120px] rounded-full -mr-48 -mt-48 group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary opacity-20 blur-[120px] rounded-full -ml-48 -mb-48 group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <h3 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
              Modernize Your <br />
              <span className="text-primary-glow">Education Engine.</span>
            </h3>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Join 500+ institutions already leveraging SkILA for precision skill validation.
            </p>
            <Button
              className="h-16 px-12 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 shadow-2xl transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              <span className="text-sm font-black uppercase tracking-widest">Register Institution</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid gap-16 md:grid-cols-4">
            <div className="space-y-8">
              <img src="/SkILA.svg" alt="SkILA" className="h-8 w-auto" />
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Institutional-grade platform for precision technical assessment and intelligent talent cloud management.
              </p>
            </div>

            {[
              { title: "Platform", items: ["Assessment", "Automated Proctoring", "Practice Banks", "Cloud Analytics"] },
              { title: "Enterprise", items: ["University Portal", "Faculty Tools", "HIRING API", "SSO Access"] },
              { title: "Company", items: ["Our Vision", "Ethics in AI", "Privacy", "Compliance"] }
            ].map((col, i) => (
              <div key={i} className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{col.title}</h4>
                <ul className="space-y-4">
                  {col.items.map((item, j) => (
                    <li key={j}>
                      <button className="text-[13px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-24 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              © 2025 SKILA ARTIFICIAL INTELLIGENCE. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-8">
              {['System Status', 'Legal', 'Privacy'].map(link => (
                <span key={link} className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors cursor-pointer uppercase tracking-widest">
                  {link}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;