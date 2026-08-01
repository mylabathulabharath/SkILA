import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/exam/CodeEditor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Lock, CheckCircle2, Loader2 } from "lucide-react";

interface Creds { attempt_id: string; session_token: string; }

interface Props {
  examState: any;
  creds: Creds;
  onRefresh: () => void;
}

function useCountdown(endsAt: string | null): string | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "00:00";
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const SectionRunner = ({ examState, creds, onRefresh }: Props) => {
  const { toast } = useToast();
  const sections = examState.sections as any[];
  const activeSections = sections.filter((s) => s.status === "active");
  const [viewKey, setViewKey] = useState<string>(activeSections[0]?.id ?? sections[0]?.id);
  const [submitting, setSubmitting] = useState(false);

  const viewed = sections.find((s) => s.id === viewKey) || sections[0];
  // overall clock takes precedence; else the viewed section's clock
  const clock = useCountdown(examState.exam?.ends_at || viewed?.ends_at || null);

  const call = (fn: string, body: any) =>
    supabase.functions.invoke(fn, { body: { ...body, attempt_id: creds.attempt_id, session_token: creds.session_token } });

  const saveMcq = async (attempt_question_id: string, optionId: string) => {
    await call("save-mcq-answer", { attempt_question_id, selected_option_ids: [optionId] });
  };

  const submitSection = async (sectionId: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await call("submit-section", { section_id: sectionId });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || "Submit failed");
      if (data.data.gate === "failed_cutoff") {
        toast({ title: "Section not cleared", description: "You didn't meet the cutoff to continue.", variant: "destructive" });
      } else {
        toast({ title: "Section submitted", description: `Scored ${data.data.section_score}/${data.data.section_possible}.` });
      }
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to submit section", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Coding handlers bound to a specific frozen question.
  const runCoding = (aqId: string) => async (code: string, language: string) => {
    const { data, error } = await call("run-code", { attempt_question_id: aqId, language, code, run_type: "run" });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Run failed");
    return (data.data.results || []).map((r: any) => ({
      input: r.input, expectedOutput: r.expected_output, actualOutput: r.actual_output,
      passed: r.status === "pass", executionTime: r.time, memoryUsed: r.memory,
    }));
  };
  const submitCoding = (aqId: string) => async (code: string, language: string) => {
    const { data, error } = await call("run-code", { attempt_question_id: aqId, language, code, run_type: "submit" });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Submit failed");
    toast({ title: "Saved", description: `${data.data.passed_count}/${data.data.total_count} tests passed.` });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="font-semibold truncate">{examState.exam?.name}</h1>
          <div className="flex-1" />
          {clock && (
            <Badge variant={clock === "00:00" ? "destructive" : "outline"} className="text-sm h-8 px-3 gap-1.5">
              <Clock className="h-4 w-4" /> {clock}
            </Badge>
          )}
        </div>
        {/* Section tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          {sections.map((s, i) => {
            const disabled = s.status === "locked";
            return (
              <button key={s.id} disabled={disabled} onClick={() => setViewKey(s.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition
                  ${s.id === viewKey ? "bg-primary text-primary-foreground border-primary" : "bg-background"}
                  ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}>
                {s.status === "locked" && <Lock className="h-3.5 w-3.5" />}
                {s.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                <span className="font-medium">{i + 1}.</span> {s.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {viewed?.status === "locked" && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2" /> Complete the previous section to unlock this one.
          </CardContent></Card>
        )}

        {viewed?.status === "completed" && (
          <Card><CardContent className="py-12 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="font-medium">Section submitted</p>
            {viewed.score != null && <p className="text-sm text-muted-foreground">Score: {viewed.score}</p>}
          </CardContent></Card>
        )}

        {viewed?.status === "active" && (
          <>
            {(viewed.questions || []).map((q: any, idx: number) => (
              <Card key={q.attempt_question_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline">Q{idx + 1}</Badge>
                    <span className="text-muted-foreground text-sm font-normal">{q.points} pts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {q.type === "mcq" ? (
                    <McqQuestion q={q} onSelect={(opt) => saveMcq(q.attempt_question_id, opt)} />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">{q.question?.title}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{q.question?.problem_statement}</p>
                      </div>
                      <CodeEditor
                        onRunCode={runCoding(q.attempt_question_id)}
                        onSubmitCode={submitCoding(q.attempt_question_id)}
                        isSubmitted={false}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button onClick={() => submitSection(viewed.id)} disabled={submitting} size="lg">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Section"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function McqQuestion({ q, onSelect }: { q: any; onSelect: (optionId: string) => void }) {
  const [value, setValue] = useState<string>(q.selected_option_ids?.[0] ?? "");
  return (
    <div className="space-y-3">
      <p className="font-medium">{q.question?.question_text}</p>
      <RadioGroup value={value} onValueChange={(v) => { setValue(v); onSelect(v); }}>
        {(q.options || []).map((o: any) => (
          <div key={o.id} className="flex items-center gap-2 rounded-md border p-2.5 hover:bg-muted/40">
            <RadioGroupItem value={o.id} id={o.id} />
            <Label htmlFor={o.id} className="flex-1 cursor-pointer font-normal">{o.option_text}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
