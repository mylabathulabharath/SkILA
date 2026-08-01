import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, GripVertical, Plus } from "lucide-react";
import {
  BUCKETS, Bucket, BankQuestion, PoolItem, SectionDraft,
  NavigationMode, TimingMode, poolCountByBucket,
} from "./types";

interface Props {
  index: number;
  section: SectionDraft;
  bank: BankQuestion[];
  navigationMode: NavigationMode;
  timingMode: TimingMode;
  onChange: (s: SectionDraft) => void;
  onRemove: () => void;
}

const bucketColor: Record<Bucket, string> = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

export const SectionCard = ({
  index, section, bank, navigationMode, timingMode, onChange, onRemove,
}: Props) => {
  const [search, setSearch] = useState("");
  const patch = (p: Partial<SectionDraft>) => onChange({ ...section, ...p });

  const poolIds = useMemo(() => new Set(section.pool.map((p) => p.questionId)), [section.pool]);
  const candidates = useMemo(
    () => bank
      .filter((q) => q.kind === section.type && !poolIds.has(q.id))
      .filter((q) => q.label.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 40),
    [bank, section.type, poolIds, search],
  );
  const counts = poolCountByBucket(section.pool);

  const addToPool = (q: BankQuestion) => {
    const item: PoolItem = { kind: q.kind, questionId: q.id, label: q.label, bucket: q.bucket, points: 10 };
    patch({ pool: [...section.pool, item] });
  };
  const updateItem = (questionId: string, p: Partial<PoolItem>) =>
    patch({ pool: section.pool.map((it) => (it.questionId === questionId ? { ...it, ...p } : it)) });
  const removeItem = (questionId: string) =>
    patch({ pool: section.pool.filter((it) => it.questionId !== questionId) });

  const totalDraw = BUCKETS.reduce((n, b) => n + (parseInt(section.draw[b]) || 0), 0);

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground">SECTION {index + 1}</span>
          <Input
            value={section.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="h-8 max-w-xs font-medium"
          />
          <Select value={section.type} onValueChange={(v) => patch({ type: v as any, pool: [], draw: { easy: "", medium: "", hard: "" } })}>
            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="coding">Coding</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Per-section knobs */}
        <div className="flex flex-wrap gap-4">
          {(timingMode === "per_section" || timingMode === "both") && (
            <div className="space-y-1">
              <Label className="text-xs">Section time (min)</Label>
              <Input type="number" min="1" className="h-8 w-28"
                value={section.timeLimitMinutes}
                onChange={(e) => patch({ timeLimitMinutes: e.target.value })} />
            </div>
          )}
          {navigationMode === "sequential_cutoff" && (
            <div className="space-y-1">
              <Label className="text-xs">Pass cutoff (%)</Label>
              <Input type="number" min="0" max="100" className="h-8 w-28"
                value={section.passCutoffPercent}
                onChange={(e) => patch({ passCutoffPercent: e.target.value })} />
            </div>
          )}
        </div>

        {/* Pool picker */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Question pool ({section.pool.length})</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={`Search ${section.type} questions…`} className="pl-8 h-8"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="border rounded-md max-h-44 overflow-y-auto divide-y">
              {candidates.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No matching questions in the bank.</p>
              )}
              {candidates.map((q) => (
                <button key={q.id} type="button" onClick={() => addToPool(q)}
                  className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 text-sm">
                  <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate">{q.label}</span>
                  <Badge className={`${bucketColor[q.bucket]} text-[10px]`}>{q.bucket}</Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Selected pool */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">In this pool</Label>
            <div className="border rounded-md max-h-44 overflow-y-auto divide-y">
              {section.pool.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">Add questions from the left.</p>
              )}
              {section.pool.map((it) => (
                <div key={it.questionId} className="flex items-center gap-2 p-2 text-sm">
                  <span className="flex-1 truncate">{it.label}</span>
                  <Select value={it.bucket} onValueChange={(v) => updateItem(it.questionId, { bucket: v as Bucket })}>
                    <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUCKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" className="h-7 w-16" title="points"
                    value={it.points}
                    onChange={(e) => updateItem(it.questionId, { points: Math.max(1, parseInt(e.target.value) || 1) })} />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => removeItem(it.questionId)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Draw rules */}
        <div className="rounded-md bg-muted/40 p-3">
          <Label className="text-xs font-semibold">Draw rule — how many each student gets</Label>
          <div className="mt-2 flex flex-wrap gap-4">
            {BUCKETS.map((b) => {
              const avail = counts[b];
              const val = parseInt(section.draw[b]) || 0;
              const invalid = val > avail;
              return (
                <div key={b} className="space-y-1">
                  <Label className="text-xs capitalize flex items-center gap-1">
                    {b} <span className="text-muted-foreground">(pool: {avail})</span>
                  </Label>
                  <Input type="number" min="0" max={avail} className={`h-8 w-24 ${invalid ? "border-destructive" : ""}`}
                    value={section.draw[b]}
                    onChange={(e) => patch({ draw: { ...section.draw, [b]: e.target.value } })} />
                </div>
              );
            })}
            <div className="flex items-end">
              <Badge variant="outline" className="h-8 px-3">Each student: {totalDraw} question{totalDraw !== 1 ? "s" : ""}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
