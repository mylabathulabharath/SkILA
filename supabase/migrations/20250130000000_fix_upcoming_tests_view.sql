-- Fix upcoming tests view to exclude tests that users have already attempted
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
  AND ta.end_at >= NOW()
  -- Exclude tests that the current user has already attempted
  AND NOT EXISTS (
    SELECT 1 FROM public.attempts a 
    WHERE a.test_id = t.id 
    AND a.user_id = auth.uid()
    AND a.status IN ('submitted', 'auto_submitted', 'active')
  );

-- Create a new view for completed tests (for recent results)
CREATE OR REPLACE VIEW public.vw_completed_tests AS
SELECT 
  t.id,
  t.name,
  t.time_limit_minutes,
  ta.start_at,
  ta.end_at,
  ta.batch_id,
  b.name as batch_name,
  a.id as attempt_id,
  a.score,
  a.max_score,
  a.submitted_at,
  a.status,
  a.user_id
FROM public.tests t
JOIN public.test_assignments ta ON t.id = ta.test_id
JOIN public.batches b ON ta.batch_id = b.id
JOIN public.attempts a ON t.id = a.test_id
WHERE a.user_id = auth.uid()
  AND a.status IN ('submitted', 'auto_submitted')
ORDER BY a.submitted_at DESC;
