-- Add tags column to mcq_questions table
ALTER TABLE public.mcq_questions
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tags for better search performance
CREATE INDEX IF NOT EXISTS idx_mcq_questions_tags ON public.mcq_questions USING GIN (tags);

-- Create a function to search MCQ questions by tags
CREATE OR REPLACE FUNCTION public.search_mcq_questions_by_tags(tag_list TEXT[])
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  difficulty public.mcq_difficulty,
  marks INTEGER,
  tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.question_text,
    q.difficulty,
    q.marks,
    q.tags
  FROM public.mcq_questions q
  WHERE q.tags && tag_list  -- Overlap operator for array intersection
  ORDER BY q.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_mcq_questions_by_tags(TEXT[]) TO authenticated;

