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
      attempts: {
        Row: {
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
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
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
          problem_statement: string
          supported_languages: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          id?: string
          problem_statement: string
          supported_languages?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          id?: string
          problem_statement?: string
          supported_languages?: string[] | null
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
          name: string
          time_limit_minutes: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          time_limit_minutes: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          time_limit_minutes?: number
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
            referencedRelation: "vw_student_progress"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
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
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      user_in_batch: {
        Args: { batch_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "trainer" | "admin"
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
    },
  },
} as const
