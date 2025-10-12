-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('student', 'trainer', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create batches table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Create batch_members table
CREATE TABLE public.batch_members (
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_batch TEXT CHECK (role_in_batch IN ('student', 'trainer')) NOT NULL,
  PRIMARY KEY (batch_id, user_id)
);

-- Enable RLS on batch_members
ALTER TABLE public.batch_members ENABLE ROW LEVEL SECURITY;

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  supported_languages TEXT[] DEFAULT ARRAY['c', 'cpp', 'python', 'java', 'javascript'],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create question_test_cases table
CREATE TABLE public.question_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0
);

-- Enable RLS on question_test_cases
ALTER TABLE public.question_test_cases ENABLE ROW LEVEL SECURITY;

-- Create tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  time_limit_minutes INTEGER NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tests
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Create test_questions table
CREATE TABLE public.test_questions (
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 100,
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (test_id, question_id)
);

-- Enable RLS on test_questions
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

-- Create test_assignments table
CREATE TABLE public.test_assignments (
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  PRIMARY KEY (test_id, batch_id)
);

-- Enable RLS on test_assignments
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

-- Create attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id),
  user_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'submitted', 'auto_submitted', 'expired', 'cancelled')) DEFAULT 'active',
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}'
);

-- Enable RLS on attempts
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Create unique constraint for single active attempt
CREATE UNIQUE INDEX unique_active_attempt ON public.attempts (test_id, user_id, status) WHERE status = 'active';

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id),
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  run_type TEXT CHECK (run_type IN ('run', 'submit')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  passed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  time_ms INTEGER DEFAULT 0,
  memory_kb INTEGER DEFAULT 0,
  stderr TEXT DEFAULT '',
  stdout_preview TEXT DEFAULT '',
  verdict TEXT CHECK (verdict IN ('passed', 'failed', 'error', 'timeout'))
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create submission_case_results table
CREATE TABLE public.submission_case_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  case_order INTEGER,
  input TEXT,
  expected_output TEXT,
  actual_output TEXT,
  status TEXT CHECK (status IN ('pass', 'fail', 'error', 'timeout'))
);

-- Enable RLS on submission_case_results
ALTER TABLE public.submission_case_results ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = user_id;
$$;

-- Helper function to check if user is in batch
CREATE OR REPLACE FUNCTION public.user_in_batch(user_id UUID, batch_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.batch_members 
    WHERE user_id = user_in_batch.user_id AND batch_id = user_in_batch.batch_id
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Trainers and admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

CREATE POLICY "Only admins can change roles" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for batches
CREATE POLICY "Users can view batches they belong to" ON public.batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.batch_members 
      WHERE batch_id = batches.id AND user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can create batches" ON public.batches
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

CREATE POLICY "Creators and admins can update batches" ON public.batches
  FOR UPDATE USING (
    created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for batch_members
CREATE POLICY "Users can view batch memberships" ON public.batch_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers and admins can manage memberships" ON public.batch_members
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('trainer', 'admin'));

-- RLS Policies for questions
CREATE POLICY "Students can view questions in assigned tests" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_questions tq
      JOIN public.test_assignments ta ON tq.test_id = ta.test_id
      JOIN public.batch_members bm ON ta.batch_id = bm.batch_id
      WHERE tq.question_id = questions.id 
      AND bm.user_id = auth.uid()
      AND NOW() BETWEEN ta.start_at AND ta.end_at
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers can manage their questions" ON public.questions
  FOR ALL USING (
    created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for question_test_cases
CREATE POLICY "Students can view public test cases" ON public.question_test_cases
  FOR SELECT USING (
    is_public = TRUE AND EXISTS (
      SELECT 1 FROM public.test_questions tq
      JOIN public.test_assignments ta ON tq.test_id = ta.test_id
      JOIN public.batch_members bm ON ta.batch_id = bm.batch_id
      WHERE tq.question_id = question_test_cases.question_id 
      AND bm.user_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) IN ('trainer', 'admin')
  );

CREATE POLICY "Trainers can manage test cases" ON public.question_test_cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questions q 
      WHERE q.id = question_test_cases.question_id 
      AND q.created_by = auth.uid()
    ) OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for attempts
CREATE POLICY "Users can view own attempts" ON public.attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own attempts" ON public.attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attempts" ON public.attempts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Trainers can view attempts for their tests" ON public.attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tests t 
      WHERE t.id = attempts.test_id AND t.created_by = auth.uid()
    ) OR public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for submissions
CREATE POLICY "Users can view own submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attempts a 
      WHERE a.id = submissions.attempt_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own submissions" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attempts a 
      WHERE a.id = submissions.attempt_id AND a.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_attempts_user_test ON public.attempts (user_id, test_id);
CREATE INDEX idx_submissions_attempt_created ON public.submissions (attempt_id, created_at DESC);
CREATE INDEX idx_batch_members_user ON public.batch_members (user_id);
CREATE INDEX idx_batch_members_batch ON public.batch_members (batch_id);
CREATE INDEX idx_test_assignments_batch ON public.test_assignments (batch_id);
CREATE INDEX idx_test_questions_test ON public.test_questions (test_id);

-- Create views for dashboard
CREATE OR REPLACE VIEW public.vw_student_progress AS
SELECT 
  p.id as user_id,
  p.full_name,
  COUNT(DISTINCT a.test_id) as total_tests_taken,
  COALESCE(AVG(CASE WHEN a.status IN ('submitted', 'auto_submitted') THEN (a.score::float / NULLIF(a.max_score, 0)) * 100 END), 0) as average_score_percent,
  MAX(a.submitted_at) as last_test_date,
  COUNT(DISTINCT DATE(a.submitted_at)) as activity_streak
FROM public.profiles p
LEFT JOIN public.attempts a ON p.id = a.user_id AND a.status IN ('submitted', 'auto_submitted')
GROUP BY p.id, p.full_name;

CREATE OR REPLACE VIEW public.vw_upcoming_tests AS
SELECT 
  t.id,
  t.name,
  t.time_limit_minutes,
  ta.start_at,
  ta.end_at,
  ta.batch_id,
  b.name as batch_name
FROM public.tests t
JOIN public.test_assignments ta ON t.id = ta.test_id
JOIN public.batches b ON ta.batch_id = b.id
WHERE ta.start_at <= NOW() + INTERVAL '7 days' 
  AND ta.end_at >= NOW();

CREATE OR REPLACE VIEW public.vw_recent_activity AS
SELECT 
  a.id as attempt_id,
  t.name as test_name,
  a.score,
  a.max_score,
  a.submitted_at,
  a.status,
  a.user_id
FROM public.attempts a
JOIN public.tests t ON a.test_id = t.id
WHERE a.status IN ('submitted', 'auto_submitted')
ORDER BY a.submitted_at DESC;