import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, Flame } from "lucide-react";

export const ProgressSnapshot = () => {
  // Mock data for progress
  const progressData = {
    totalSolved: 47,
    totalQuestions: 500,
    accuracy: 82,
    streak: 3,
    recentTests: [
      { name: "Java Basics", score: 85, date: "2 days ago" },
      { name: "Data Structures", score: 78, date: "1 week ago" },
      { name: "Algorithms", score: 92, date: "2 weeks ago" }
    ]
  };

  const completionPercentage = (progressData.totalSolved / progressData.totalQuestions) * 100;

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Your Progress
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your learning journey and see how far you've come.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Progress Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Target className="w-5 h-5 text-primary" />
                Overall Progress
              </CardTitle>
              <CardDescription>
                Your coding journey so far
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Questions Solved</span>
                  <span className="text-sm text-muted-foreground">
                    {progressData.totalSolved} / {progressData.totalQuestions}
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
                <div className="text-xs text-muted-foreground mt-1">
                  {completionPercentage.toFixed(1)}% complete
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {progressData.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center p-4 bg-secondary/5 rounded-lg border border-secondary/10">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-secondary mb-1">
                    <Flame className="w-6 h-6" />
                    {progressData.streak}
                  </div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Performance */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Performance
              </CardTitle>
              <CardDescription>
                Your latest test scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressData.recentTests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                    <div>
                      <div className="font-medium text-foreground">{test.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {test.date}
                      </div>
                    </div>
                    <Badge 
                      variant={test.score >= 80 ? "default" : test.score >= 60 ? "secondary" : "destructive"}
                      className="font-semibold"
                    >
                      {test.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};