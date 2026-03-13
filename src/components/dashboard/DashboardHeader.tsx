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

  const initials = studentName
    .split(" ")
    .map(name => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/10 bg-white/40 backdrop-blur-xl supports-[backdrop-filter]:bg-white/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Left: Portal Logo/Name */}
          <div className="flex items-center gap-6">
            <div className="hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img
                src="/SkILA.svg"
                alt="SkILA Logo"
                className="h-10 w-auto"
              />
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-black/5 rounded-2xl mr-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Server</span>
                <span className="text-xs font-bold text-slate-800">SkILA-Pro</span>
              </div>
            </div>

            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 h-auto p-1.5 pr-4 rounded-2xl bg-white/60 hover:bg-white border border-white/40 shadow-sm transition-all"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src="" alt={studentName} />
                    <AvatarFallback className="bg-primary text-white font-black text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start min-w-[80px]">
                    <span className="text-xs font-black text-slate-800 line-clamp-1 leading-none mb-1">{studentName}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Candidate</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-md rounded-2xl border-slate-100 shadow-2xl p-2">
                <div className="px-4 py-3 mb-2 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{studentName}</p>
                </div>

                <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-primary/5 focus:bg-primary/5 group transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Profile Details</span>
                    <span className="text-[10px] text-slate-500">View your identity info</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-slate-100 focus:bg-slate-100 group transition-colors">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Preferences</span>
                    <span className="text-[10px] text-slate-500">Configure your portal</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2 bg-slate-100" />

                <DropdownMenuItem
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-rose-50 text-rose-600 focus:text-rose-600 group transition-colors"
                  onClick={handleLogout}
                >
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">Secure Signout</span>
                    <span className="text-[10px] text-rose-400">Exit your session</span>
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