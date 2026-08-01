-- ==========================================================================
-- Sectioned Exams with Randomized Pools & Public Registration
-- Adds a sectioned-exam layer on top of the existing `tests` container and a
-- unified attempt model spanning both MCQ and coding sections.
-- Legacy (non-sectioned) tests are untouched: is_sectioned defaults FALSE.
-- ==========================================================================

-- ---- 1. Exam-level config on the existing tests container -----------------
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS is_sectioned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS navigation_mode TEXT
    CHECK (navigation_mode IN ('free', 'sequential_lock', 'sequential_cutoff')),
  ADD COLUMN IF NOT EXISTS timing_mode TEXT
    CHECK (timing_mode IN ('per_section', 'overall', 'both')),
  ADD COLUMN IF NOT EXISTS overall_time_limit_minutes INTEGER;

-- ---- 2. Sections ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('mcq', 'coding')),
  order_index INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,               -- per-section timer (per_section/both)
  pass_cutoff_percent INTEGER,              -- used only when navigation_mode = sequential_cutoff
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;

-- ---- 3. Section pool (eligible questions) + per-difficulty draw rules ------
-- Exactly one of question_id / mcq_question_id is set, matching section_type.
CREATE TABLE IF NOT EXISTS public.section_pool_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  mcq_question_id UUID REFERENCES public.mcq_questions(id) ON DELETE CASCADE,
  difficulty_bucket TEXT NOT NULL CHECK (difficulty_bucket IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 10,
  CONSTRAINT one_question_ref CHECK (
    (question_id IS NOT NULL)::int + (mcq_question_id IS NOT NULL)::int = 1
  )
);
ALTER TABLE public.section_pool_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pool_items_section ON public.section_pool_items (section_id);

CREATE TABLE IF NOT EXISTS public.section_draw_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  difficulty_bucket TEXT NOT NULL CHECK (difficulty_bucket IN ('easy', 'medium', 'hard')),
  draw_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (section_id, difficulty_bucket)
);
ALTER TABLE public.section_draw_rules ENABLE ROW LEVEL SECURITY;

-- ---- 4. Public candidates (no auth account) -------------------------------
CREATE TABLE IF NOT EXISTS public.exam_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  roll_number TEXT,
  branch TEXT,
  college TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (test_id, email)                   -- one attempt per email per exam
);
ALTER TABLE public.exam_candidates ENABLE ROW LEVEL SECURITY;

-- ---- 5. Unified attempt: link to candidate + track current section --------
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.exam_candidates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS current_section_id UUID REFERENCES public.exam_sections(id);

-- Tie a coding submission to the exact frozen question it answers.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS attempt_question_id UUID;

-- ---- 6. Frozen per-student draw -------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id),
  mcq_question_id UUID REFERENCES public.mcq_questions(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 10,
  CONSTRAINT aq_one_question_ref CHECK (
    (question_id IS NOT NULL)::int + (mcq_question_id IS NOT NULL)::int = 1
  )
);
ALTER TABLE public.attempt_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt ON public.attempt_questions (attempt_id);

-- Now that attempt_questions exists, add the FK for submissions.attempt_question_id
DO $$ BEGIN
  ALTER TABLE public.submissions
    ADD CONSTRAINT submissions_attempt_question_id_fkey
    FOREIGN KEY (attempt_question_id) REFERENCES public.attempt_questions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- 7. Per-section progress (gating + per-section timers) -----------------
CREATE TABLE IF NOT EXISTS public.attempt_section_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  score INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  UNIQUE (attempt_id, section_id)
);
ALTER TABLE public.attempt_section_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_section_progress_attempt ON public.attempt_section_progress (attempt_id);

-- ---- 8. Server-graded MCQ responses for unified attempts ------------------
-- The client write-path (save-mcq-answer) never reads/writes is_correct;
-- grading is filled in server-side by submit-section.
CREATE TABLE IF NOT EXISTS public.attempt_mcq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  attempt_question_id UUID NOT NULL REFERENCES public.attempt_questions(id) ON DELETE CASCADE,
  mcq_question_id UUID NOT NULL REFERENCES public.mcq_questions(id),
  selected_option_ids UUID[] DEFAULT '{}',
  is_correct BOOLEAN,
  marks_awarded INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, attempt_question_id)
);
ALTER TABLE public.attempt_mcq_responses ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- RLS: trainers/admins manage everything. Candidate-facing traffic is handled
-- exclusively by edge functions using the service role (which bypasses RLS),
-- so we intentionally do NOT open anonymous policies here.
-- ==========================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'exam_sections','section_pool_items','section_draw_rules','exam_candidates',
    'attempt_questions','attempt_section_progress','attempt_mcq_responses'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "trainers_admins_manage" ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY "trainers_admins_manage" ON public.%I FOR ALL '
      || 'USING (public.get_user_role(auth.uid()) IN (''trainer'',''admin'')) '
      || 'WITH CHECK (public.get_user_role(auth.uid()) IN (''trainer'',''admin''));', t);
  END LOOP;
END $$;

-- Logged-in students may read the sanitized structure of a public exam's
-- sections (needed by the taker UI for assigned, non-public sectioned exams).
-- Pool contents / answer keys are never exposed via RLS — only via edge fns.
DROP POLICY IF EXISTS "read_sections_of_accessible_exam" ON public.exam_sections;
CREATE POLICY "read_sections_of_accessible_exam" ON public.exam_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = exam_sections.test_id
      AND (t.is_public = TRUE
           OR public.get_user_role(auth.uid()) IN ('trainer','admin')
           OR EXISTS (
             SELECT 1 FROM public.test_assignments ta
             JOIN public.batch_members bm ON ta.batch_id = bm.batch_id
             WHERE ta.test_id = t.id AND bm.user_id = auth.uid()
           ))
    )
  );
