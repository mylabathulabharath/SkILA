import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/exam/CodeEditor";
import { QuestionPanel } from "@/components/exam/QuestionPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Lock, CheckCircle2, Loader2 } from "lucide-react";

interface Creds { attempt_id: string; session_token: string; }
interface Props { examState: any; creds: Creds; onRefresh: () => void; }

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

const diffLabel = (d: number | null) => ((d ?? 3) <= 2 ? "Easy" : (d ?? 3) <= 4 ? "Medium" : "Hard");

export const SectionRunner = ({ examState, creds, onRefresh }: Props) => {
  const { toast } = useToast();
  const sections = examState.sections as any[];
  const activeSections = sections.filter((s) => s.status === "active");
  const [viewKey, setViewKey] = useState<string>(activeSections[0]?.id ?? sections[0]?.id);
  const [submitting, setSubmitting] = useState(false);

  const viewed = sections.find((s) => s.id === viewKey) || sections[0];
  const clock = useCountdown(examState.exam?.ends_at || viewed?.ends_at || null);

  const call = (fn: string, body: any) =>
    supabase.functions.invoke(fn, { body: { ...body, attempt_id: creds.attempt_id, session_token: creds.session_token } });

  const saveMcq = (aqId: string, optionId: string) =>
    call("save-mcq-answer", { attempt_question_id: aqId, selected_option_ids: [optionId] });

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
    <div className="h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="px-4 py-2.5 flex items-center gap-4">
          <h1 className="font-semibold truncate">{examState.exam?.name}</h1>
          <div className="flex-1" />
          {clock && (
            <Badge variant={clock === "00:00" ? "destructive" : "outline"} className="text-sm h-8 px-3 gap-1.5">
              <Clock className="h-4 w-4" /> {clock}
            </Badge>
          )}
        </div>
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {sections.map((s, i) => {
            const locked = s.status === "locked";
            return (
              <button key={s.id} disabled={locked} onClick={() => setViewKey(s.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition
                  ${s.id === viewKey ? "bg-primary text-primary-foreground border-primary" : "bg-background"}
                  ${locked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}>
                {s.status === "locked" && <Lock className="h-3.5 w-3.5" />}
                {s.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                <span className="font-medium">{i + 1}.</span> {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body fills remaining height */}
      <div className="flex-1 min-h-0">
        {viewed?.status === "locked" && (
          <Placeholder icon={<Lock className="h-8 w-8" />} text="Complete the previous section to unlock this one." />
        )}
        {viewed?.status === "completed" && (
          <Placeholder icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            text={`Section submitted${viewed.score != null ? ` — score ${viewed.score}` : ""}.`} />
        )}
        {viewed?.status === "active" && viewed.type === "coding" && (
          <CodingSection section={viewed} submitting={submitting}
            onSubmitSection={() => submitSection(viewed.id)} runCoding={runCoding} submitCoding={submitCoding} />
        )}
        {viewed?.status === "active" && viewed.type === "mcq" && (
          <McqSection section={viewed} submitting={submitting}
            onSelect={saveMcq} onSubmitSection={() => submitSection(viewed.id)} />
        )}
      </div>
    </div>
  );
};

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center text-muted-foreground space-y-2">
          <div className="mx-auto w-fit">{icon}</div>
          <p>{text}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Coding section: batch-exam template (QuestionPanel + CodeEditor split) ──
function CodingSection({ section, submitting, onSubmitSection, runCoding, submitCoding }: {
  section: any; submitting: boolean; onSubmitSection: () => void;
  runCoding: (aqId: string) => (code: string, lang: string) => Promise<any>;
  submitCoding: (aqId: string) => (code: string, lang: string) => Promise<void>;
}) {
  const questions = section.questions || [];
  const [qi, setQi] = useState(0);
  const q = questions[qi];
  if (!q) return null;

  const panelQuestion = {
    id: q.question?.id,
    title: q.question?.title,
    problem_statement: q.question?.problem_statement,
    difficulty: diffLabel(q.question?.difficulty),
    image_url: q.question?.image_url ?? null,
    testCases: (q.public_test_cases || []).map((tc: any) => ({ input: tc.input, output: tc.expected_output })),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Question tabs + submit section */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background flex-shrink-0 overflow-x-auto no-scrollbar">
        {questions.map((cq: any, i: number) => (
          <button key={cq.attempt_question_id} onClick={() => setQi(i)}
            className={`shrink-0 px-3 py-1 rounded-md text-sm border transition ${
              i === qi ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
            Q{i + 1} <span className="opacity-70">· {cq.points}p</span>
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={onSubmitSection} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</> : "Submit Section"}
        </Button>
      </div>

      {/* Split pane */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 p-2">
        <div className="h-full min-h-0">
          <QuestionPanel question={panelQuestion} />
        </div>
        <div className="h-full min-h-0">
          <CodeEditor
            key={q.attempt_question_id}
            onRunCode={runCoding(q.attempt_question_id)}
            onSubmitCode={submitCoding(q.attempt_question_id)}
            isSubmitted={false}
          />
        </div>
      </div>
    </div>
  );
}

// ── MCQ section: centered scrollable card list ──
function McqSection({ section, submitting, onSelect, onSubmitSection }: {
  section: any; submitting: boolean;
  onSelect: (aqId: string, optionId: string) => void; onSubmitSection: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {(section.questions || []).map((q: any, idx: number) => (
          <Card key={q.attempt_question_id}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Q{idx + 1}</Badge>
                <span className="text-sm text-muted-foreground">{q.points} pts</span>
              </div>
              <McqQuestion q={q} onSelect={(opt) => onSelect(q.attempt_question_id, opt)} />
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end pb-8">
          <Button size="lg" onClick={onSubmitSection} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit Section"}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
