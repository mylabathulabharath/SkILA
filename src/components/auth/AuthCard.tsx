import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { Brain, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

export const AuthCard = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle OAuth error redirect (e.g. user denied access, provider error)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hashParams.get("error_code");
    const errorDesc = hashParams.get("error_description");
    if (errorCode && errorDesc) {
      toast({
        title: "Sign in failed",
        description: errorDesc.replace(/\+/g, " "),
        variant: "destructive",
      });
      // Clear the hash to prevent toast on refresh
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [toast]);

  useEffect(() => {
    const navigateByRole = async (userId: string) => {
    // Fetch user profile from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)  // Fixed: Use userId instead of hardcoded role
      .single();

    if (error || !data) {
      console.error('Error fetching user profile:', error);
      navigate('/dashboard'); // fallback
      return;
    }
    
    console.log('User role:', data.role);
    console.log('User data:', data);

    switch (data.role) {
      case 'student':
        navigate('/dashboard');
        break;
      case 'trainer':
        navigate('/trainer');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/dashboard');
    }
  };
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          navigateByRole(session.user.id);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        navigateByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="w-full max-w-md mx-auto relative group">
      {/* Decorative accent behind card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      
      <Card className="glass-card rounded-[2.5rem] border-0 relative overflow-hidden backdrop-blur-3xl">
        <CardHeader className="text-center pt-10 pb-8 px-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative p-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm animate-pulse">
              <Brain className="h-9 w-9 text-primary" />
              <div className="absolute -top-1 -right-1 p-1 bg-secondary rounded-lg shadow-sm">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              SkILA <span className="text-gradient">Portal</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              Intelligence Gateway
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Secure Proctoring Active</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-slate-100/50 p-1.5 rounded-[1.25rem] border border-slate-200/50">
              <TabsTrigger 
                value="login" 
                className="rounded-xl font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-300"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="rounded-xl font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-300"
              >
                Create Account
              </TabsTrigger>
            </TabsList>
            
            <div className="relative">
              <TabsContent value="login" className="mt-0 animate-in fade-in slide-in-from-left-4 duration-500">
                <LoginForm />
              </TabsContent>
              
              <TabsContent value="register" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-500">
                <RegisterForm />
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed text-center">
              By continuing, you agree to our <br />
              <a href="#" className="text-primary hover:underline transition-colors mt-1 inline-block">Terms & Privacy Policy</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};