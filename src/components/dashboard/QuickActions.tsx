import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, ArrowRight, FileText, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Learning Path",
      subtitle: "Choose language & begin your journey",
      description: "Interactive coding assessments to sharpen your logic and syntax skills.",
      icon: BookOpen,
      buttonText: "Resume Learning",
      gradient: "from-blue-600 to-indigo-600",
      accentIcon: Sparkles,
      onClick: () => {
        window.open("https://learn.globaloneservices.com", "_blank");
      }
    },
    {
      title: "MCQ Assessments",
      subtitle: "Master the fundamentals",
      description: "Challenge yourself with curated conceptual questions across various domains.",
      icon: FileText,
      buttonText: "View MCQ Dashboard",
      gradient: "from-purple-600 to-pink-600",
      accentIcon: Trophy,
      onClick: () => {
        navigate("/mcq");
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quick Launch</h2>
          <p className="text-sm text-muted-foreground mt-1">Jump straight into your active modules</p>
        </div>
      </div>

      <div className="grid gap-6">
        {actions.map((action, index) => (
          <Card
            key={index}
            className="group relative overflow-hidden border-0 bg-white/40 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer"
            onClick={action.onClick}
          >
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${action.gradient}`} />

            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg shadow-primary/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <action.icon className="h-8 w-8 text-white" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary uppercase tracking-tighter opacity-70">{action.subtitle}</span>
                    <action.accentIcon className="h-3 w-3 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    {action.description}
                  </p>
                </div>

                <div className="flex flex-row md:flex-col items-center gap-4">
                  <Button
                    variant="auth"
                    className="flex-1 md:w-48 group-hover:shadow-glow transition-all rounded-xl py-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    <span>{action.buttonText}</span>
                    <Play className="ml-2 h-4 w-4" />
                  </Button>

                  <div className="hidden md:flex p-2 rounded-full border border-border/50 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};