# How to Apply MCQ Migration

## Option 1: Supabase Dashboard (Recommended - Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `supabase/migrations/20250131000000_create_mcq_system.sql`
6. Copy **ALL** the SQL code from the file
7. Paste it into the SQL Editor
8. Click **Run** (or press Ctrl+Enter)
9. Wait for execution to complete
10. Check for any errors (should complete successfully)

## Option 2: Using Supabase CLI (If Linked)

If your project is linked to Supabase CLI:

```powershell
# Check if linked
npx supabase status

# If not linked, link it first
npx supabase link --project-ref <your-project-ref>

# Then push migration
npx supabase db push
```

## Option 3: Manual Application

You can also run the migration through:
- Supabase Studio (Database > SQL Editor)
- Any PostgreSQL client connected to your database
- psql command line tool

## After Migration

Once the migration is applied:

1. **Regenerate TypeScript Types:**
   ```powershell
   npx supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
   ```
   
   Or if linked:
   ```powershell
   npx supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

2. **Verify Tables:**
   - Go to Supabase Dashboard > Table Editor
   - You should see the new MCQ tables:
     - mcq_subjects
     - mcq_concepts
     - mcq_questions
     - mcq_options
     - mcq_tests
     - mcq_test_questions
     - mcq_test_assignments
     - mcq_attempts
     - mcq_responses

3. **Test the System:**
   - Start your dev server: `npm run dev`
   - Navigate to `/mcq` to see the MCQ dashboard
   - Test creating questions as a trainer
   - Test taking a test as a student

## Troubleshooting

- **If migration fails:** Check the error message in the SQL Editor
- **If tables don't appear:** Refresh the Table Editor
- **If RLS errors:** The migration includes all RLS policies, make sure the entire file was executed
- **If types don't update:** Make sure you have the correct project ID/ref

