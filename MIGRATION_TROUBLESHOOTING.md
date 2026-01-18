# MCQ Migration Troubleshooting

## Error: "column subject_id does not exist"

This error usually means the migration ran partially. Here's how to fix it:

## Step 1: Check What Was Created

Run this SQL in Supabase SQL Editor to see what tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'mcq_%'
ORDER BY table_name;
```

## Step 2: Check if mcq_tests table has subject_id column

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'mcq_tests';
```

## Step 3: Clean Up and Re-run

### Option A: Drop All MCQ Tables (if they exist) and Re-run

Run this to clean up (WARNING: This will delete any MCQ data):

```sql
-- Drop views first
DROP VIEW IF EXISTS public.vw_upcoming_mcq_tests;
DROP VIEW IF EXISTS public.vw_mcq_student_progress;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.mcq_responses CASCADE;
DROP TABLE IF EXISTS public.mcq_attempts CASCADE;
DROP TABLE IF EXISTS public.mcq_test_assignments CASCADE;
DROP TABLE IF EXISTS public.mcq_test_questions CASCADE;
DROP TABLE IF EXISTS public.mcq_tests CASCADE;
DROP TABLE IF EXISTS public.mcq_options CASCADE;
DROP TABLE IF EXISTS public.mcq_questions CASCADE;
DROP TABLE IF EXISTS public.mcq_concepts CASCADE;
DROP TABLE IF EXISTS public.mcq_subjects CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.calculate_mcq_attempt_score(UUID);
DROP FUNCTION IF EXISTS public.update_mcq_updated_at();

-- Drop types (only if no other tables use them)
-- DROP TYPE IF EXISTS public.mcq_attempt_status;
-- DROP TYPE IF EXISTS public.mcq_difficulty;
```

Then re-run the full migration from `20250131000000_create_mcq_system.sql`

### Option B: Fix Just the Missing Column

If only `mcq_tests` is missing the `subject_id` column, run:

```sql
ALTER TABLE public.mcq_tests 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.mcq_subjects(id);
```

Then continue from where the migration failed (likely the views section).

## Recommended Approach

**I recommend Option A** (drop and re-run) because:
1. It ensures a clean state
2. You haven't added any MCQ data yet
3. It's cleaner than trying to fix partial migrations

## After Clean Re-run

Once the migration completes successfully:
1. Verify all tables exist (9 MCQ tables)
2. Check Table Editor to see the tables
3. Regenerate TypeScript types
4. Test the system

