import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialLoginButtons } from "./SocialLoginButtons";

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [trainerFormData, setTrainerFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    trainerCode: "",
  });
  const [showTrainerPassword, setShowTrainerPassword] = useState(false);
  const [showTrainerConfirmPassword, setShowTrainerConfirmPassword] = useState(false);
  const [isTrainerLoading, setIsTrainerLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = "https://exam.globaloneservices.com/";

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // With email confirmation OFF, signUp returns a session → log straight in.
      // With it ON, no session → tell them to check their email.
      if (data.session) {
        toast({ title: "Welcome to SkILA!", description: "Your account is ready." });
        navigate("/dashboard");
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to confirm your account, then log in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainerFormData.fullName || !trainerFormData.email || !trainerFormData.password || !trainerFormData.confirmPassword || !trainerFormData.trainerCode) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (trainerFormData.trainerCode !== "TRAINER") {
      toast({
        title: "Invalid Code",
        description: "The trainer code is incorrect. Please enter 'TRAINER'.",
        variant: "destructive",
      });
      return;
    }

    if (trainerFormData.password !== trainerFormData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (trainerFormData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsTrainerLoading(true);

    try {
      const redirectUrl = "https://exam.globaloneservices.com/";

      // Sign up the user with trainer flag in metadata
      const { data, error } = await supabase.auth.signUp({
        email: trainerFormData.email,
        password: trainerFormData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: trainerFormData.fullName,
            is_trainer: true, // Flag to indicate trainer registration
          },
        },
      });

      if (error) {
        throw error;
      }

      // The role is now set automatically by the database trigger based on is_trainer flag
      // No need to manually update the profile

      // If user is automatically signed in, navigate to trainer dashboard
      if (data.session) {
        navigate('/trainer');
      } else {
        // For now, removing the explicit "Email Verification Required" requirement
        toast({
          title: "Trainer Account Created!",
          description: "Your trainer account has been created successfully. You can now log in.",
        });
      }

      // Reset form and close modal
      setTrainerFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        trainerCode: "",
      });
      setIsTrainerModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create trainer account",
        variant: "destructive",
      });
    } finally {
      setIsTrainerLoading(false);
    }
  };

  const handleTrainerInputChange = (field: string, value: string) => {
    setTrainerFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
            Official Full Name
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              id="fullName"
              type="text"
              placeholder="e.g. Alexander Pierce"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              className="h-14 pl-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
            Institutional Email
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              id="register-email"
              type="email"
              placeholder="e.g. alex@university.edu"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-14 pl-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="register-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
              Secure Password
            </Label>
            <div className="relative group">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="h-14 pl-5 pr-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-300 hover:text-primary transition-all"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
              Verify Password
            </Label>
            <div className="relative group">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="h-14 pl-5 pr-12 bg-white/50 border-slate-200/50 rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-primary/30 transition-all duration-300 shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-300 hover:text-primary transition-all"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-15 btn-premium text-white shadow-primary rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] py-6 active:scale-[0.98] transition-all"
        disabled={isLoading}
      >
        {isLoading ? "Provisioning..." : "Initialize Student Account"}
      </Button>

      <SocialLoginButtons />

      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="w-12 h-1 bg-slate-100 rounded-full" />
        <button
          type="button"
          onClick={() => setIsTrainerModalOpen(true)}
          className="group flex flex-col items-center gap-2 transition-all"
        >
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300">
            <GraduationCap className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[9px] font-black text-slate-400 group-hover:text-primary uppercase tracking-[0.2em] transition-colors">
            Institutional Proctor Account
          </span>
        </button>
      </div>

      {/* Trainer Registration Modal */}
      <Dialog open={isTrainerModalOpen} onOpenChange={setIsTrainerModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Register as Trainer
            </DialogTitle>
            <DialogDescription>
              Enter the trainer code to register as a trainer. You'll be able to create questions and tests.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTrainerSubmit} className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trainer-fullName" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="trainer-fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={trainerFormData.fullName}
                    onChange={(e) => handleTrainerInputChange("fullName", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="trainer-email"
                    type="email"
                    placeholder="Enter your email"
                    value={trainerFormData.email}
                    onChange={(e) => handleTrainerInputChange("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="trainer-password"
                    type={showTrainerPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={trainerFormData.password}
                    onChange={(e) => handleTrainerInputChange("password", e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTrainerPassword(!showTrainerPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTrainerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer-confirm-password" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="trainer-confirm-password"
                    type={showTrainerConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={trainerFormData.confirmPassword}
                    onChange={(e) => handleTrainerInputChange("confirmPassword", e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTrainerConfirmPassword(!showTrainerConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTrainerConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainer-code" className="text-sm font-medium">
                  Trainer Code
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="trainer-code"
                    type="text"
                    placeholder="Enter trainer code"
                    value={trainerFormData.trainerCode}
                    onChange={(e) => handleTrainerInputChange("trainerCode", e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter "Trainer Code" to register as a trainer</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsTrainerModalOpen(false)}
                disabled={isTrainerLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="auth"
                className="flex-1"
                disabled={isTrainerLoading}
              >
                {isTrainerLoading ? "Creating..." : "Register as Trainer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
};