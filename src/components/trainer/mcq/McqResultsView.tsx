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
  AreaChart
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

interface McqResult {
  id: string;
  test_name: string;
  student_name: string;
  batch_name: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  status: string;
  correct_answers: number;
  incorrect_answers: number;
  total_questions: number;
}

interface McqStats {
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

const McqResultsView = () => {
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<McqResult[]>([]);
  const [stats, setStats] = useState<McqStats | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchMcqResults(selectedTest);
    }
  }, [selectedTest]);

  const fetchTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: testsData, error } = await supabase
        .from('mcq_tests')
        .select(`
          id,
          title,
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
      console.error('Error fetching MCQ tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    }
  };

  const fetchMcqResults = async (testId: string) => {
    setLoading(true);
    try {
      const { data: resultsData, error } = await supabase
        .from('mcq_attempts')
        .select(`
          id,
          score,
          max_score,
          submitted_at,
          status,
          started_at,
          correct_answers,
          incorrect_answers,
          total_questions,
          mcq_tests (title),
          user_id,
          profiles!mcq_attempts_user_id_fkey (
            full_name,
            batch_id
          )
        `)
        .eq('test_id', testId)
        .in('status', ['submitted', 'auto_submitted']);

      if (error) throw error;

      // Get batch information for all users
      const userIds = (resultsData || []).map(result => result.user_id).filter(Boolean);
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

      const processedResults: McqResult[] = (resultsData || []).map(result => {
        const timeDiff = new Date(result.submitted_at).getTime() - new Date(result.started_at).getTime();
        const timeTakenMinutes = Math.round(timeDiff / (1000 * 60));
        const userId = result.user_id;
        
        return {
          id: result.id,
          test_name: (result.mcq_tests as any).title,
          student_name: (result.profiles as any).full_name || 'Unknown',
          batch_name: batchMap.get(userId) || 'No Batch',
          score: result.score || 0,
          max_score: result.max_score || 0,
          percentage: result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0,
          submitted_at: result.submitted_at,
          status: result.status,
          correct_answers: result.correct_answers || 0,
          incorrect_answers: result.incorrect_answers || 0,
          total_questions: result.total_questions || 0
        };
      });

      setResults(processedResults);
      calculateStats(processedResults);
      calculateBatchResults(processedResults);
    } catch (error) {
      console.error('Error fetching MCQ results:', error);
      toast({
        title: "Error",
        description: "Failed to load MCQ results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results: McqResult[]) => {
    if (results.length === 0) {
      setStats({
        total_students: 0,
        completed_students: 0,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
        pass_rate: 0,
        average_time: 0
      });
      return;
    }

    const scores = results.map(r => r.score);
    const percentages = results.map(r => r.percentage);
    const totalStudents = new Set(results.map(r => r.student_name)).size;
    const passedStudents = results.filter(r => r.percentage >= 60).length;

    setStats({
      total_students: totalStudents,
      completed_students: results.length,
      average_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores),
      pass_rate: Math.round((passedStudents / results.length) * 100),
      average_time: 0 // Can be calculated if time data is available
    });
  };

  const calculateBatchResults = (results: McqResult[]) => {
    const batchMap = new Map<string, { scores: number[], students: Set<string>, completed: number }>();

    results.forEach(result => {
      if (!batchMap.has(result.batch_name)) {
        batchMap.set(result.batch_name, { scores: [], students: new Set(), completed: 0 });
      }
      const batch = batchMap.get(result.batch_name)!;
      batch.scores.push(result.score);
      batch.students.add(result.student_name);
      batch.completed++;
    });

    const batchResultsArray: BatchResult[] = Array.from(batchMap.entries()).map(([batchName, data]) => {
      const avgScore = data.scores.length > 0 
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0;
      const passed = data.scores.filter(s => (s / (results.find(r => r.batch_name === batchName)?.max_score || 1)) * 100 >= 60).length;
      const passRate = data.completed > 0 ? Math.round((passed / data.completed) * 100) : 0;

      return {
        batch_name: batchName,
        total_students: data.students.size,
        completed_students: data.completed,
        average_score: avgScore,
        pass_rate: passRate
      };
    });

    setBatchResults(batchResultsArray);
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No results to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Student Name', 'Batch', 'Score', 'Max Score', 'Percentage', 'Correct', 'Incorrect', 'Total Questions', 'Status', 'Submitted At'];
    const rows = results.map(r => [
      r.student_name,
      r.batch_name,
      r.score,
      r.max_score,
      `${r.percentage}%`,
      r.correct_answers,
      r.incorrect_answers,
      r.total_questions,
      r.status,
      new Date(r.submitted_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq-results-${selectedTest}-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const scoreDistribution = results.reduce((acc, result) => {
    const range = Math.floor(result.percentage / 10) * 10;
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const distributionData = Object.entries(scoreDistribution)
    .map(([range, count]) => ({
      range: `${range}-${parseInt(range) + 9}%`,
      students: count
    }))
    .sort((a, b) => parseInt(a.range) - parseInt(b.range));

  const pieData = [
    { name: 'Passed (≥60%)', value: results.filter(r => r.percentage >= 60).length },
    { name: 'Failed (<60%)', value: results.filter(r => r.percentage < 60).length }
  ];

  if (loading && !selectedTest) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No MCQ Tests Found</h3>
          <p className="text-muted-foreground">Create MCQ tests to view results here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">MCQ Test Results</h2>
          <p className="text-muted-foreground">View and analyze student performance on MCQ tests</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {results.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {selectedTest && (
        <>
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
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
                      <div className="text-2xl font-bold">{stats.total_students}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.completed_students} completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card-gradient shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.average_score}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.highest_score} highest, {stats.lowest_score} lowest
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card-gradient shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.pass_rate}%</div>
                      <p className="text-xs text-muted-foreground">
                        {results.filter(r => r.percentage >= 60).length} passed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card-gradient shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completed</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.completed_students}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.total_students - stats.completed_students} pending
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Tabs defaultValue="results" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="batches">Batch Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Student Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="p-2 text-left font-semibold">Student</th>
                              <th className="p-2 text-left font-semibold hidden sm:table-cell">Batch</th>
                              <th className="p-2 text-left font-semibold">Score</th>
                              <th className="p-2 text-left font-semibold">Percentage</th>
                              <th className="p-2 text-left font-semibold hidden md:table-cell">Correct</th>
                              <th className="p-2 text-left font-semibold hidden md:table-cell">Incorrect</th>
                              <th className="p-2 text-left font-semibold hidden lg:table-cell">Status</th>
                              <th className="p-2 text-left font-semibold hidden lg:table-cell">Submitted</th>
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
                                  <Badge variant="default" className="bg-green-500">
                                    {result.correct_answers}
                                  </Badge>
                                </td>
                                <td className="p-2 hidden md:table-cell">
                                  <Badge variant="destructive">
                                    {result.incorrect_answers}
                                  </Badge>
                                </td>
                                <td className="p-2 hidden lg:table-cell">
                                  <Badge variant={result.status === 'submitted' ? "default" : "secondary"}>
                                    {result.status}
                                  </Badge>
                                </td>
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
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Score Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={distributionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="students" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Pass/Fail Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="batches" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Batch Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="p-2 text-left font-semibold">Batch</th>
                              <th className="p-2 text-left font-semibold">Total Students</th>
                              <th className="p-2 text-left font-semibold">Completed</th>
                              <th className="p-2 text-left font-semibold">Average Score</th>
                              <th className="p-2 text-left font-semibold">Pass Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchResults.map((batch, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-2 font-medium">{batch.batch_name}</td>
                                <td className="p-2">{batch.total_students}</td>
                                <td className="p-2">{batch.completed_students}</td>
                                <td className="p-2">{batch.average_score}</td>
                                <td className="p-2">
                                  <Badge variant={batch.pass_rate >= 60 ? "default" : "destructive"}>
                                    {batch.pass_rate}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">No students have submitted this test yet.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default McqResultsView;

