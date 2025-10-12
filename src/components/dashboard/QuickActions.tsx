import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Play, Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Subject-Based Tests",
      subtitle: "Choose language & begin",
      icon: BookOpen,
      buttonText: "Start Test",
      gradient: "from-primary to-primary-glow",
      onClick: () => {
        // Navigate to subject selection (we'll create this later)
        console.log("Navigate to subject tests");
      }
    },
    {
      title: "Class Tests",
      subtitle: "See tests assigned by your trainer",
      icon: Users,
      buttonText: "View Tests",
      gradient: "from-secondary to-accent",
      onClick: () => {
        // Navigate to class tests (we'll create this later)
        console.log("Navigate to class tests");
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
            className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient"
            onClick={action.onClick}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-sm`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-muted-foreground mb-4 text-sm">
                {action.subtitle}
              </p>
              
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