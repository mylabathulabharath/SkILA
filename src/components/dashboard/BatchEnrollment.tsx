import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
    <div className="space-y-8">
      <div className="grid gap-10 md:grid-cols-12">
        {/* Current Batches - Left 7 columns */}
        <div className="md:col-span-7 glass-card rounded-[2.5rem] p-8 relative overflow-hidden group transition-all duration-500 hover:shadow-lg">
          <div className="absolute -top-10 -right-10 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12">
            <Users className="h-40 w-40" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Learning Tracks</h2>
              </div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest pl-12">Current Enrollments</p>
            </div>

            <div className="pl-12">
              {userBatches.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {userBatches.map(batch => (
                    <div key={batch.id} className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100/50 text-xs font-black text-slate-600 uppercase tracking-widest hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-default shadow-sm">
                      {batch.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-sm text-slate-400 font-medium italic">No active enrollments detected yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Join New Batch - Right 5 columns */}
        {batches.length > 0 ? (
          <div className="md:col-span-5 glass-card rounded-[2.5rem] p-8 border-primary/20 relative overflow-hidden group transition-all duration-500 hover:shadow-primary/10">
            {/* Subtle glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-1000"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  Join a Track
                </h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-12">
                  Unlock new assessments
                </p>
              </div>

              <div className="pl-12 space-y-4">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="h-14 bg-slate-50/50 border-slate-200/50 rounded-2xl text-slate-700 font-bold focus:ring-primary/20 hover:bg-white transition-all">
                    <SelectValue placeholder="Browse modules..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-premium p-1.5">
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id} className="rounded-xl font-semibold my-1 focus:bg-primary/5 focus:text-primary transition-colors">
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleJoinBatch}
                  disabled={!selectedBatchId || joining}
                  className="w-full h-14 btn-premium text-white shadow-primary rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98]"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Enrollment"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-5 bg-slate-100/30 border-2 border-dashed border-slate-200/50 rounded-[2.5rem] flex items-center justify-center p-8 transition-colors hover:bg-slate-100/50">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-slate-100 rounded-full mb-2">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold text-sm tracking-tight">Full Visibility Achieved</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">All modules are currently active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
