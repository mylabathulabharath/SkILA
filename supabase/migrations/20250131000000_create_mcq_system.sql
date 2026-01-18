-- MCQ System Migration
-- Creates complete MCQ assessment system separate from coding exams

-- Create difficulty enum for MCQs
DO $$ BEGIN
  CREATE TYPE public.mcq_difficulty AS ENUM ('Easy', 'Medium', 'Hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create status enum for MCQ attempts
DO $$ BEGIN
  CREATE TYPE public.mcq_attempt_status AS ENUM ('active', 'submitted', 'auto_submitted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create mcq_subjects table
CREATE TABLE IF NOT EXISTS public.mcq_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mcq_concepts table
CREATE TABLE IF NOT EXISTS public.mcq_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.mcq_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- Create mcq_questions table
CREATE TABLE IF NOT EXISTS public.mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.mcq_subjects(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.mcq_concepts(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  difficulty public.mcq_difficulty DEFAULT 'Medium',
  marks INTEGER DEFAULT 1 CHECK (marks > 0),
  negative_marks NUMERIC DEFAULT 0 CHECK (negative_marks >= 0),
  explanation TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mcq_options table
CREATE TABLE IF NOT EXISTS public.mcq_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.mcq_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mcq_tests table
CREATE TABLE IF NOT EXISTS public.mcq_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.mcq_subjects(id),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  total_marks INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mcq_test_questions table
CREATE TABLE IF NOT EXISTS public.mcq_test_questions (
  test_id UUID REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.mcq_questions(id) ON DELETE CASCADE,
  marks_override INTEGER,
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (test_id, question_id)
);

-- Create mcq_test_assignments table
CREATE TABLE IF NOT EXISTS public.mcq_test_assignments (
  test_id UUID REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  PRIMARY KEY (test_id, batch_id)
);

-- Create mcq_attempts table
CREATE TABLE IF NOT EXISTS public.mcq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.mcq_tests(id),
  user_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status public.mcq_attempt_status DEFAULT 'active',
  score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for single active MCQ attempt
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_mcq_attempt 
ON public.mcq_attempts (test_id, user_id, status) 
WHERE status = 'active';

-- Create mcq_responses table
CREATE TABLE IF NOT EXISTS public.mcq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.mcq_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.mcq_questions(id),
  selected_option_ids UUID[] DEFAULT '{}',
  is_correct BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all MCQ tables
ALTER TABLE public.mcq_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcq_subjects
CREATE POLICY "Everyone can view active subjects" ON public.mcq_subjects
  FOR SELECT USING (status = 'active' OR public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

CREATE POLICY "Trainers and admins can manage subjects" ON public.mcq_subjects
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

-- RLS Policies for mcq_concepts
CREATE POLICY "Everyone can view concepts of active subjects" ON public.mcq_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_subjects ms 
      WHERE ms.id = mcq_concepts.subject_id 
      AND (ms.status = 'active' OR public.get_user_role(auth.uid()) IN ('trainer', 'admin'))
    )
  );

CREATE POLICY "Trainers and admins can manage concepts" ON public.mcq_concepts
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

-- RLS Policies for mcq_questions
CREATE POLICY "Students can view questions in assigned tests" ON public.mcq_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_test_questions mtq
      JOIN public.mcq_test_assignments mta ON mtq.test_id = mta.test_id
      JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mtq.question_id = mcq_questions.id 
      AND bm.user_id = auth.uid()
      AND NOW() BETWEEN mta.start_at AND mta.end_at
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can manage questions" ON public.mcq_questions
  FOR ALL USING (
    created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for mcq_options
CREATE POLICY "Students can view options for accessible questions" ON public.mcq_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_questions mq
      WHERE mq.id = mcq_options.question_id
      AND (
        EXISTS (
          SELECT 1 FROM public.mcq_test_questions mtq
          JOIN public.mcq_test_assignments mta ON mtq.test_id = mta.test_id
          JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
          WHERE mtq.question_id = mq.id 
          AND bm.user_id = auth.uid()
        ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
      )
    )
  );

CREATE POLICY "Trainers and admins can manage options" ON public.mcq_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.mcq_questions mq 
      WHERE mq.id = mcq_options.question_id 
      AND (mq.created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
  );

-- RLS Policies for mcq_tests
CREATE POLICY "Students can view tests assigned to their batches" ON public.mcq_tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_test_assignments mta
      JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mta.test_id = mcq_tests.id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can manage tests" ON public.mcq_tests
  FOR ALL USING (
    created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for mcq_test_questions
CREATE POLICY "Students can view test questions for assigned tests" ON public.mcq_test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_test_assignments mta
      JOIN public.batch_members bm ON mta.batch_id = bm.batch_id
      WHERE mta.test_id = mcq_test_questions.test_id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can manage test questions" ON public.mcq_test_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.mcq_tests mt 
      WHERE mt.id = mcq_test_questions.test_id 
      AND (mt.created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
  );

-- RLS Policies for mcq_test_assignments
CREATE POLICY "Students can view assignments for their batches" ON public.mcq_test_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.batch_members bm 
      WHERE bm.batch_id = mcq_test_assignments.batch_id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can manage test assignments" ON public.mcq_test_assignments
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

-- RLS Policies for mcq_attempts
CREATE POLICY "Users can view own attempts" ON public.mcq_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own attempts" ON public.mcq_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attempts" ON public.mcq_attempts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Trainers can view attempts for their tests" ON public.mcq_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_tests mt 
      WHERE mt.id = mcq_attempts.test_id AND mt.created_by = auth.uid()
    ) OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for mcq_responses
CREATE POLICY "Users can view own responses" ON public.mcq_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_attempts ma 
      WHERE ma.id = mcq_responses.attempt_id AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own responses" ON public.mcq_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mcq_attempts ma 
      WHERE ma.id = mcq_responses.attempt_id AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own responses" ON public.mcq_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.mcq_attempts ma 
      WHERE ma.id = mcq_responses.attempt_id AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view responses for their tests" ON public.mcq_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_attempts ma
      JOIN public.mcq_tests mt ON ma.test_id = mt.id
      WHERE ma.id = mcq_responses.attempt_id 
      AND mt.created_by = auth.uid()
    ) OR public.get_user_role(auth.uid()) = 'admin'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcq_concepts_subject ON public.mcq_concepts (subject_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_subject ON public.mcq_questions (subject_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_concept ON public.mcq_questions (concept_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_created_by ON public.mcq_questions (created_by);
CREATE INDEX IF NOT EXISTS idx_mcq_options_question ON public.mcq_options (question_id);
CREATE INDEX IF NOT EXISTS idx_mcq_tests_subject ON public.mcq_tests (subject_id);
CREATE INDEX IF NOT EXISTS idx_mcq_tests_created_by ON public.mcq_tests (created_by);
CREATE INDEX IF NOT EXISTS idx_mcq_test_questions_test ON public.mcq_test_questions (test_id);
CREATE INDEX IF NOT EXISTS idx_mcq_test_questions_question ON public.mcq_test_questions (question_id);
CREATE INDEX IF NOT EXISTS idx_mcq_test_assignments_batch ON public.mcq_test_assignments (batch_id);
CREATE INDEX IF NOT EXISTS idx_mcq_test_assignments_test ON public.mcq_test_assignments (test_id);
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_user_test ON public.mcq_attempts (user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_test ON public.mcq_attempts (test_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_attempt ON public.mcq_responses (attempt_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_question ON public.mcq_responses (question_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_mcq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_mcq_subjects_updated_at
  BEFORE UPDATE ON public.mcq_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_mcq_updated_at();

CREATE TRIGGER update_mcq_concepts_updated_at
  BEFORE UPDATE ON public.mcq_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_mcq_updated_at();

CREATE TRIGGER update_mcq_questions_updated_at
  BEFORE UPDATE ON public.mcq_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_mcq_updated_at();

CREATE TRIGGER update_mcq_tests_updated_at
  BEFORE UPDATE ON public.mcq_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_mcq_updated_at();

-- Create function to calculate MCQ attempt score
CREATE OR REPLACE FUNCTION public.calculate_mcq_attempt_score(attempt_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_score NUMERIC := 0;
  question_record RECORD;
  response_record RECORD;
  question_marks NUMERIC;
  is_correct BOOLEAN;
  negative_marks NUMERIC;
BEGIN
  -- Loop through all questions in the test
  FOR question_record IN 
    SELECT mtq.question_id, 
           COALESCE(mtq.marks_override, mq.marks) as marks,
           mq.negative_marks
    FROM public.mcq_test_questions mtq
    JOIN public.mcq_questions mq ON mtq.question_id = mq.id
    WHERE mtq.test_id = (SELECT test_id FROM public.mcq_attempts WHERE id = attempt_uuid)
  LOOP
    -- Get the response for this question
    SELECT INTO response_record 
      selected_option_ids, is_correct
    FROM public.mcq_responses
    WHERE attempt_id = attempt_uuid 
    AND question_id = question_record.question_id;
    
    -- Calculate score for this question
    IF response_record.is_correct THEN
      total_score := total_score + question_record.marks;
    ELSIF response_record.selected_option_ids IS NOT NULL AND array_length(response_record.selected_option_ids, 1) > 0 THEN
      -- Incorrect answer - apply negative marking
      total_score := total_score - question_record.negative_marks;
    END IF;
  END LOOP;
  
  RETURN GREATEST(0, total_score); -- Ensure score is not negative
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for MCQ student progress
CREATE OR REPLACE VIEW public.vw_mcq_student_progress AS
SELECT 
  p.id as user_id,
  p.full_name,
  COUNT(DISTINCT ma.test_id) as total_mcq_tests_taken,
  COALESCE(AVG(CASE WHEN ma.status IN ('submitted', 'auto_submitted') THEN (ma.score::float / NULLIF(ma.max_score, 0)) * 100 END), 0) as average_score_percent,
  MAX(ma.submitted_at) as last_test_date,
  SUM(ma.correct_answers) as total_correct_answers,
  SUM(ma.total_questions) as total_questions_attempted
FROM public.profiles p
LEFT JOIN public.mcq_attempts ma ON p.id = ma.user_id AND ma.status IN ('submitted', 'auto_submitted')
GROUP BY p.id, p.full_name;

-- Create view for upcoming MCQ tests
CREATE OR REPLACE VIEW public.vw_upcoming_mcq_tests AS
SELECT 
  mt.id,
  mt.title,
  mt.duration_minutes,
  mta.start_at,
  mta.end_at,
  mta.batch_id,
  b.name as batch_name,
  ms.name as subject_name
FROM public.mcq_tests mt
JOIN public.mcq_test_assignments mta ON mt.id = mta.test_id
JOIN public.batches b ON mta.batch_id = b.id
LEFT JOIN public.mcq_subjects ms ON mt.subject_id = ms.id
WHERE mta.start_at <= NOW() + INTERVAL '7 days' 
  AND mta.end_at >= NOW();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_mcq_attempt_score(UUID) TO authenticated;

