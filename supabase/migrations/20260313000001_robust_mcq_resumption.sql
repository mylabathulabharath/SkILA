-- Add robustness columns to mcq_attempts
ALTER TABLE public.mcq_attempts ADD COLUMN IF NOT EXISTS last_question_index INTEGER DEFAULT 0;
ALTER TABLE public.mcq_attempts ADD COLUMN IF NOT EXISTS local_state JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.mcq_attempts.last_question_index IS 'Stores the last question index the user was viewing to allow resumption';
COMMENT ON COLUMN public.mcq_attempts.local_state IS 'Stores any local transient state like flagged questions or time markers';
