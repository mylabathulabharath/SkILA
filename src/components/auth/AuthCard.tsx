import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { Brain, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";

export const AuthCard = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const navigateByRole = async (userId: string) => {
    // Fetch user profile from Supabase
    const { data, error } = await supabase
      .from('profiles') // replace with your table name
      .select('role')
      .eq('role', "trainer")
      .single();

    if (error || !data) {
      navigate('/dashboard'); // fallback
      return;
    }
    console.log(data.role);
    console.log("data fetched", data);

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
    <div className="w-full max-w-md mx-auto animate-float">
      <Card className="shadow-card bg-card-gradient border-0 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Brain className="h-8 w-8 text-primary" />
              <GraduationCap className="h-5 w-5 text-secondary absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gradient">
            AI-Powered Exam Portal
          </h1>
          <p className="text-muted-foreground font-medium">
            Student Access Gateway
          </p>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-subtle-gradient">
              <TabsTrigger 
                value="login" 
                className="font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register" className="mt-0">
              <RegisterForm />
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              By signing up, you agree to the{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Terms of Service
              </a>{" "}
              &{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};