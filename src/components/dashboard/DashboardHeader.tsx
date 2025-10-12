import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brain, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  studentName?: string;
}

export const DashboardHeader = ({ studentName = "John Doe" }: HeaderProps) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const initials = studentName
    .split(" ")
    .map(name => name[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Portal Logo/Name */}
          <div className="flex items-center gap-3">
            <img 
              src="/SkILA.svg" 
              alt="SkILA Logo" 
              className="h-12 w-auto"
            />
          </div>

          {/* Center: Welcome Message */}
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-foreground">
              Welcome, <span className="text-gradient">{studentName}</span>
            </h1>
          </div>

          {/* Right: Profile Dropdown */}
          <div className="flex items-center gap-4">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 h-auto p-2 hover:bg-muted/50 transition-smooth"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={studentName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56 bg-white border shadow-card">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium text-foreground">{studentName}</p>
                  <p className="text-xs text-muted-foreground">Student Account</p>
                </div>
                
                <DropdownMenuItem className="cursor-pointer hover:bg-muted/50">
                  <User className="mr-2 h-4 w-4" />
                  My Account
                </DropdownMenuItem>
                
                <DropdownMenuItem className="cursor-pointer hover:bg-muted/50">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-destructive/10 text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};