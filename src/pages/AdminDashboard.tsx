import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserPlus,
  BookOpen, 
  ClipboardList,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { UserManagement } from "@/components/admin/UserManagement";

interface AdminStats {
  totalUsers: number;
  totalTrainers: number;
  totalStudents: number;
  totalQuestions: number;
  totalTests: number;
  activeAttempts: number;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock data for charts
  const activityData = [
    { name: 'Mon', attempts: 45, submissions: 32 },
    { name: 'Tue', attempts: 52, submissions: 41 },
    { name: 'Wed', attempts: 48, submissions: 38 },
    { name: 'Thu', attempts: 61, submissions: 47 },
    { name: 'Fri', attempts: 55, submissions: 43 },
    { name: 'Sat', attempts: 35, submissions: 28 },
    { name: 'Sun', attempts: 30, submissions: 25 },
  ];

  const userRegistrationData = [
    { month: 'Jan', students: 12, trainers: 2 },
    { month: 'Feb', students: 18, trainers: 1 },
    { month: 'Mar', students: 25, trainers: 3 },
    { month: 'Apr', students: 32, trainers: 2 },
    { month: 'May', students: 28, trainers: 1 },
    { month: 'Jun', students: 35, trainers: 4 },
  ];

  useEffect(() => {
    const getAdminData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        setUser(user);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile?.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        
        setProfile(profile);

        // Mock stats for now - in real implementation, fetch from views
        setStats({
          totalUsers: 287,
          totalTrainers: 12,
          totalStudents: 275,
          totalQuestions: 445,
          totalTests: 89,
          activeAttempts: 23
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    getAdminData();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-subtle-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "User Management",
      description: "Manage users and roles",
      icon: Users,
      action: () => navigate('/admin/users'),
      color: "from-primary to-primary-glow"
    },
    {
      title: "System Settings",
      description: "Configure platform settings",
      icon: Settings,
      action: () => navigate('/admin/settings'),
      color: "from-secondary to-accent"
    },
    {
      title: "Security Audit",
      description: "Review security logs",
      icon: Shield,
      action: () => navigate('/admin/security'),
      color: "from-accent to-secondary"
    },
    {
      title: "Analytics",
      description: "Detailed platform analytics",
      icon: BarChart3,
      action: () => navigate('/admin/analytics'),
      color: "from-secondary to-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <DashboardHeader studentName={profile?.full_name || user?.email || "Admin"} />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Platform overview and management tools
            </p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Platform wide
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trainers</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalTrainers}</div>
                  <p className="text-xs text-muted-foreground">
                    Active instructors
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    Enrolled learners
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Questions</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalQuestions}</div>
                  <p className="text-xs text-muted-foreground">
                    In question bank
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalTests}</div>
                  <p className="text-xs text-muted-foreground">
                    Total assessments
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Attempts</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.activeAttempts}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <Card 
                  key={index}
                  className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient"
                  onClick={action.action}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-sm`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-sm">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User Management */}
          <UserManagement />

          {/* Analytics Charts */}
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Platform Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--card-foreground))'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attempts" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="submissions" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Registrations (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userRegistrationData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--card-foreground))'
                        }}
                      />
                      <Bar dataKey="students" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="trainers" fill="hsl(var(--secondary))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & System Status */}
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Judge0 API</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Database</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Edge Functions</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-800">Rate Limiting</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Monitoring</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Failed Login Attempts</h4>
                    <p className="text-xs text-blue-600">3 in the last 24 hours</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <h4 className="text-sm font-medium text-green-800 mb-1">RLS Policies</h4>
                    <p className="text-xs text-green-600">All tables properly secured</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <h4 className="text-sm font-medium text-green-800 mb-1">API Rate Limits</h4>
                    <p className="text-xs text-green-600">No violations detected</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-800 mb-1">Last Security Scan</h4>
                    <p className="text-xs text-gray-600">2 hours ago - No issues found</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;