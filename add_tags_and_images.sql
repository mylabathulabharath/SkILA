-- Add image support and tags to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add image support to question_test_cases table (for test case images)
ALTER TABLE public.question_test_cases
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for tags for better performance
CREATE INDEX IF NOT EXISTS idx_questions_tags ON public.questions USING GIN (tags);
