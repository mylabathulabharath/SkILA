-- Add sharing and public accessibility to exams
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS sharing_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

ALTER TABLE public.mcq_tests ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE public.mcq_tests ADD COLUMN IF NOT EXISTS sharing_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Ensure attempts are deleted when tests are deleted
ALTER TABLE public.attempts 
DROP CONSTRAINT IF EXISTS attempts_test_id_fkey,
ADD CONSTRAINT attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

ALTER TABLE public.mcq_attempts 
DROP CONSTRAINT IF EXISTS mcq_attempts_test_id_fkey,
ADD CONSTRAINT mcq_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.mcq_tests(id) ON DELETE CASCADE;

-- Update RLS Policies for tests to allow public access
DROP POLICY IF EXISTS "Students can view tests assigned to their batches" ON public.tests;
CREATE POLICY "Users can view tests if assigned or public" ON public.tests
  FOR SELECT USING (
    is_public = TRUE OR
    EXISTS (
      SELECT 1 FROM public.test_assignments ta
      JOIN public.batch_members bm ON ta.batch_id = bm.batch_id
      WHERE ta.test_id = tests.id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

DROP POLICY IF EXISTS "Students can view tests assigned to their batches" ON public.mcq_tests;
CREATE POLICY "Users can view tests if assigned or public" ON public.mcq_tests
  FOR SELECT USING (
    is_public = TRUE OR
    EXISTS (
      SELECT 1 FROM public.mcq_test_assignments mta
      JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mta.test_id = mcq_tests.id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

-- Allow viewing questions for public tests
DROP POLICY IF EXISTS "Students can view questions in assigned tests" ON public.questions;
CREATE POLICY "Students can view questions in assigned or public tests" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_questions mtq
      JOIN public.tests mt ON mtq.test_id = mt.id
      LEFT JOIN public.test_assignments mta ON mt.id = mta.test_id
      LEFT JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mtq.question_id = questions.id 
      AND (
        mt.is_public = TRUE OR 
        (bm.user_id = auth.uid() AND NOW() BETWEEN mta.start_at AND mta.end_at)
      )
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

DROP POLICY IF EXISTS "Students can view questions in assigned tests" ON public.mcq_questions;
CREATE POLICY "Students can view questions in assigned or public tests" ON public.mcq_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_test_questions mtq
      JOIN public.mcq_tests mt ON mtq.test_id = mt.id
      LEFT JOIN public.mcq_test_assignments mta ON mt.id = mta.test_id
      LEFT JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mtq.question_id = mcq_questions.id 
      AND (
        mt.is_public = TRUE OR 
        (bm.user_id = auth.uid() AND NOW() BETWEEN mta.start_at AND mta.end_at)
      )
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

-- Allow viewing options for public test questions
DROP POLICY IF EXISTS "Students can view options for accessible questions" ON public.mcq_options;
CREATE POLICY "Students can view options for accessible questions" ON public.mcq_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_questions mq
      WHERE mq.id = mcq_options.question_id
      AND (
        EXISTS (
          SELECT 1 FROM public.mcq_test_questions mtq
          JOIN public.mcq_tests mt ON mtq.test_id = mt.id
          LEFT JOIN public.mcq_test_assignments mta ON mt.id = mta.test_id
          LEFT JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
          WHERE mtq.question_id = mq.id 
          AND (mt.is_public = TRUE OR bm.user_id = auth.uid())
        ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
      )
    )
  );

-- Add description to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS description TEXT;
