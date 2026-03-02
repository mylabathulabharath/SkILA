# Seed Data Instructions

## ✅ Seed Data Script Created

I've created a comprehensive seed data script at:
**`supabase/migrations/20250131000002_seed_mcq_data.sql`**

## 📊 What's Included

The seed data includes:

### 5 Subjects:
1. **Java Programming** - OOP, Collections, Exception Handling
2. **Python Programming** - Data Types, Functions, OOP
3. **Medical Coding** - ICD-10, CPT Codes, Medical Terminology
4. **Taxation** - Income Tax, GST, TDS
5. **Aptitude** - Quantitative, Logical Reasoning, Data Interpretation

### 13 Concepts (across all subjects)

### 10 Sample Questions:
- 3 Java questions (OOP, Collections, Exceptions)
- 3 Python questions (Data Types, Functions, OOP)
- 2 Medical Coding questions
- 2 Taxation questions
- 2 Aptitude questions

Each question has:
- 4 answer options
- 1 correct answer marked
- Difficulty level (Easy/Medium/Hard)
- Marks and negative marks
- Explanations

## 🚀 How to Run

### Option 1: Supabase SQL Editor (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Open the file: `supabase/migrations/20250131000002_seed_mcq_data.sql`
4. Copy ALL the SQL code
5. Paste into SQL Editor
6. Click "Run"
7. You should see: "Success. No rows returned"

### Option 2: Run via CLI (if you set up CLI later)

```bash
npx supabase db push
```

## ⚠️ Important Notes

- The script uses a DO block to automatically find a trainer/admin user
- If no trainer exists, it uses the first user in the system
- All data uses fixed UUIDs, so re-running is safe (won't create duplicates)
- The script handles conflicts properly

## ✅ After Running

1. **Verify Data:**
   - Go to Table Editor
   - Check `mcq_subjects` - should have 5 subjects
   - Check `mcq_concepts` - should have 13 concepts
   - Check `mcq_questions` - should have 10 questions
   - Check `mcq_options` - should have 40 options (10 questions × 4 options)

2. **Test in Application:**
   - Start dev server: `npm run dev`
   - Navigate to `/mcq` as a student
   - You should see the 5 subjects listed
   - Navigate to Trainer Dashboard
   - You should see the questions you can use

## 🎯 Testing Scenarios

### As a Trainer:
1. Go to Trainer Dashboard
2. Click "Create MCQ Question" - verify form works
3. Create a new question to test the form
4. Try Excel Upload to test bulk upload

### As a Student:
1. Navigate to `/mcq`
2. See the 5 subjects
3. Click on a subject (will show concepts - to be implemented)
4. Create a test as trainer and assign to a batch
5. Take the test as student

---

**Ready to test!** Run the seed script and start exploring the MCQ functionality!

