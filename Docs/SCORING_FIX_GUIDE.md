# Exam Scoring System Fix Guide

## Problem Description
The exam scoring system was not properly calculating and storing scores in the database. After submitting an exam, the score was showing as 0 in the database, regardless of how many test cases were passed.

## Root Causes Identified

### 1. **Incorrect Scoring Logic**
- **Original Issue**: The system only gave full points if ALL test cases passed
- **Fixed**: Now calculates partial credit based on percentage of test cases passed

### 2. **Function Call Mismatch**
- **Original Issue**: In `Exam.tsx`, the `handleRunCode` function had a mismatch between the logged payload and actual function call
- **Fixed**: Corrected the `run_type` parameter consistency

### 3. **Score Update Logic**
- **Original Issue**: Score was only updated for the first passing submission
- **Fixed**: Now properly tracks the best score for each question across multiple submissions

## Changes Made

### 1. Fixed `supabase/functions/run-code/index.ts`
```typescript
// OLD: Only full points if all test cases passed
const questionScore = verdict === 'passed' ? questionPoints : 0;

// NEW: Partial points based on test cases passed
const scorePercentage = testCases.length > 0 ? passedCount / testCases.length : 0;
const questionScore = Math.round(questionPoints * scorePercentage);
```

### 2. Fixed `supabase/functions/finalize-attempt/index.ts`
```typescript
// OLD: Only considered passed/failed verdict
const isPassed = submission.verdict === 'passed';

// NEW: Calculates score based on actual test case results
const passedCount = submission.passed_count || 0;
const totalCount = submission.total_count || 1;
const scorePercentage = totalCount > 0 ? passedCount / totalCount : 0;
const questionScore = Math.round(points * scorePercentage);
```

### 3. Fixed `src/pages/Exam.tsx`
- Corrected the `run_type` parameter mismatch in `handleRunCode` function
- Improved error handling and logging

## Testing Steps

### Step 1: Deploy Updated Functions
```bash
# If you have Supabase CLI installed:
supabase functions deploy run-code
supabase functions deploy finalize-attempt
```

### Step 2: Add Test Cases
Run the `add-test-cases.js` script to ensure questions have test cases:
```bash
node add-test-cases.js
```

### Step 3: Test the Scoring System
Run the debug script to check the current state:
```bash
node debug-scoring-issue.js
```

### Step 4: Test Function Directly
Run the direct function test:
```bash
node test-function-direct.js
```

### Step 5: Fix Existing Scores (if needed)
If there are existing attempts with incorrect scores:
```bash
node fix-existing-scores.js
```

## Expected Behavior After Fix

### Partial Credit System
- **Example**: If a question is worth 100 points and has 5 test cases
- **Scenario**: Student passes 3 out of 5 test cases
- **Result**: Student gets 60 points (3/5 * 100)

### Best Score Tracking
- **Multiple Submissions**: If a student submits multiple times for the same question
- **Result**: Only the best score is kept and used in final calculation

### Accurate Final Score
- **Calculation**: Sum of best scores from all questions
- **Storage**: Correctly stored in database and displayed in dashboard

## Debugging Tools Created

### 1. `debug-scoring-issue.js`
- Comprehensive analysis of database state
- Checks attempts, submissions, test cases, and test_questions
- Verifies score calculations

### 2. `test-function-direct.js`
- Direct function testing
- Authenticates and calls the run-code function
- Verifies score updates

### 3. `fix-existing-scores.js`
- Recalculates scores for existing attempts
- Updates database with correct scores

### 4. `add-test-cases.js`
- Adds test cases to questions
- Ensures proper test coverage

## Common Issues and Solutions

### Issue: Score Still Shows 0
**Possible Causes:**
1. Functions not deployed
2. No test cases for questions
3. Authentication issues
4. Database permissions

**Solutions:**
1. Deploy functions using Supabase CLI
2. Run `add-test-cases.js` to add test cases
3. Check authentication in browser console
4. Verify RLS policies

### Issue: Function Returns Error
**Possible Causes:**
1. Missing environment variables
2. Invalid request payload
3. Judge0 API issues

**Solutions:**
1. Check function logs in Supabase dashboard
2. Verify request payload format
3. Check Judge0 API configuration

### Issue: Partial Scores Not Calculating
**Possible Causes:**
1. Test cases not properly configured
2. Function logic not updated

**Solutions:**
1. Verify test cases have correct input/output
2. Ensure functions are deployed with latest code

## Verification Checklist

- [ ] Functions deployed successfully
- [ ] Test cases added to questions
- [ ] Authentication working
- [ ] Function calls returning success
- [ ] Scores updating in database
- [ ] Dashboard displaying correct scores
- [ ] Partial credit working
- [ ] Best score tracking working

## Support

If issues persist after following this guide:
1. Run the debug scripts to identify the specific problem
2. Check Supabase function logs
3. Verify database schema and RLS policies
4. Test with a simple question and known test cases
