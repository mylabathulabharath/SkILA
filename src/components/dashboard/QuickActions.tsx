import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, ArrowRight, FileText, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Global One LMS",
      subtitle: "Learning Management System",
      description: "Master new skills with our comprehensive video library and interactive courses—designed to feel seamless",
      icon: BookOpen,
      buttonText: "Explore Courses",
      color: "text-blue-600",
      bgColor: "bg-blue-50/50",
      borderColor: "border-blue-100/50",
      accentIcon: Sparkles,
      onClick: () => {
        window.open("https://learn.globaloneservices.com", "_blank");
      }
    },
    {
      title: "Conceptual Mastery",
      subtitle: "MCQ Assessments",
      description: "Challenge your fundamental understanding with curated quizzes across diverse technical domains.",
      icon: FileText,
      buttonText: "Open Dashboard",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50/50",
      borderColor: "border-emerald-100/50",
      accentIcon: Trophy,
      onClick: () => {
        navigate("/mcq");
      }
    }
  ];

  return (
    <div className="space-y-8 animate-slide-in-up">
      <div className="flex items-center justify-between pl-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Quick Launch</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct access to core modules</p>
        </div>
      </div>

      <div className="grid gap-8">
        {actions.map((action, index) => (
          <div
            key={index}
            className="group relative glass-card rounded-[2rem] p-8 transition-all duration-500 hover:shadow-xl cursor-pointer"
            onClick={action.onClick}
          >
            {/* Subtle side accent */}
            <div className={`absolute top-0 left-0 w-2 h-full rounded-l-full bg-primary/20 group-hover:bg-primary transition-all duration-500`} />

            <div className="flex flex-col lg:flex-row lg:items-center gap-8 pl-4">
              <div className={`p-5 rounded-2xl ${action.bgColor} ${action.color} border ${action.borderColor} shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <action.icon className="h-10 w-10 transition-transform duration-500" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{action.subtitle}</span>
                  <action.accentIcon className="h-3 w-3 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors duration-300">
                  {action.title}
                </h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm">
                  {action.description}
                </p>
              </div>

              <div className="flex items-center gap-5">
                <Button
                  className="btn-premium h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  <span>{action.buttonText}</span>
                  <Play className="ml-2.5 h-3.5 w-3.5 fill-current" />
                </Button>

                <div className="hidden lg:flex p-3 rounded-full border border-slate-200 group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};