// Local draft types for the sectioned Exam Builder (client-side only, until
// the exam is written to Supabase on submit).

export type Bucket = "easy" | "medium" | "hard";
export type SectionType = "mcq" | "coding";
export type NavigationMode = "free" | "sequential_lock" | "sequential_cutoff";
export type TimingMode = "per_section" | "overall" | "both";

export interface BankQuestion {
  id: string;
  label: string;        // title (coding) or question_text (mcq)
  bucket: Bucket;       // derived from difficulty
  kind: SectionType;
}

export interface PoolItem {
  kind: SectionType;
  questionId: string;
  label: string;
  bucket: Bucket;
  points: number;
}

export interface SectionDraft {
  key: string;                 // local-only id
  title: string;
  type: SectionType;
  timeLimitMinutes: string;    // used when timing is per_section/both
  passCutoffPercent: string;   // used when navigation is sequential_cutoff
  pool: PoolItem[];
  draw: Record<Bucket, string>; // per-bucket draw counts (as string inputs)
}

export const BUCKETS: Bucket[] = ["easy", "medium", "hard"];

// coding `questions.difficulty` is 1..5; map to a bucket.
export function codingBucket(difficulty: number | null): Bucket {
  if ((difficulty ?? 3) <= 2) return "easy";
  if ((difficulty ?? 3) <= 4) return "medium";
  return "hard";
}

// mcq `mcq_questions.difficulty` is an enum Easy/Medium/Hard.
export function mcqBucket(difficulty: string | null): Bucket {
  const d = (difficulty ?? "Medium").toLowerCase();
  return d === "easy" ? "easy" : d === "hard" ? "hard" : "medium";
}

export function newSection(type: SectionType): SectionDraft {
  return {
    key: crypto.randomUUID(),
    title: type === "mcq" ? "MCQ Section" : "Coding Section",
    type,
    timeLimitMinutes: "",
    passCutoffPercent: "",
    pool: [],
    draw: { easy: "", medium: "", hard: "" },
  };
}

export function poolCountByBucket(pool: PoolItem[]): Record<Bucket, number> {
  return {
    easy: pool.filter((p) => p.bucket === "easy").length,
    medium: pool.filter((p) => p.bucket === "medium").length,
    hard: pool.filter((p) => p.bucket === "hard").length,
  };
}
