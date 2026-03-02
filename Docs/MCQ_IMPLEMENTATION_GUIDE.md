# MCQ Module Implementation Guide for SkILA

## ✅ Completed Components

### 1. Database Schema (✅ Complete)
**File:** `supabase/migrations/20250131000000_create_mcq_system.sql`

**Tables Created:**
- `mcq_subjects` - Subject domains (Java, Python, Medical Coding, etc.)
- `mcq_concepts` - Concepts under subjects
- `mcq_questions` - MCQ questions with difficulty, marks, negative marking
- `mcq_options` - Answer options for questions (4+ options, single/multi-select ready)
- `mcq_tests` - MCQ test/exam definitions
- `mcq_test_questions` - Questions in tests (with optional marks override)
- `mcq_test_assignments` - Test assignments to batches (with time windows)
- `mcq_attempts` - Student exam attempts
- `mcq_responses` - Individual question responses

**Features:**
- ✅ Complete RLS policies for all tables
- ✅ Indexes for performance
- ✅ Helper functions (score calculation, updated_at triggers)
- ✅ Views for dashboard analytics
- ✅ Enums for difficulty and attempt status
- ✅ Integration with existing batch system

### 2. Student MCQ Dashboard (✅ Complete)
**File:** `src/pages/McqDashboard.tsx`

**Features:**
- Subject listing
- Upcoming tests display
- Quick stats
- Navigation to subjects and tests
- Integration with DashboardHeader

### 3. Routing (✅ Complete)
**File:** `src/App.tsx`

**Routes Added:**
- `/mcq` - MCQ Dashboard
- `/mcq/subject/:subjectId` - Subject detail (placeholder)
- `/mcq/test/:testId` - MCQ Test interface (placeholder)

---

## 📋 Remaining Implementation Tasks

### High Priority

#### 1. MCQ Test/Attempt Interface
**File:** `src/pages/McqTest.tsx` (NEW)

**Requirements:**
- Timer display (countdown)
- Question navigation (one-by-one or all visible)
- Answer selection (radio buttons for single-select)
- Submit test functionality
- Results display with instant feedback
- Auto-submit on time expiry

**Key Functions:**
- Start attempt (create `mcq_attempt`)
- Save responses (store in `mcq_responses`)
- Calculate score (use database function)
- Finalize attempt

#### 2. MCQ Subject/Concept Browser
**File:** `src/pages/McqSubject.tsx` (NEW)

**Requirements:**
- List concepts in subject
- Practice mode (instant feedback)
- Concept-wise question browsing
- Progress tracking per concept

#### 3. Trainer MCQ Management
**Directory:** `src/components/trainer/mcq/`

**Components Needed:**
- `McqSubjectManagement.tsx` - CRUD for subjects
- `McqConceptManagement.tsx` - CRUD for concepts
- `McqQuestionManagement.tsx` - CRUD for questions
- `McqTestCreator.tsx` - Create MCQ tests
- `McqTestAssignments.tsx` - Assign tests to batches
- `McqExcelUpload.tsx` - Bulk upload via Excel

**Integration:** Add to `TrainerDashboard.tsx`

#### 4. Excel Upload Functionality
**File:** `src/components/trainer/mcq/McqExcelUpload.tsx` (NEW)

**Excel Template Format:**
```
| Subject | Concept | Question | Option A | Option B | Option C | Option D | Correct Option | Difficulty | Marks |
```

**Requirements:**
- File upload handler
- Excel parsing (use `xlsx` library - already in dependencies)
- Validation (correct options, duplicates)
- Batch insert
- Error reporting
- Auto-create subjects/concepts if missing

#### 5. Analytics Components
**Directory:** `src/components/mcq/analytics/`

**Components:**
- `McqProgressAnalytics.tsx` - Student progress charts
- `McqConceptMastery.tsx` - Concept-wise performance
- `McqTestAnalytics.tsx` - Test performance metrics (for trainers)

#### 6. Integration with Existing Dashboards

**Student Dashboard (`src/pages/Dashboard.tsx`):**
- Add "MCQ Assessments" quick action
- Show upcoming MCQ tests in UpcomingTests component
- Show MCQ results in RecentResults component

**Trainer Dashboard (`src/pages/TrainerDashboard.tsx`):**
- Add "MCQ Management" section
- Quick actions for MCQ creation
- MCQ test listing

**Admin Dashboard (`src/pages/AdminDashboard.tsx`):**
- Platform-wide MCQ statistics
- Subject popularity
- Question quality metrics

---

## 🔧 Technical Implementation Notes

### Database Functions to Use

1. **Score Calculation:**
```sql
SELECT public.calculate_mcq_attempt_score(attempt_id);
```

2. **Views Available:**
- `vw_mcq_student_progress` - Student MCQ statistics
- `vw_upcoming_mcq_tests` - Upcoming tests for dashboard

### Supabase Edge Functions (Optional)

Consider creating edge functions for:
- `start-mcq-attempt` - Similar to coding exam start-attempt
- `submit-mcq-attempt` - Auto-evaluate and calculate scores

### TypeScript Types

**Note:** Types are auto-generated from database schema using Supabase CLI:
```bash
npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

After running migrations, regenerate types to include MCQ tables.

---

## 🎨 UI/UX Guidelines

### Student Interface
- Clean, exam-focused design
- Keyboard navigation support
- Clear timer display
- Question numbering
- Answer selection (radio buttons)
- Review mode (before submission)
- Results with detailed feedback

### Trainer Interface
- Form-based question creation
- Rich text editor for questions (consider markdown)
- Option management (add/remove/reorder)
- Preview functionality
- Bulk operations
- Analytics dashboards

---

## 📊 Data Flow Examples

### Taking an MCQ Test (Student)

1. Student clicks "Start Test" on dashboard
2. System creates `mcq_attempt` record
3. Loads questions from `mcq_test_questions`
4. For each question:
   - Load question from `mcq_questions`
   - Load options from `mcq_options`
   - Student selects answer
   - Save to `mcq_responses` (can update before submission)
5. On submit:
   - Calculate score using `calculate_mcq_attempt_score()`
   - Update `mcq_attempt` with final score
   - Show results

### Creating MCQ Questions (Trainer)

1. Trainer navigates to MCQ Management
2. Selects/Creates Subject
3. Selects/Creates Concept
4. Fills question form:
   - Question text
   - Difficulty
   - Marks
   - Negative marks (optional)
   - Options (minimum 2, typically 4)
   - Mark correct option(s)
5. Save to `mcq_questions` and `mcq_options`

### Excel Bulk Upload

1. Trainer uploads Excel file
2. Parse file using `xlsx` library
3. Validate each row:
   - Subject exists (create if needed)
   - Concept exists (create if needed)
   - At least one correct option
   - No duplicate questions in same concept
4. Batch insert:
   - Insert questions to `mcq_questions`
   - Insert options to `mcq_options`
5. Return summary with errors

---

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Regenerate TypeScript types
- [ ] Test RLS policies
- [ ] Create MCQ pages/components
- [ ] Integrate with dashboards
- [ ] Test Excel upload
- [ ] Test exam flow end-to-end
- [ ] Add analytics
- [ ] Performance testing
- [ ] Security review

---

## 📝 Next Steps

1. **Implement MCQ Test Interface** (`McqTest.tsx`)
   - This is the core student-facing component
   - Highest priority for MVP

2. **Create Trainer MCQ Management Components**
   - Subject/Concept/Question CRUD
   - Essential for content creation

3. **Excel Upload**
   - Bulk question creation
   - Reduces manual work

4. **Integration**
   - Connect to existing dashboards
   - Unified user experience

5. **Analytics**
   - Progress tracking
   - Performance insights

---

## 🔗 Related Files

- Database Migration: `supabase/migrations/20250131000000_create_mcq_system.sql`
- Student Dashboard: `src/pages/McqDashboard.tsx`
- Routing: `src/App.tsx`
- Types: `src/integrations/supabase/types.ts` (auto-generated)

---

## 📚 Resources

- Existing Exam System: `src/pages/Exam.tsx` (coding exam reference)
- Dashboard Components: `src/components/dashboard/`
- Trainer Components: `src/components/trainer/`
- Excel Library: `xlsx` (already in package.json)

