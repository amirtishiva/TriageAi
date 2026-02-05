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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          patient_id: string | null
          triage_case_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          patient_id?: string | null
          triage_case_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          patient_id?: string | null
          triage_case_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_triage_case_id_fkey"
            columns: ["triage_case_id"]
            isOneToOne: false
            referencedRelation: "triage_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_events: {
        Row: {
          created_at: string
          from_role: Database["public"]["Enums"]["app_role"] | null
          from_user: string | null
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["escalation_reason"]
          to_role: Database["public"]["Enums"]["app_role"]
          to_user: string | null
          triage_case_id: string
        }
        Insert: {
          created_at?: string
          from_role?: Database["public"]["Enums"]["app_role"] | null
          from_user?: string | null
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["escalation_reason"]
          to_role: Database["public"]["Enums"]["app_role"]
          to_user?: string | null
          triage_case_id: string
        }
        Update: {
          created_at?: string
          from_role?: Database["public"]["Enums"]["app_role"] | null
          from_user?: string | null
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["escalation_reason"]
          to_role?: Database["public"]["Enums"]["app_role"]
          to_user?: string | null
          triage_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_events_triage_case_id_fkey"
            columns: ["triage_case_id"]
            isOneToOne: false
            referencedRelation: "triage_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[] | null
          arrival_time: string
          chief_complaint: string
          created_at: string
          date_of_birth: string
          fhir_reference: string | null
          first_name: string
          gender: string
          id: string
          is_returning: boolean
          last_name: string
          medical_history: string[] | null
          medications: string[] | null
          mrn: string
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          arrival_time?: string
          chief_complaint: string
          created_at?: string
          date_of_birth: string
          fhir_reference?: string | null
          first_name: string
          gender: string
          id?: string
          is_returning?: boolean
          last_name: string
          medical_history?: string[] | null
          medications?: string[] | null
          mrn: string
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          arrival_time?: string
          chief_complaint?: string
          created_at?: string
          date_of_birth?: string
          fhir_reference?: string | null
          first_name?: string
          gender?: string
          id?: string
          is_returning?: boolean
          last_name?: string
          medical_history?: string[] | null
          medications?: string[] | null
          mrn?: string
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Relationships: []
      }
      routing_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_role: Database["public"]["Enums"]["app_role"]
          assigned_to: string
          created_at: string
          escalation_deadline: string | null
          escalation_level: number
          id: string
          response_time_ms: number | null
          status: string
          triage_case_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_role: Database["public"]["Enums"]["app_role"]
          assigned_to: string
          created_at?: string
          escalation_deadline?: string | null
          escalation_level?: number
          id?: string
          response_time_ms?: number | null
          status?: string
          triage_case_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_role?: Database["public"]["Enums"]["app_role"]
          assigned_to?: string
          created_at?: string
          escalation_deadline?: string | null
          escalation_level?: number
          id?: string
          response_time_ms?: number | null
          status?: string
          triage_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_assignments_triage_case_id_fkey"
            columns: ["triage_case_id"]
            isOneToOne: false
            referencedRelation: "triage_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handoffs: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          notes: string | null
          patient_ids: string[]
          receiver_id: string | null
          sender_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_ids: string[]
          receiver_id?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_ids?: string[]
          receiver_id?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      triage_cases: {
        Row: {
          acknowledged_at: string | null
          ai_comorbidities: string[] | null
          ai_confidence: number | null
          ai_draft_esi: Database["public"]["Enums"]["esi_level"] | null
          ai_extracted_symptoms: string[] | null
          ai_extracted_timeline: string | null
          ai_generated_at: string | null
          ai_influencing_factors: Json | null
          ai_sbar_assessment: string | null
          ai_sbar_background: string | null
          ai_sbar_recommendation: string | null
          ai_sbar_situation: string | null
          assigned_to: string | null
          assigned_zone: string | null
          created_at: string
          escalation_status: Database["public"]["Enums"]["escalation_status"]
          id: string
          is_override: boolean | null
          override_notes: string | null
          override_rationale:
            | Database["public"]["Enums"]["override_rationale"]
            | null
          patient_id: string
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validated_esi: Database["public"]["Enums"]["esi_level"] | null
        }
        Insert: {
          acknowledged_at?: string | null
          ai_comorbidities?: string[] | null
          ai_confidence?: number | null
          ai_draft_esi?: Database["public"]["Enums"]["esi_level"] | null
          ai_extracted_symptoms?: string[] | null
          ai_extracted_timeline?: string | null
          ai_generated_at?: string | null
          ai_influencing_factors?: Json | null
          ai_sbar_assessment?: string | null
          ai_sbar_background?: string | null
          ai_sbar_recommendation?: string | null
          ai_sbar_situation?: string | null
          assigned_to?: string | null
          assigned_zone?: string | null
          created_at?: string
          escalation_status?: Database["public"]["Enums"]["escalation_status"]
          id?: string
          is_override?: boolean | null
          override_notes?: string | null
          override_rationale?:
            | Database["public"]["Enums"]["override_rationale"]
            | null
          patient_id: string
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_esi?: Database["public"]["Enums"]["esi_level"] | null
        }
        Update: {
          acknowledged_at?: string | null
          ai_comorbidities?: string[] | null
          ai_confidence?: number | null
          ai_draft_esi?: Database["public"]["Enums"]["esi_level"] | null
          ai_extracted_symptoms?: string[] | null
          ai_extracted_timeline?: string | null
          ai_generated_at?: string | null
          ai_influencing_factors?: Json | null
          ai_sbar_assessment?: string | null
          ai_sbar_background?: string | null
          ai_sbar_recommendation?: string | null
          ai_sbar_situation?: string | null
          assigned_to?: string | null
          assigned_zone?: string | null
          created_at?: string
          escalation_status?: Database["public"]["Enums"]["escalation_status"]
          id?: string
          is_override?: boolean | null
          override_notes?: string | null
          override_rationale?:
            | Database["public"]["Enums"]["override_rationale"]
            | null
          patient_id?: string
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_esi?: Database["public"]["Enums"]["esi_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          diastolic_bp: number | null
          heart_rate: number | null
          id: string
          oxygen_saturation: number | null
          pain_level: number | null
          patient_id: string
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          systolic_bp: number | null
          temperature: number | null
        }
        Insert: {
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature?: number | null
        }
        Update: {
          diastolic_bp?: number | null
          heart_rate?: number | null
          id?: string
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id?: string
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          systolic_bp?: number | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_zone: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "nurse" | "physician" | "senior_physician" | "charge_nurse"
      audit_action:
        | "case_created"
        | "ai_triage_completed"
        | "triage_validated"
        | "triage_overridden"
        | "case_assigned"
        | "case_acknowledged"
        | "escalation_triggered"
        | "escalation_resolved"
        | "status_changed"
      escalation_reason: "timeout" | "unavailable" | "manual"
      escalation_status:
        | "none"
        | "pending"
        | "level_1"
        | "level_2"
        | "level_3"
        | "resolved"
      esi_level: "1" | "2" | "3" | "4" | "5"
      override_rationale:
        | "clinical_judgment"
        | "additional_findings"
        | "patient_history"
        | "vital_change"
        | "symptom_evolution"
        | "family_concern"
        | "other"
      patient_status:
        | "waiting"
        | "in_triage"
        | "pending_validation"
        | "validated"
        | "assigned"
        | "acknowledged"
        | "in_treatment"
        | "discharged"
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
      app_role: ["nurse", "physician", "senior_physician", "charge_nurse"],
      audit_action: [
        "case_created",
        "ai_triage_completed",
        "triage_validated",
        "triage_overridden",
        "case_assigned",
        "case_acknowledged",
        "escalation_triggered",
        "escalation_resolved",
        "status_changed",
      ],
      escalation_reason: ["timeout", "unavailable", "manual"],
      escalation_status: [
        "none",
        "pending",
        "level_1",
        "level_2",
        "level_3",
        "resolved",
      ],
      esi_level: ["1", "2", "3", "4", "5"],
      override_rationale: [
        "clinical_judgment",
        "additional_findings",
        "patient_history",
        "vital_change",
        "symptom_evolution",
        "family_concern",
        "other",
      ],
      patient_status: [
        "waiting",
        "in_triage",
        "pending_validation",
        "validated",
        "assigned",
        "acknowledged",
        "in_treatment",
        "discharged",
      ],
    },
  },
} as const
