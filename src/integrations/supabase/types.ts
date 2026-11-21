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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          path: string
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          path: string
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          path?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          channel: string
          contacted_at: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          decision: string | null
          difficulty: string | null
          id: string
          next_action: string | null
          report: string | null
          result: string
          return_date: string | null
          student_id: string
        }
        Insert: {
          channel: string
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          decision?: string | null
          difficulty?: string | null
          id?: string
          next_action?: string | null
          report?: string | null
          result: string
          return_date?: string | null
          student_id: string
        }
        Update: {
          channel?: string
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          decision?: string | null
          difficulty?: string | null
          id?: string
          next_action?: string | null
          report?: string | null
          result?: string
          return_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          created_at: string
          created_by: string | null
          difficulties: string | null
          exam_date: string
          id: string
          next_step: string | null
          result: string
          score: number | null
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulties?: string | null
          exam_date: string
          id?: string
          next_step?: string | null
          result: string
          score?: number | null
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulties?: string | null
          exam_date?: string
          id?: string
          next_step?: string | null
          result?: string
          score?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lesson_date: string
          notes: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_date: string
          notes?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_date?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          correct: number
          created_at: string
          created_by: string | null
          id: string
          student_id: string
          subjects: string | null
          test_date: string
          total: number
        }
        Insert: {
          correct: number
          created_at?: string
          created_by?: string | null
          id?: string
          student_id: string
          subjects?: string | null
          test_date: string
          total: number
        }
        Update: {
          correct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          student_id?: string
          subjects?: string | null
          test_date?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          attempts_count: number | null
          cpf: string | null
          created_at: string
          created_by: string | null
          direction_referral: string | null
          enrollment_date: string | null
          exam_date: string | null
          followup_status: string
          full_name: string
          id: string
          last_contact_at: string | null
          last_contact_summary: string | null
          lessons_included: number | null
          main_difficulty: string | null
          next_action: string | null
          next_return_date: string | null
          notes: string | null
          phone: string | null
          platform_access: string
          prep_type: string | null
          responsible_id: string | null
          resumed_at: string | null
          study_activity: string | null
          study_activity_due: string | null
          study_status: string
          teacher_guidance: string | null
          theory_status: string
          unit_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attempts_count?: number | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          direction_referral?: string | null
          enrollment_date?: string | null
          exam_date?: string | null
          followup_status?: string
          full_name: string
          id?: string
          last_contact_at?: string | null
          last_contact_summary?: string | null
          lessons_included?: number | null
          main_difficulty?: string | null
          next_action?: string | null
          next_return_date?: string | null
          notes?: string | null
          phone?: string | null
          platform_access?: string
          prep_type?: string | null
          responsible_id?: string | null
          resumed_at?: string | null
          study_activity?: string | null
          study_activity_due?: string | null
          study_status?: string
          teacher_guidance?: string | null
          theory_status?: string
          unit_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attempts_count?: number | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          direction_referral?: string | null
          enrollment_date?: string | null
          exam_date?: string | null
          followup_status?: string
          full_name?: string
          id?: string
          last_contact_at?: string | null
          last_contact_summary?: string | null
          lessons_included?: number | null
          main_difficulty?: string | null
          next_action?: string | null
          next_return_date?: string | null
          notes?: string | null
          phone?: string | null
          platform_access?: string
          prep_type?: string | null
          responsible_id?: string | null
          resumed_at?: string | null
          study_activity?: string | null
          study_activity_due?: string | null
          study_status?: string
          teacher_guidance?: string | null
          theory_status?: string
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          id: string
          name: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_units: {
        Row: {
          unit_id: string
          user_id: string
        }
        Insert: {
          unit_id: string
          user_id: string
        }
        Update: {
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_student: {
        Args: { _student: string; _user_id: string }
        Returns: boolean
      }
      can_access_unit: {
        Args: { _unit: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "atendimento"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["gestor", "atendimento"],
    },
  },
} as const
