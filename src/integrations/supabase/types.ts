export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attempt_mcq_responses: {
        Row: {
          attempt_id: string
          attempt_question_id: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          mcq_question_id: string
          selected_option_ids: string[] | null
        }
        Insert: {
          attempt_id: string
          attempt_question_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          mcq_question_id: string
          selected_option_ids?: string[] | null
        }
        Update: {
          attempt_id?: string
          attempt_question_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          mcq_question_id?: string
          selected_option_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_mcq_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_mcq_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "vw_recent_activity"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "attempt_mcq_responses_attempt_question_id_fkey"
            columns: ["attempt_question_id"]
            isOneToOne: false
            referencedRelation: "attempt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_mcq_responses_mcq_question_id_fkey"
            columns: ["mcq_question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_questions: {
        Row: {
          attempt_id: string
          id: string
          mcq_question_id: string | null
          order_index: number
          points: number
          question_id: string | null
          section_id: string
        }
        Insert: {
          attempt_id: string
          id?: string
          mcq_question_id?: string | null
          order_index?: number
          points?: number
          question_id?: string | null
          section_id: string
        }
        Update: {
          attempt_id?: string
          id?: string
          mcq_question_id?: string | null
          order_index?: number
          points?: number
          question_id?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "vw_recent_activity"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "attempt_questions_mcq_question_id_fkey"
            columns: ["mcq_question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_section_progress: {
        Row: {
          attempt_id: string
          completed_at: string | null
          ends_at: string | null
          id: string
          score: number | null
          section_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempt_id: string
          completed_at?: string | null
          ends_at?: string | null
          id?: string
          score?: number | null
          section_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempt_id?: string
          completed_at?: string | null
          ends_at?: string | null
          id?: string
          score?: number | null
          section_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_section_progress_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_section_progress_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "vw_recent_activity"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "attempt_section_progress_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          candidate_id: string | null
          current_section_id: string | null
          ends_at: string | null
          id: string
          max_score: number | null
          meta: Json | null
          score: number | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          test_id: string | null
          user_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          current_section_id?: string | null
          ends_at?: string | null
          id?: string
          max_score?: number | null
          meta?: Json | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          test_id?: string | null
          user_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          current_section_id?: string | null
          ends_at?: string | null
          id?: string
          max_score?: number | null
          meta?: Json | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          test_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "exam_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_current_section_id_fkey"
            columns: ["current_section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      batch_members: {
        Row: {
          batch_id: string
          role_in_batch: string
          user_id: string
        }
        Insert: {
          batch_id: string
          role_in_batch: string
          user_id: string
        }
        Update: {
          batch_id?: string
          role_in_batch?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_members_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "batch_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_candidates: {
        Row: {
          branch: string | null
          college: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          roll_number: string | null
          test_id: string
        }
        Insert: {
          branch?: string | null
          college?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          roll_number?: string | null
          test_id: string
        }
        Update: {
          branch?: string | null
          college?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          roll_number?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_candidates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_candidates_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sections: {
        Row: {
          created_at: string | null
          id: string
          order_index: number
          pass_cutoff_percent: number | null
          section_type: string
          test_id: string
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number
          pass_cutoff_percent?: number | null
          section_type: string
          test_id: string
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number
          pass_cutoff_percent?: number | null
          section_type?: string
          test_id?: string
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_attempts: {
        Row: {
          correct_answers: number | null
          created_at: string | null
          ends_at: string | null
          id: string
          incorrect_answers: number | null
          last_question_index: number | null
          local_state: Json | null
          max_score: number | null
          meta: Json | null
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["mcq_attempt_status"] | null
          submitted_at: string | null
          test_id: string | null
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          incorrect_answers?: number | null
          last_question_index?: number | null
          local_state?: Json | null
          max_score?: number | null
          meta?: Json | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mcq_attempt_status"] | null
          submitted_at?: string | null
          test_id?: string | null
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          correct_answers?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          incorrect_answers?: number | null
          last_question_index?: number | null
          local_state?: Json | null
          max_score?: number | null
          meta?: Json | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mcq_attempt_status"] | null
          submitted_at?: string | null
          test_id?: string | null
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mcq_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_mcq_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mcq_concepts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "mcq_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          option_text: string
          order_index: number | null
          question_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_text: string
          order_index?: number | null
          question_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_text?: string
          order_index?: number | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_questions: {
        Row: {
          concept_id: string | null
          created_at: string | null
          created_by: string | null
          difficulty: Database["public"]["Enums"]["mcq_difficulty"] | null
          explanation: string | null
          id: string
          marks: number | null
          negative_marks: number | null
          question_text: string
          subject_id: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          explanation?: string | null
          id?: string
          marks?: number | null
          negative_marks?: number | null
          question_text: string
          subject_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["mcq_difficulty"] | null
          explanation?: string | null
          id?: string
          marks?: number | null
          negative_marks?: number | null
          question_text?: string
          subject_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "mcq_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "mcq_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_responses: {
        Row: {
          attempt_id: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string | null
          selected_option_ids: string[] | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string | null
          selected_option_ids?: string[] | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string | null
          selected_option_ids?: string[] | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mcq_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_subjects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mcq_test_assignments: {
        Row: {
          batch_id: string
          end_at: string | null
          start_at: string | null
          test_id: string
        }
        Insert: {
          batch_id: string
          end_at?: string | null
          start_at?: string | null
          test_id: string
        }
        Update: {
          batch_id?: string
          end_at?: string | null
          start_at?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_test_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mcq_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_mcq_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_test_questions: {
        Row: {
          marks_override: number | null
          order_index: number | null
          question_id: string
          test_id: string
        }
        Insert: {
          marks_override?: number | null
          order_index?: number | null
          question_id: string
          test_id: string
        }
        Update: {
          marks_override?: number | null
          order_index?: number | null
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mcq_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_mcq_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_public: boolean | null
          sharing_token: string | null
          subject_id: string | null
          title: string
          total_marks: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_public?: boolean | null
          sharing_token?: string | null
          subject_id?: string | null
          title: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean | null
          sharing_token?: string | null
          subject_id?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcq_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mcq_tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "mcq_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      question_test_cases: {
        Row: {
          expected_output: string
          id: string
          input: string
          is_public: boolean | null
          order_index: number | null
          question_id: string | null
        }
        Insert: {
          expected_output: string
          id?: string
          input: string
          is_public?: boolean | null
          order_index?: number | null
          question_id?: string | null
        }
        Update: {
          expected_output?: string
          id?: string
          input?: string
          is_public?: boolean | null
          order_index?: number | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_test_cases_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          created_by: string | null
          difficulty: number | null
          id: string
          image_url: string | null
          problem_statement: string
          supported_languages: string[] | null
          tags: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          id?: string
          image_url?: string | null
          problem_statement: string
          supported_languages?: string[] | null
          tags?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          id?: string
          image_url?: string | null
          problem_statement?: string
          supported_languages?: string[] | null
          tags?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      section_draw_rules: {
        Row: {
          difficulty_bucket: string
          draw_count: number
          id: string
          section_id: string
        }
        Insert: {
          difficulty_bucket: string
          draw_count?: number
          id?: string
          section_id: string
        }
        Update: {
          difficulty_bucket?: string
          draw_count?: number
          id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_draw_rules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      section_pool_items: {
        Row: {
          difficulty_bucket: string
          id: string
          mcq_question_id: string | null
          points: number
          question_id: string | null
          section_id: string
        }
        Insert: {
          difficulty_bucket: string
          id?: string
          mcq_question_id?: string | null
          points?: number
          question_id?: string | null
          section_id: string
        }
        Update: {
          difficulty_bucket?: string
          id?: string
          mcq_question_id?: string | null
          points?: number
          question_id?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_pool_items_mcq_question_id_fkey"
            columns: ["mcq_question_id"]
            isOneToOne: false
            referencedRelation: "mcq_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_pool_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_pool_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      submission_case_results: {
        Row: {
          actual_output: string | null
          case_order: number | null
          expected_output: string | null
          id: string
          input: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          actual_output?: string | null
          case_order?: number | null
          expected_output?: string | null
          id?: string
          input?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          actual_output?: string | null
          case_order?: number | null
          expected_output?: string | null
          id?: string
          input?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_case_results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          attempt_id: string | null
          attempt_question_id: string | null
          code: string
          created_at: string | null
          id: string
          language: string
          memory_kb: number | null
          passed_count: number | null
          question_id: string | null
          run_type: string
          stderr: string | null
          stdout_preview: string | null
          time_ms: number | null
          total_count: number | null
          verdict: string | null
        }
        Insert: {
          attempt_id?: string | null
          attempt_question_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          language: string
          memory_kb?: number | null
          passed_count?: number | null
          question_id?: string | null
          run_type: string
          stderr?: string | null
          stdout_preview?: string | null
          time_ms?: number | null
          total_count?: number | null
          verdict?: string | null
        }
        Update: {
          attempt_id?: string | null
          attempt_question_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          language?: string
          memory_kb?: number | null
          passed_count?: number | null
          question_id?: string | null
          run_type?: string
          stderr?: string | null
          stdout_preview?: string | null
          time_ms?: number | null
          total_count?: number | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "vw_recent_activity"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "submissions_attempt_question_id_fkey"
            columns: ["attempt_question_id"]
            isOneToOne: false
            referencedRelation: "attempt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_assignments: {
        Row: {
          batch_id: string
          end_at: string | null
          start_at: string | null
          test_id: string
        }
        Insert: {
          batch_id: string
          end_at?: string | null
          start_at?: string | null
          test_id: string
        }
        Update: {
          batch_id?: string
          end_at?: string | null
          start_at?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          order_index: number | null
          points: number | null
          question_id: string
          test_id: string
        }
        Insert: {
          order_index?: number | null
          points?: number | null
          question_id: string
          test_id: string
        }
        Update: {
          order_index?: number | null
          points?: number | null
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "vw_upcoming_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_public: boolean | null
          is_sectioned: boolean
          name: string
          navigation_mode: string | null
          overall_time_limit_minutes: number | null
          sharing_token: string | null
          time_limit_minutes: number
          timing_mode: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          is_sectioned?: boolean
          name: string
          navigation_mode?: string | null
          overall_time_limit_minutes?: number | null
          sharing_token?: string | null
          time_limit_minutes: number
          timing_mode?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          is_sectioned?: boolean
          name?: string
          navigation_mode?: string | null
          overall_time_limit_minutes?: number | null
          sharing_token?: string | null
          time_limit_minutes?: number
          timing_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          subject_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          subject_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_mcq_student_progress: {
        Row: {
          average_score_percent: number | null
          full_name: string | null
          last_test_date: string | null
          total_correct_answers: number | null
          total_mcq_tests_taken: number | null
          total_questions_attempted: number | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_recent_activity: {
        Row: {
          attempt_id: string | null
          max_score: number | null
          score: number | null
          status: string | null
          submitted_at: string | null
          test_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mcq_student_progress"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_student_progress: {
        Row: {
          activity_streak: number | null
          average_score_percent: number | null
          full_name: string | null
          last_test_date: string | null
          total_tests_taken: number | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_upcoming_mcq_tests: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          duration_minutes: number | null
          end_at: string | null
          id: string | null
          start_at: string | null
          subject_name: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcq_test_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_upcoming_tests: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          end_at: string | null
          id: string | null
          name: string | null
          start_at: string | null
          time_limit_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_mcq_attempt_score: {
        Args: { attempt_uuid: string }
        Returns: number
      }
      get_random_mcq_questions: {
        Args: { question_count?: number; topic_id_param: string }
        Returns: {
          difficulty: number
          explanation: string
          image_url: string
          options: Json
          points: number
          question_id: string
          question_text: string
        }[]
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      search_mcq_questions_by_tags: {
        Args: { tag_list: string[] }
        Returns: {
          difficulty: Database["public"]["Enums"]["mcq_difficulty"]
          id: string
          marks: number
          question_text: string
          tags: string[]
        }[]
      }
      user_in_batch: {
        Args: { batch_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "trainer" | "admin"
      mcq_attempt_status:
        | "active"
        | "submitted"
        | "auto_submitted"
        | "expired"
        | "cancelled"
      mcq_difficulty: "Easy" | "Medium" | "Hard"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "trainer", "admin"],
      mcq_attempt_status: [
        "active",
        "submitted",
        "auto_submitted",
        "expired",
        "cancelled",
      ],
      mcq_difficulty: ["Easy", "Medium", "Hard"],
    },
  },
} as const
