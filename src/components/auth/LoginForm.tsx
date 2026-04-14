import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialLoginButtons } from "./SocialLoginButtons";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Welcome Back!",
        description: "Login successful!",
      });
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
            Institutional Email
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="e.g. candidate@skila.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 pl-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
            Access Password
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 pl-12 pr-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-300 hover:text-primary transition-all p-1.5 rounded-lg hover:bg-slate-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end px-1">
        <a
          href="#"
          className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-[0.1em] transition-all"
        >
          Recovery Center
        </a>
      </div>

      <Button
        type="submit"
        className="w-full h-15 btn-premium text-white shadow-primary rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] py-6 active:scale-[0.98] transition-all"
        disabled={isLoading}
      >
        {isLoading ? "Authenticating..." : "Authorize Portal Access"}
      </Button>

      <SocialLoginButtons />
    </form>
  );
};