import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Crown } from "lucide-react";

const leaderboardData = [
  { rank: 1, name: "Alice Chen", score: 2847, avatar: "AC", solved: 156, streak: 12 },
  { rank: 2, name: "Bob Johnson", score: 2634, avatar: "BJ", solved: 142, streak: 8 },
  { rank: 3, name: "Carol Davis", score: 2521, avatar: "CD", solved: 138, streak: 15 },
  { rank: 4, name: "David Wilson", score: 2398, avatar: "DW", solved: 134, streak: 6 },
  { rank: 5, name: "Emma Brown", score: 2287, avatar: "EB", solved: 128, streak: 9 },
  { rank: 6, name: "Frank Miller", score: 2156, avatar: "FM", solved: 125, streak: 4 },
  { rank: 7, name: "Grace Lee", score: 2043, avatar: "GL", solved: 119, streak: 7 },
  { rank: 8, name: "Henry Clark", score: 1934, avatar: "HC", solved: 115, streak: 3 },
  { rank: 9, name: "Ivy Rodriguez", score: 1827, avatar: "IR", solved: 108, streak: 11 },
  { rank: 10, name: "John Student", score: 1745, avatar: "JS", solved: 102, streak: 3, isCurrentUser: true }
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Award className="w-5 h-5 text-amber-600" />;
    default: return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold">#{rank}</span>;
  }
};

const getRankBadgeColor = (rank: number) => {
  if (rank <= 3) return "bg-primary text-primary-foreground";
  if (rank <= 10) return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
};

export const Leaderboard = () => {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Leaderboard
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how you rank among your peers and get motivated to climb higher.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-foreground">
              <Trophy className="w-6 h-6 text-primary" />
              Top Performers This Month
            </CardTitle>
            <CardDescription>
              Based on total score and problems solved
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {leaderboardData.map((student) => (
                <div
                  key={student.rank}
                  className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                    student.isCurrentUser ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(student.rank)}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/placeholder-${student.avatar.toLowerCase()}.jpg`} alt={student.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {student.avatar}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className={`font-semibold ${student.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {student.name}
                        {student.isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {student.solved} problems solved • {student.streak} day streak
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getRankBadgeColor(student.rank)}>
                      {student.score.toLocaleString()} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Rankings update every hour • Keep solving to climb up!
          </p>
        </div>
      </div>
    </section>
  );
};