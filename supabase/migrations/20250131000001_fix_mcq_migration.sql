-- Fix script for MCQ migration
-- Run this if you got the "column subject_id does not exist" error
-- This will check and fix any issues from partial migration

-- First, drop any partially created views or policies that might be causing issues
DROP VIEW IF EXISTS public.vw_upcoming_mcq_tests;
DROP VIEW IF EXISTS public.vw_mcq_student_progress;

-- Drop any partially created policies
DROP POLICY IF EXISTS "Everyone can view concepts of active subjects" ON public.mcq_concepts;
DROP POLICY IF EXISTS "Trainers and admins can manage concepts" ON public.mcq_concepts;
DROP POLICY IF EXISTS "Students can view questions in assigned tests" ON public.mcq_questions;
DROP POLICY IF EXISTS "Trainers and admins can manage questions" ON public.mcq_questions;
DROP POLICY IF EXISTS "Students can view options for accessible questions" ON public.mcq_options;
DROP POLICY IF EXISTS "Trainers and admins can manage options" ON public.mcq_options;
DROP POLICY IF EXISTS "Students can view tests assigned to their batches" ON public.mcq_tests;
DROP POLICY IF EXISTS "Trainers and admins can manage tests" ON public.mcq_tests;
DROP POLICY IF EXISTS "Students can view test questions for assigned tests" ON public.mcq_test_questions;
DROP POLICY IF EXISTS "Trainers and admins can manage test questions" ON public.mcq_test_questions;
DROP POLICY IF EXISTS "Students can view assignments for their batches" ON public.mcq_test_assignments;
DROP POLICY IF EXISTS "Trainers and admins can manage test assignments" ON public.mcq_test_assignments;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.mcq_attempts;
DROP POLICY IF EXISTS "Users can create own attempts" ON public.mcq_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON public.mcq_attempts;
DROP POLICY IF EXISTS "Trainers can view attempts for their tests" ON public.mcq_attempts;
DROP POLICY IF EXISTS "Users can view own responses" ON public.mcq_responses;
DROP POLICY IF EXISTS "Users can create own responses" ON public.mcq_responses;
DROP POLICY IF EXISTS "Users can update own responses" ON public.mcq_responses;
DROP POLICY IF EXISTS "Trainers can view responses for their tests" ON public.mcq_responses;
DROP POLICY IF EXISTS "Everyone can view active subjects" ON public.mcq_subjects;
DROP POLICY IF EXISTS "Trainers and admins can manage subjects" ON public.mcq_subjects;

-- Now check if mcq_tests table exists and has subject_id column
-- If table exists but column doesn't, add it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mcq_tests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mcq_tests' AND column_name = 'subject_id') THEN
            ALTER TABLE public.mcq_tests ADD COLUMN subject_id UUID REFERENCES public.mcq_subjects(id);
        END IF;
    END IF;
END $$;

