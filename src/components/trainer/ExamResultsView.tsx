import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ScatterChart,
  Scatter
} from "recharts";
import { 
  Download, 
  FileText, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExamResult {
  id: string;
  test_name: string;
  student_name: string;
  batch_name: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  status: string;
  time_taken_minutes: number;
}

interface ExamStats {
  total_students: number;
  completed_students: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  average_time: number;
}

interface BatchResult {
  batch_name: string;
  total_students: number;
  completed_students: number;
  average_score: number;
  pass_rate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ExamResultsView = () => {
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchExamResults(selectedTest);
    }
  }, [selectedTest]);

  const fetchTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

             const { data: testsData, error } = await supabase
         .from('tests')
         .select(`
           id,
           name,
           created_at
         `)
         .eq('created_by', user.id)
         .order('created_at', { ascending: false });

      if (error) throw error;

      setTests(testsData || []);
      if (testsData && testsData.length > 0) {
        setSelectedTest(testsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    }
  };

  const fetchExamResults = async (testId: string) => {
    setLoading(true);
    try {
             const { data: resultsData, error } = await supabase
         .from('attempts')
         .select(`
           id,
           score,
           max_score,
           submitted_at,
           status,
           started_at,
           ends_at,
           tests (name),
           user_id,
           profiles!attempts_user_id_fkey (
             full_name,
             batch_id
           )
         `)
         .eq('test_id', testId)
         .in('status', ['submitted', 'auto_submitted']);

      if (error) throw error;

             // Get batch information for all users
       const userIds = (resultsData || []).map(result => (result.profiles as any).id).filter(Boolean);
       const { data: batchMembersData } = await supabase
         .from('batch_members')
         .select(`
           user_id,
           batches (name)
         `)
         .in('user_id', userIds);

       // Create a map of user_id to batch_name
       const batchMap = new Map();
       (batchMembersData || []).forEach(member => {
         batchMap.set(member.user_id, (member.batches as any).name);
       });

       const processedResults: ExamResult[] = (resultsData || []).map(result => {
         const timeDiff = new Date(result.submitted_at).getTime() - new Date(result.started_at).getTime();
         const timeTakenMinutes = Math.round(timeDiff / (1000 * 60));
         const userId = (result.profiles as any).id;
         
         return {
           id: result.id,
           test_name: (result.tests as any).name,
           student_name: (result.profiles as any).full_name || 'Unknown',
           batch_name: batchMap.get(userId) || 'No Batch',
           score: result.score,
           max_score: result.max_score,
           percentage: Math.round((result.score / result.max_score) * 100),
           submitted_at: result.submitted_at,
           status: result.status,
           time_taken_minutes: timeTakenMinutes
         };
       });

      setResults(processedResults);
      calculateStats(processedResults);
      calculateBatchResults(processedResults);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast({
        title: "Error",
        description: "Failed to load exam results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results: ExamResult[]) => {
    if (results.length === 0) {
      setStats(null);
      return;
    }

    const totalStudents = results.length;
    const completedStudents = results.length;
    const averageScore = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalStudents);
    const highestScore = Math.max(...results.map(r => r.percentage));
    const lowestScore = Math.min(...results.map(r => r.percentage));
    const passRate = Math.round((results.filter(r => r.percentage >= 60).length / totalStudents) * 100);
    const averageTime = Math.round(results.reduce((sum, r) => sum + r.time_taken_minutes, 0) / totalStudents);

    setStats({
      total_students: totalStudents,
      completed_students: completedStudents,
      average_score: averageScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: passRate,
      average_time: averageTime
    });
  };

  const calculateBatchResults = (results: ExamResult[]) => {
    const batchMap = new Map<string, BatchResult>();

    results.forEach(result => {
      const batchName = result.batch_name;
      if (!batchMap.has(batchName)) {
        batchMap.set(batchName, {
          batch_name: batchName,
          total_students: 0,
          completed_students: 0,
          average_score: 0,
          pass_rate: 0
        });
      }

      const batch = batchMap.get(batchName)!;
      batch.total_students++;
      batch.completed_students++;
      batch.average_score += result.percentage;
    });

    const batchResultsArray: BatchResult[] = Array.from(batchMap.values()).map(batch => ({
      ...batch,
      average_score: Math.round(batch.average_score / batch.completed_students),
      pass_rate: Math.round((results.filter(r => r.batch_name === batch.batch_name && r.percentage >= 60).length / batch.completed_students) * 100)
    }));

    setBatchResults(batchResultsArray);
  };

  const exportToExcel = () => {
    if (!results.length) return;

    const headers = ['Student Name', 'Batch', 'Score', 'Max Score', 'Percentage', 'Status', 'Submitted At', 'Time Taken (min)'];
    const csvContent = [
      headers.join(','),
      ...results.map(result => [
        `"${result.student_name}"`,
        `"${result.batch_name}"`,
        result.score,
        result.max_score,
        result.percentage,
        result.status,
        `"${new Date(result.submitted_at).toLocaleString()}"`,
        result.time_taken_minutes
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `exam_results_${selectedTest}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Results exported to CSV successfully",
    });
  };

  const exportToJSON = () => {
    if (!results.length) return;

    const data = {
      test_id: selectedTest,
      test_name: tests.find(t => t.id === selectedTest)?.name,
      export_date: new Date().toISOString(),
      results: results,
      stats: stats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `exam_results_${selectedTest}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Results exported to JSON successfully",
    });
  };

  const getScoreDistribution = () => {
    const distribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '0-49': 0
    };

    results.forEach(result => {
      if (result.percentage >= 90) distribution['90-100']++;
      else if (result.percentage >= 80) distribution['80-89']++;
      else if (result.percentage >= 70) distribution['70-79']++;
      else if (result.percentage >= 60) distribution['60-69']++;
      else if (result.percentage >= 50) distribution['50-59']++;
      else distribution['0-49']++;
    });

    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      percentage: Math.round((count / results.length) * 100)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exam results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Exam Results</h2>
          <p className="text-muted-foreground">View detailed results and analytics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button onClick={exportToJSON} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">JSON</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedTest && results.length > 0 ? (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.total_students}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completed_students} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.average_score}%</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.highest_score}% highest, {stats.lowest_score}% lowest
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.pass_rate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Students scoring ≥60%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-gradient shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.average_time}m</div>
                  <p className="text-xs text-muted-foreground">
                    Time taken to complete
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
              <TabsTrigger value="batches">Batch Comparison</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getScoreDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ range, percentage }) => `${range}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {getScoreDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                                 <Card>
                   <CardHeader>
                     <CardTitle>Score vs Time</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                       <BarChart data={results.slice(0, 10)}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="student_name" />
                         <YAxis />
                         <Tooltip />
                         <Bar dataKey="percentage" fill="#8884d8" />
                       </BarChart>
                     </ResponsiveContainer>
                   </CardContent>
                 </Card>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getScoreDistribution()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batches" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Batch Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={batchResults}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="batch_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="average_score" fill="#8884d8" name="Average Score (%)" />
                      <Bar dataKey="pass_rate" fill="#82ca9d" name="Pass Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Submission Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={results.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="submitted_at" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="percentage" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2 hidden sm:table-cell">Batch</th>
                      <th className="text-left p-2">Score</th>
                      <th className="text-left p-2">Percentage</th>
                      <th className="text-left p-2 hidden md:table-cell">Status</th>
                      <th className="text-left p-2 hidden lg:table-cell">Time</th>
                      <th className="text-left p-2 hidden lg:table-cell">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">
                          <div>
                            <div className="font-medium">{result.student_name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{result.batch_name}</div>
                          </div>
                        </td>
                        <td className="p-2 hidden sm:table-cell">{result.batch_name}</td>
                        <td className="p-2">{result.score}/{result.max_score}</td>
                        <td className="p-2">
                          <Badge variant={result.percentage >= 60 ? "default" : "destructive"}>
                            {result.percentage}%
                          </Badge>
                        </td>
                        <td className="p-2 hidden md:table-cell">
                          <Badge variant={result.status === 'submitted' ? "default" : "secondary"}>
                            {result.status}
                          </Badge>
                        </td>
                        <td className="p-2 hidden lg:table-cell">{result.time_taken_minutes}m</td>
                        <td className="p-2 text-sm text-muted-foreground hidden lg:table-cell">
                          {new Date(result.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
            <p className="text-muted-foreground text-center">
              {selectedTest 
                ? "No students have completed this test yet." 
                : "Select a test to view results and analytics."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExamResultsView;
