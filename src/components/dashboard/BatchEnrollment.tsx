import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const BatchEnrollment = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [userBatches, setUserBatches] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's current batches
      const { data: memberData, error: memberError } = await supabase
        .from('batch_members')
        .select(`
          batch_id,
          batches (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const enrolledBatches = memberData?.map(m => m.batches) || [];
      setUserBatches(enrolledBatches);
      const enrolledBatchIds = enrolledBatches.map(b => b.id);

      // Fetch all available batches
      const { data: allBatches, error: batchesError } = await supabase
        .from('batches')
        .select('id, name')
        .order('name');

      if (batchesError) throw batchesError;

      // Filter out batches the user is already in
      const availableBatches = allBatches?.filter(b => !enrolledBatchIds.includes(b.id)) || [];
      setBatches(availableBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBatch = async () => {
    if (!selectedBatchId) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('batch_members')
        .insert({
          batch_id: selectedBatchId,
          user_id: user.id,
          role_in_batch: 'student'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You have successfully joined the batch.",
      });

      setSelectedBatchId("");
      fetchData();

      // Trigger a page refresh to update tests
      window.location.reload();
    } catch (error: any) {
      console.error('Error joining batch:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join batch. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/50 backdrop-blur-md border-white/20 animate-pulse rounded-3xl">
        <CardContent className="h-32 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-12">
        {/* Current Batches - Left 7 columns */}
        <Card className="md:col-span-7 bg-white/40 backdrop-blur-md border-white/20 shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Users className="h-32 w-32 rotate-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">Your Learning Tracks</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Batches you are currently enrolled in</p>
          </CardHeader>
          <CardContent>
            {userBatches.length > 0 ? (
              <div className="flex flex-wrap gap-2 relative z-10">
                {userBatches.map(batch => (
                  <Badge key={batch.id} variant="secondary" className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-100/50 hover:bg-emerald-100 transition-colors">
                    {batch.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="py-2 text-sm text-slate-400 italic">No active enrollments yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Join New Batch - Right 5 columns */}
        {batches.length > 0 ? (
          <Card className="md:col-span-5 bg-gradient-to-br from-primary to-primary-glow border-0 shadow-xl shadow-primary/20 rounded-3xl text-white overflow-hidden relative">
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Join a Batch
              </CardTitle>
              <p className="text-primary-foreground/80 text-xs">
                Enroll in a new track to unlock tests and assignments.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-white/30 rounded-xl py-6">
                    <SelectValue placeholder="Browse available tracks..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id} className="focus:bg-primary/10 focus:text-primary rounded-lg my-1">
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleJoinBatch}
                  disabled={!selectedBatchId || joining}
                  className="bg-white text-primary hover:bg-slate-50 shadow-lg transition-all rounded-xl py-6 font-bold uppercase tracking-widest text-xs"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Enrollment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="md:col-span-5 bg-slate-50 border-dashed border-2 border-slate-200 rounded-3xl flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-slate-400 text-sm font-medium">All available batches joined</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Check back for new tracks</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
