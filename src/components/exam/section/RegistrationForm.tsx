import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2 } from "lucide-react";

interface Props {
  sharingToken: string;
  examName?: string;
  onRegistered: (data: any) => void;
}

// Candidate registration gate for a public sectioned exam. Captures identity,
// then calls the register-candidate edge function which freezes the paper.
export const RegistrationForm = ({ sharingToken, examName, onRegistered }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ name: "", email: "", roll_number: "", branch: "", college: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim()) {
      toast({ title: "Missing details", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-candidate", {
        body: { sharing_token: sharingToken, ...f },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || "Registration failed");
      onRegistered(data.data);
    } catch (err: any) {
      toast({ title: "Could not start exam", description: err.message || "Registration failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-2">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl">{examName || "Exam Registration"}</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your details to begin. You can attempt this exam once.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Full name *</Label>
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email *</Label>
                <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Roll number</Label>
                <Input value={f.roll_number} onChange={(e) => set("roll_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Branch / Stream</Label>
                <Input value={f.branch} onChange={(e) => set("branch", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>College</Label>
                <Input value={f.college} onChange={(e) => set("college", e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</> : "Start Exam"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
