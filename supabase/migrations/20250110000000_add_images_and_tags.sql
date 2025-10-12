-- Add image support and tags to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add image support to question_test_cases table (for test case images)
ALTER TABLE public.question_test_cases
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for tags for better performance
CREATE INDEX IF NOT EXISTS idx_questions_tags ON public.questions USING GIN (tags);

-- Update RLS policies to include new columns
-- The existing policies will automatically include the new columns

-- Create a function to search questions by tags
CREATE OR REPLACE FUNCTION public.search_questions_by_tags(tag_list TEXT[])
RETURNS TABLE (
  id UUID,
  title TEXT,
  problem_statement TEXT,
  difficulty INTEGER,
  supported_languages TEXT[],
  tags TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    q.id,
    q.title,
    q.problem_statement,
    q.difficulty,
    q.supported_languages,
    q.tags,
    q.image_url,
    q.created_at
  FROM public.questions q
  WHERE q.tags && tag_list  -- Overlap operator for array intersection
  ORDER BY q.created_at DESC;
$$;

-- Create a function to get all unique tags
CREATE OR REPLACE FUNCTION public.get_all_tags()
RETURNS TABLE (tag TEXT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT DISTINCT unnest(tags) as tag
  FROM public.questions
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ORDER BY tag;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_questions_by_tags(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_tags() TO authenticated;
