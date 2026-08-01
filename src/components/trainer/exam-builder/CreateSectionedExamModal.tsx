import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Plus, Link2, Check, Copy } from "lucide-react";
import { SectionCard } from "./SectionCard";
import {
  BankQuestion, SectionDraft, NavigationMode, TimingMode, BUCKETS,
  codingBucket, mcqBucket, newSection, poolCountByBucket,
} from "./types";

interface Props { onExamCreated: () => void; }
interface Batch { id: string; name: string; }

export const CreateSectionedExamModal = ({ onExamCreated }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState<"public" | "batch">("public");
  const [batchId, setBatchId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [navigationMode, setNavigationMode] = useState<NavigationMode>("sequential_lock");
  const [timingMode, setTimingMode] = useState<TimingMode>("overall");
  const [overallTime, setOverallTime] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([newSection("mcq")]);

  useEffect(() => { if (open) loadBank(); }, [open]);

  const loadBank = async () => {
    const [coding, mcq, b] = await Promise.all([
      supabase.from("questions").select("id, title, difficulty"),
      supabase.from("mcq_questions").select("id, question_text, difficulty"),
      supabase.from("batches").select("id, name").order("created_at", { ascending: false }),
    ]);
    const bankRows: BankQuestion[] = [
      ...(coding.data || []).map((q: any) => ({ id: q.id, label: q.title, bucket: codingBucket(q.difficulty), kind: "coding" as const })),
      ...(mcq.data || []).map((q: any) => ({ id: q.id, label: q.question_text, bucket: mcqBucket(q.difficulty), kind: "mcq" as const })),
    ];
    setBank(bankRows);
    setBatches(b.data || []);
  };

  const updateSection = (key: string, s: SectionDraft) =>
    setSections((prev) => prev.map((x) => (x.key === key ? s : x)));
  const removeSection = (key: string) =>
    setSections((prev) => prev.filter((x) => x.key !== key));

  const validate = (): string | null => {
    if (!name.trim()) return "Give the exam a name.";
    if (sections.length === 0) return "Add at least one section.";
    if ((timingMode === "overall" || timingMode === "both") && !(parseInt(overallTime) > 0))
      return "Set the overall time limit.";
    if (delivery === "batch" && (!batchId || !startAt || !endAt))
      return "Pick a batch and a start/end window.";
    for (const [i, s] of sections.entries()) {
      const counts = poolCountByBucket(s.pool);
      const totalDraw = BUCKETS.reduce((n, b) => n + (parseInt(s.draw[b]) || 0), 0);
      if (s.pool.length === 0) return `Section ${i + 1}: add questions to the pool.`;
      if (totalDraw < 1) return `Section ${i + 1}: set how many questions to draw.`;
      for (const b of BUCKETS)
        if ((parseInt(s.draw[b]) || 0) > counts[b]) return `Section ${i + 1}: cannot draw ${s.draw[b]} ${b} (pool has ${counts[b]}).`;
      if ((timingMode === "per_section" || timingMode === "both") && !(parseInt(s.timeLimitMinutes) > 0))
        return `Section ${i + 1}: set a section time limit.`;
      if (navigationMode === "sequential_cutoff") {
        const c = parseInt(s.passCutoffPercent);
        if (!(c >= 0 && c <= 100)) return `Section ${i + 1}: set a valid pass cutoff (0–100%).`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast({ title: "Check the form", description: err, variant: "destructive" }); return; }
    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const timeLimit = parseInt(overallTime) ||
        sections.reduce((n, s) => n + (parseInt(s.timeLimitMinutes) || 0), 0) || 60;

      const { data: test, error: tErr } = await supabase.from("tests").insert({
        name: name.trim(),
        time_limit_minutes: timeLimit,
        is_public: delivery === "public",
        is_sectioned: true,
        navigation_mode: navigationMode,
        timing_mode: timingMode,
        overall_time_limit_minutes: parseInt(overallTime) || null,
        created_by: userId,
      }).select("id, sharing_token").single();
      if (tErr) throw tErr;

      for (const [i, s] of sections.entries()) {
        const { data: sec, error: sErr } = await supabase.from("exam_sections").insert({
          test_id: test.id, title: s.title, section_type: s.type, order_index: i,
          time_limit_minutes: (timingMode === "per_section" || timingMode === "both") ? parseInt(s.timeLimitMinutes) : null,
          pass_cutoff_percent: navigationMode === "sequential_cutoff" ? parseInt(s.passCutoffPercent) : null,
        }).select("id").single();
        if (sErr) throw sErr;

        const poolRows = s.pool.map((it) => ({
          section_id: sec.id,
          question_id: it.kind === "coding" ? it.questionId : null,
          mcq_question_id: it.kind === "mcq" ? it.questionId : null,
          difficulty_bucket: it.bucket,
          points: it.points,
        }));
        if (poolRows.length) {
          const { error } = await supabase.from("section_pool_items").insert(poolRows);
          if (error) throw error;
        }
        const drawRows = BUCKETS
          .filter((b) => (parseInt(s.draw[b]) || 0) > 0)
          .map((b) => ({ section_id: sec.id, difficulty_bucket: b, draw_count: parseInt(s.draw[b]) }));
        if (drawRows.length) {
          const { error } = await supabase.from("section_draw_rules").insert(drawRows);
          if (error) throw error;
        }
      }

      if (delivery === "batch") {
        const { error } = await supabase.from("test_assignments").insert({
          test_id: test.id, batch_id: batchId,
          start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(),
        });
        if (error) throw error;
      }

      toast({ title: "Exam created", description: "Your sectioned exam is ready." });
      if (delivery === "public") {
        setShareUrl(`${window.location.origin}/exam/${test.sharing_token}`);
      } else {
        setOpen(false);
      }
      onExamCreated();
    } catch (e: any) {
      console.error("create sectioned exam error", e);
      toast({ title: "Error", description: e.message || "Failed to create exam", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName(""); setDelivery("public"); setBatchId(""); setStartAt(""); setEndAt("");
    setNavigationMode("sequential_lock"); setTimingMode("overall"); setOverallTime("");
    setSections([newSection("mcq")]); setShareUrl(null); setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-card-gradient">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                Create Professional Exam
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">Sectioned exam with randomized question pools</p>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Create Professional Exam</DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-medium">Exam created — share this link with candidates:</p>
            <div className="flex items-center gap-2 max-w-xl mx-auto">
              <Input readOnly value={shareUrl} className="font-mono text-sm" />
              <Button type="button" variant="outline" onClick={() => {
                navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500);
              }}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 lg:col-span-1">
                <Label>Exam name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Placement Drive 2026" />
              </div>
              <div className="space-y-2">
                <Label>Delivery</Label>
                <Select value={delivery} onValueChange={(v) => setDelivery(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public link (anyone can register)</SelectItem>
                    <SelectItem value="batch">Assign to a batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Navigation</Label>
                <Select value={navigationMode} onValueChange={(v) => setNavigationMode(v as NavigationMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential_lock">Sequential — submit &amp; lock</SelectItem>
                    <SelectItem value="sequential_cutoff">Sequential — must pass cutoff</SelectItem>
                    <SelectItem value="free">Free navigation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timing</Label>
                <Select value={timingMode} onValueChange={(v) => setTimingMode(v as TimingMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">One overall timer</SelectItem>
                    <SelectItem value="per_section">Per-section timers</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(timingMode === "overall" || timingMode === "both") && (
                <div className="space-y-2">
                  <Label>Overall time (min) *</Label>
                  <Input type="number" min="1" value={overallTime} onChange={(e) => setOverallTime(e.target.value)} placeholder="60" />
                </div>
              )}
            </div>

            {delivery === "batch" && (
              <div className="grid gap-4 md:grid-cols-3 rounded-lg border p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label>Batch *</Label>
                  <Select value={batchId} onValueChange={setBatchId}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opens *</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Closes *</Label>
                  <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Sections</Label>
                <Badge variant="outline">{sections.length} section{sections.length !== 1 ? "s" : ""}</Badge>
              </div>
              {sections.map((s, i) => (
                <SectionCard key={s.key} index={i} section={s} bank={bank}
                  navigationMode={navigationMode} timingMode={timingMode}
                  onChange={(ns) => updateSection(s.key, ns)} onRemove={() => removeSection(s.key)} />
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSections((p) => [...p, newSection("mcq")])}>
                  <Plus className="h-4 w-4 mr-1" /> Add MCQ section
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSections((p) => [...p, newSection("coding")])}>
                  <Plus className="h-4 w-4 mr-1" /> Add coding section
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                <Link2 className="h-4 w-4 mr-1" /> {loading ? "Creating…" : "Create exam"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
