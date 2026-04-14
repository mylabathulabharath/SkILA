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

export const DashboardHeader = ({ studentName = "Learner" }: HeaderProps) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "Your session has been securely closed.",
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

  const initials = (studentName || "Learner")
    .split(" ")
    .filter(Boolean)
    .map(name => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/20 bg-white/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Left: Portal Logo/Name */}
          <div className="flex items-center gap-6">
            <div className="hover:scale-105 transition-transform cursor-pointer active:scale-95" onClick={() => navigate('/dashboard')}>
              <img
                src="/SkILA.svg"
                alt="SkILA Logo"
                className="h-9 w-auto"
              />
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-5 px-5 py-2 bg-slate-100/50 rounded-2xl border border-slate-200/50 mr-2">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  LIVE
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Server</span>
                <span className="text-[11px] font-bold text-slate-700">SKILA-PRO</span>
              </div>
            </div>

            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 h-auto p-1.5 pr-4 rounded-2xl bg-white/80 hover:bg-white border border-white shadow-sm transition-all hover:shadow-md active:scale-95"
                >
                  <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src="" alt={studentName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start min-w-[70px]">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1 leading-none mb-1">{studentName}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Candidate</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-md rounded-2xl border-slate-100 shadow-premium p-1.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3.5 py-3 mb-1.5 bg-slate-50/80 rounded-xl border border-slate-100/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Auth Identity</p>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {initials}
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{studentName}</p>
                  </div>
                </div>

                <DropdownMenuItem 
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-slate-50 focus:bg-slate-50 group transition-colors focus:outline-none"
                  onClick={() => {
                    navigate('/profile');
                    setIsDropdownOpen(false);
                  }}
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-slate-700">Account Profile</span>
                    <span className="text-[10px] text-slate-400">Manage your details</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-slate-50 focus:bg-slate-50 group transition-colors focus:outline-none">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-slate-700">System Preferences</span>
                    <span className="text-[10px] text-slate-400">Adjust portal settings</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5 bg-slate-100/50" />

                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl hover:bg-rose-50 text-rose-600 focus:text-rose-600 group transition-colors focus:outline-none"
                  onClick={handleLogout}
                >
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px]">Secure Logout</span>
                    <span className="text-[10px] text-rose-400/80">End current session</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};