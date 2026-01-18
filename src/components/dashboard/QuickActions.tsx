import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, ArrowRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Learning Assessments",
      subtitle: "Choose language & begin your learning journey",
      icon: BookOpen,
      buttonText: "Start Assessment",
      gradient: "from-primary to-primary-glow",
      onClick: () => {
        window.open("https://learn.globaloneservices.com", "_blank");
      }
    },
    {
      title: "MCQ Assessments",
      subtitle: "Take multiple choice question tests",
      icon: FileText,
      buttonText: "MCQ Dashboard",
      gradient: "from-purple-500 to-purple-600",
      onClick: () => {
        navigate("/mcq");
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Quick Actions</h2>
        <p className="text-muted-foreground">Start a test or check your assignments</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {actions.map((action, index) => (
          <Card 
            key={index} 
            className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer border border-border/50 bg-card-gradient overflow-hidden"
            onClick={action.onClick}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md flex-shrink-0`}>
                  <action.icon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                    {action.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {action.subtitle}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Button 
                variant="auth"
                className="w-full group-hover:shadow-glow transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.buttonText}
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};