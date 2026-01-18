import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    batch: "",
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

  const batches = [
    "Computer Science 2024",
    "Information Technology 2024",
    "Electrical Engineering 2024",
    "Mechanical Engineering 2024",
    "Civil Engineering 2024",
    "Mathematics 2024",
    "Physics 2024",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.batch) {
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
      
      const { error } = await supabase.auth.signUp({
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

      toast({
        title: "Account Created!",
        description: "Registration successful! You can now log in.",
      });
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

      toast({
        title: "Trainer Account Created!",
        description: "Redirecting to trainer dashboard...",
      });

      // Reset form and close modal
      setTrainerFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        trainerCode: "",
      });
      setIsTrainerModalOpen(false);

      // If user is automatically signed in, navigate to trainer dashboard
      // Otherwise, they'll need to verify email first
      if (data.session) {
        // User is automatically signed in, navigate to trainer dashboard
        navigate('/trainer');
      } else {
        // User needs to verify email first
        // The auth state change listener in AuthCard will handle navigation after email verification
        toast({
          title: "Email Verification Required",
          description: "Please check your email to verify your account. You'll be redirected after verification.",
        });
      }
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              className="pl-10 transition-smooth focus:ring-primary/50"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email" className="text-sm font-medium text-foreground">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="register-email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="pl-10 transition-smooth focus:ring-primary/50"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="pl-10 pr-10 transition-smooth focus:ring-primary/50"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className="pl-10 pr-10 transition-smooth focus:ring-primary/50"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batch" className="text-sm font-medium text-foreground">
            Batch/Class
          </Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select value={formData.batch} onValueChange={(value) => handleInputChange("batch", value)}>
              <SelectTrigger className="pl-10 transition-smooth focus:ring-primary/50">
                <SelectValue placeholder="Select your batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch} value={batch}>
                    {batch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="auth"
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Join SkILA"}
      </Button>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setIsTrainerModalOpen(true)}
          className="text-sm text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <GraduationCap className="h-4 w-4" />
          Register as Trainer
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