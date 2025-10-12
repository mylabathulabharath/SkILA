import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Trophy, 
  Users, 
  Clock,
  TrendingUp,
  BookOpen,
  Code,
  CheckCircle,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/home/Navigation";

interface FeaturedChallenge {
  id: string;
  title: string;
  difficulty: string;
  language: string;
  attempts: number;
  successRate: number;
  description: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  streak: number;
}

const Home = () => {
  const [featuredChallenges, setFeaturedChallenges] = useState<FeaturedChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        // Fetch real featured challenges from database
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id, title, difficulty, supported_languages, problem_statement')
          .order('created_at', { ascending: false })
          .limit(4);

        if (questionsError) throw questionsError;

        // Transform questions to featured challenges format
        const challenges = questions?.map((q, index) => ({
          id: q.id,
          title: q.title,
          difficulty: getDifficultyLabel(q.difficulty),
          language: q.supported_languages?.[0] || 'Python',
          attempts: Math.floor(Math.random() * 1000) + 100, // Mock attempts for now
          successRate: Math.floor(Math.random() * 40) + 40, // Mock success rate
          description: q.problem_statement?.substring(0, 100) + '...' || 'No description available.'
        })) || [];

        setFeaturedChallenges(challenges);

        // Fetch real leaderboard data
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'student')
          .limit(5);

        if (leaderboardError) throw leaderboardError;

        // Transform to leaderboard format (mock scores for now)
        const leaderboard = leaderboardData?.map((user, index) => ({
          rank: index + 1,
          name: user.full_name || user.email?.split('@')[0] || 'Anonymous',
          score: Math.floor(Math.random() * 2000) + 2000,
          streak: Math.floor(Math.random() * 20) + 1
        })) || [];

        setLeaderboard(leaderboard);

      } catch (error) {
        console.error('Error loading home data:', error);
        // Fallback to mock data if there's an error
        setFeaturedChallenges([
          {
            id: '1',
            title: 'Two Sum Problem',
            difficulty: 'Easy',
            language: 'Python',
            attempts: 1247,
            successRate: 78.5,
            description: 'Find two numbers in an array that add up to a target sum.'
          },
          {
            id: '2',
            title: 'Binary Tree Traversal',
            difficulty: 'Medium',
            language: 'C++',
            attempts: 892,
            successRate: 62.3,
            description: 'Implement in-order, pre-order, and post-order tree traversals.'
          },
          {
            id: '3',
            title: 'Dynamic Programming - LCS',
            difficulty: 'Hard',
            language: 'Java',
            attempts: 456,
            successRate: 41.2,
            description: 'Find the longest common subsequence between two strings.'
          },
          {
            id: '4',
            title: 'Graph Shortest Path',
            difficulty: 'Medium',
            language: 'Python',
            attempts: 723,
            successRate: 55.8,
            description: "Implement Dijkstra's algorithm for shortest path finding."
          }
        ]);

        setLeaderboard([
          { rank: 1, name: 'Alex Johnson', score: 2847, streak: 15 },
          { rank: 2, name: 'Sarah Chen', score: 2734, streak: 12 },
          { rank: 3, name: 'Mike Rodriguez', score: 2691, streak: 8 },
          { rank: 4, name: 'Emma Wilson', score: 2583, streak: 11 },
          { rank: 5, name: 'David Kim', score: 2467, streak: 7 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy';
    if (difficulty <= 4) return 'Medium';
    return 'Hard';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3: return <Trophy className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl lg:text-7xl font-bold text-gradient mb-6">
            Master Coding
          </h1>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-8">
            Through AI-Powered Practice
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Challenge yourself with curated coding problems, compete with peers, 
            and track your progress in real-time with our intelligent assessment platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg"
              variant="auth"
              onClick={() => navigate('/login')}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Practicing
            </Button>
            <Button 
              size="lg" 
              variant="authSecondary"
              className="px-8 py-6 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <Card className="text-center bg-card-gradient shadow-card">
            <CardContent className="pt-6">
              <div className="p-3 mx-auto w-fit rounded-xl bg-gradient-to-br from-primary to-primary-glow mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground">10,000+</div>
              <p className="text-muted-foreground">Active Students</p>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-card-gradient shadow-card">
            <CardContent className="pt-6">
              <div className="p-3 mx-auto w-fit rounded-xl bg-gradient-to-br from-secondary to-accent mb-4">
                <Code className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground">500+</div>
              <p className="text-muted-foreground">Coding Problems</p>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-card-gradient shadow-card">
            <CardContent className="pt-6">
              <div className="p-3 mx-auto w-fit rounded-xl bg-gradient-to-br from-accent to-secondary mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground">1M+</div>
              <p className="text-muted-foreground">Solutions Submitted</p>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-card-gradient shadow-card">
            <CardContent className="pt-6">
              <div className="p-3 mx-auto w-fit rounded-xl bg-gradient-to-br from-secondary to-primary mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground">95%</div>
              <p className="text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">Featured Challenges</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test your skills with these popular coding problems
          </p>
        </div>
        
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-card-gradient shadow-card">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : featuredChallenges.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featuredChallenges.map((challenge) => (
              <Card 
                key={challenge.id} 
                className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card-gradient"
                onClick={() => navigate('/login')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {challenge.title}
                    </CardTitle>
                    <Badge className={`${getDifficultyColor(challenge.difficulty)} border`}>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {challenge.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Language:</span>
                      <Badge variant="outline">{challenge.language}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempts:</span>
                      <span className="font-medium text-foreground">{challenge.attempts.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-medium text-foreground">{challenge.successRate}%</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 group-hover:shadow-glow transition-all"
                    variant="auth"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/login');
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Try Challenge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Challenges Available</h3>
            <p className="text-muted-foreground mb-6">Check back soon for new coding challenges!</p>
            <Button variant="auth" onClick={() => navigate('/login')}>
              <Play className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Top Performers</h3>
            <p className="text-muted-foreground">
              See how you stack up against the community
            </p>
          </div>
          
          <Card className="bg-card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {leaderboard.map((entry) => (
                      <div 
                        key={entry.rank} 
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{entry.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{entry.score} pts</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>{entry.streak} streak</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <Button variant="outline" onClick={() => navigate('/login')}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Full Rankings
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Rankings Yet</h3>
                  <p className="text-muted-foreground mb-6">Be the first to start practicing and climb the leaderboard!</p>
                  <Button variant="auth" onClick={() => navigate('/login')}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Practicing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-auth-gradient text-center text-white shadow-auth">
          <CardContent className="py-16">
            <h3 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Level Up Your Coding Skills?
            </h3>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already improving their programming abilities 
              with our AI-powered assessment platform.
            </p>
            <Button 
              size="lg" 
              variant="authSecondary" 
              className="px-8 py-6 text-lg"
              onClick={() => navigate('/login')}
            >
              Get Started Now
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <img 
                  src="/SkILA.svg" 
                  alt="SkILA Logo" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering students with AI-powered coding assessments and real-time feedback.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/login')} className="hover:text-primary transition-colors">Get Started</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-primary transition-colors">Practice Problems</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-primary transition-colors">Take Tests</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-primary transition-colors">View Progress</button></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button className="hover:text-primary transition-colors">Help Center</button></li>
                <li><button className="hover:text-primary transition-colors">Contact Us</button></li>
                <li><button className="hover:text-primary transition-colors">Documentation</button></li>
                <li><button className="hover:text-primary transition-colors">FAQ</button></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button className="hover:text-primary transition-colors">About</button></li>
                <li><button className="hover:text-primary transition-colors">Privacy Policy</button></li>
                <li><button className="hover:text-primary transition-colors">Terms of Service</button></li>
                <li><button className="hover:text-primary transition-colors">Blog</button></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2024 AI Exam Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;