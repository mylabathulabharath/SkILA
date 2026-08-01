import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RegistrationForm } from "./RegistrationForm";
import { SectionRunner } from "./SectionRunner";

interface Creds { attempt_id: string; session_token: string; }
type Phase = "loading" | "register" | "exam" | "done";

// Orchestrates a public sectioned exam: register (or resume via localStorage),
// run sections, then show the result. Mounted by Exam.tsx when the route param
// resolves to a public sectioned exam's sharing_token.
export const SectionedExam = ({ sharingToken, examName }: { sharingToken: string; examName?: string }) => {
  const navigate = useNavigate();
  const storeKey = `skila_exam_${sharingToken}`;
  const [phase, setPhase] = useState<Phase>("loading");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [examState, setExamState] = useState<any>(null);

  const refresh = useCallback(async (c: Creds) => {
    const { data, error } = await supabase.functions.invoke("get-exam-state", {
      body: { attempt_id: c.attempt_id, session_token: c.session_token },
    });
    if (error || !data?.success) {
      localStorage.removeItem(storeKey);
      setCreds(null);
      setPhase("register");
      return;
    }
    setExamState(data.data);
    setPhase(data.data.status === "active" ? "exam" : "done");
  }, [storeKey]);

  useEffect(() => {
    const raw = localStorage.getItem(storeKey);
    if (raw) {
      try {
        const c = JSON.parse(raw) as Creds;
        setCreds(c);
        refresh(c);
        return;
      } catch { /* fall through */ }
    }
    setPhase("register");
  }, [storeKey, refresh]);

  const onRegistered = (data: any) => {
    const c: Creds = { attempt_id: data.attempt_id, session_token: data.session_token };
    localStorage.setItem(storeKey, JSON.stringify(c));
    setCreds(c);
    refresh(c);
  };

  if (phase === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (phase === "register") {
    return <RegistrationForm sharingToken={sharingToken} examName={examName} onRegistered={onRegistered} />;
  }
  if (phase === "done") {
    const score = examState?.score ?? 0;
    const max = examState?.max_score ?? 0;
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="py-10 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Trophy className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Exam Submitted</p>
              <p className="text-sm text-muted-foreground">{examState?.exam?.name}</p>
            </div>
            <div className="text-4xl font-bold text-primary">{score}<span className="text-lg text-muted-foreground">/{max}</span></div>
            <p className="text-sm text-muted-foreground">{pct}%</p>
            <Button variant="outline" onClick={() => navigate("/")}>Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <SectionRunner examState={examState} creds={creds!} onRefresh={() => refresh(creds!)} />;
};
