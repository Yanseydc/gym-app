export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string;
          email: string | null;
          first_name: string;
          gym_id: string | null;
          id: string;
          last_name: string;
          notes: string | null;
          phone: string;
          status: "active" | "inactive";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          first_name: string;
          gym_id?: string | null;
          id?: string;
          last_name: string;
          notes?: string | null;
          phone: string;
          status?: "active" | "inactive";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          first_name?: string;
          gym_id?: string | null;
          id?: string;
          last_name?: string;
          notes?: string | null;
          phone?: string;
          status?: "active" | "inactive";
          updated_at?: string;
        };
        Relationships: [];
      };
      client_checkin_photos: {
        Row: {
          client_checkin_id: string;
          created_at: string;
          id: string;
          photo_type: "front" | "side" | "back";
          storage_path: string;
        };
        Insert: {
          client_checkin_id: string;
          created_at?: string;
          id?: string;
          photo_type: "front" | "side" | "back";
          storage_path: string;
        };
        Update: {
          client_checkin_id?: string;
          created_at?: string;
          id?: string;
          photo_type?: "front" | "side" | "back";
          storage_path?: string;
        };
        Relationships: [];
      };
      client_checkins: {
        Row: {
          checkin_date: string;
          client_id: string;
          client_notes: string | null;
          coach_notes: string | null;
          created_at: string;
          gym_id: string | null;
          id: string;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          checkin_date?: string;
          client_id: string;
          client_notes?: string | null;
          coach_notes?: string | null;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          checkin_date?: string;
          client_id?: string;
          client_notes?: string | null;
          coach_notes?: string | null;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      client_memberships: {
        Row: {
          client_id: string;
          created_at: string;
          end_date: string;
          gym_id: string | null;
          id: string;
          membership_plan_id: string;
          notes: string | null;
          renewed_from_membership_id: string | null;
          start_date: string;
          status: "active" | "expired" | "cancelled" | "pending_payment" | "partial";
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          end_date: string;
          gym_id?: string | null;
          id?: string;
          membership_plan_id: string;
          notes?: string | null;
          renewed_from_membership_id?: string | null;
          start_date: string;
          status?: "active" | "expired" | "cancelled" | "pending_payment" | "partial";
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          end_date?: string;
          gym_id?: string | null;
          id?: string;
          membership_plan_id?: string;
          notes?: string | null;
          renewed_from_membership_id?: string | null;
          start_date?: string;
          status?: "active" | "expired" | "cancelled" | "pending_payment" | "partial";
          updated_at?: string;
        };
        Relationships: [];
      };
      client_onboarding_responses: {
        Row: {
          available_days: number;
          available_schedule: string;
          client_id: string;
          created_at: string;
          experience_level: "beginner" | "intermediate" | "advanced";
          goal: string;
          height_cm: number;
          id: string;
          injuries_notes: string | null;
          notes: string | null;
          updated_at: string;
          weight_kg: number;
        };
        Insert: {
          available_days: number;
          available_schedule: string;
          client_id: string;
          created_at?: string;
          experience_level: "beginner" | "intermediate" | "advanced";
          goal: string;
          height_cm: number;
          id?: string;
          injuries_notes?: string | null;
          notes?: string | null;
          updated_at?: string;
          weight_kg: number;
        };
        Update: {
          available_days?: number;
          available_schedule?: string;
          client_id?: string;
          created_at?: string;
          experience_level?: "beginner" | "intermediate" | "advanced";
          goal?: string;
          height_cm?: number;
          id?: string;
          injuries_notes?: string | null;
          notes?: string | null;
          updated_at?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      client_routine_days: {
        Row: {
          client_routine_id: string;
          created_at: string;
          day_index: number;
          id: string;
          notes: string | null;
          title: string;
        };
        Insert: {
          client_routine_id: string;
          created_at?: string;
          day_index: number;
          id?: string;
          notes?: string | null;
          title: string;
        };
        Update: {
          client_routine_id?: string;
          created_at?: string;
          day_index?: number;
          id?: string;
          notes?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      client_routine_exercises: {
        Row: {
          client_routine_day_id: string;
          created_at: string;
          exercise_id: string;
          id: string;
          notes: string | null;
          reps_text: string;
          rest_seconds: number | null;
          sets_text: string;
          sort_order: number;
          target_weight_text: string | null;
        };
        Insert: {
          client_routine_day_id: string;
          created_at?: string;
          exercise_id: string;
          id?: string;
          notes?: string | null;
          reps_text: string;
          rest_seconds?: number | null;
          sets_text: string;
          sort_order?: number;
          target_weight_text?: string | null;
        };
        Update: {
          client_routine_day_id?: string;
          created_at?: string;
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          reps_text?: string;
          rest_seconds?: number | null;
          sets_text?: string;
          sort_order?: number;
          target_weight_text?: string | null;
        };
        Relationships: [];
      };
      client_routine_session_exercises: {
        Row: {
          client_notes: string | null;
          client_routine_session_id: string;
          created_at: string;
          exercise_id: string | null;
          exercise_name: string;
          id: string;
          prescribed_notes: string | null;
          prescribed_reps_text: string | null;
          prescribed_rest_seconds: number | null;
          prescribed_sets_text: string | null;
          prescribed_weight_text: string | null;
          sort_order: number;
          version: number;
        };
        Insert: {
          client_notes?: string | null;
          client_routine_session_id: string;
          created_at?: string;
          exercise_id?: string | null;
          exercise_name: string;
          id?: string;
          prescribed_notes?: string | null;
          prescribed_reps_text?: string | null;
          prescribed_rest_seconds?: number | null;
          prescribed_sets_text?: string | null;
          prescribed_weight_text?: string | null;
          sort_order: number;
          version?: number;
        };
        Update: {
          client_notes?: string | null;
          client_routine_session_id?: string;
          created_at?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          id?: string;
          prescribed_notes?: string | null;
          prescribed_reps_text?: string | null;
          prescribed_rest_seconds?: number | null;
          prescribed_sets_text?: string | null;
          prescribed_weight_text?: string | null;
          sort_order?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "client_routine_session_exercises_client_routine_session_id_fkey";
            columns: ["client_routine_session_id"];
            isOneToOne: false;
            referencedRelation: "client_routine_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_routine_session_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercise_library";
            referencedColumns: ["id"];
          },
        ];
      };
      client_routine_session_sets: {
        Row: {
          client_routine_session_exercise_id: string;
          completed: boolean;
          created_at: string;
          id: string;
          notes: string | null;
          reps: number | null;
          set_index: number;
          updated_at: string;
          version: number;
          weight: number | null;
        };
        Insert: {
          client_routine_session_exercise_id: string;
          completed?: boolean;
          created_at?: string;
          id?: string;
          notes?: string | null;
          reps?: number | null;
          set_index: number;
          updated_at?: string;
          version?: number;
          weight?: number | null;
        };
        Update: {
          client_routine_session_exercise_id?: string;
          completed?: boolean;
          created_at?: string;
          id?: string;
          notes?: string | null;
          reps?: number | null;
          set_index?: number;
          updated_at?: string;
          version?: number;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_routine_session_sets_client_routine_session_exercis_fkey";
            columns: ["client_routine_session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "client_routine_session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      client_routine_sessions: {
        Row: {
          abandoned_at: string | null;
          client_id: string;
          client_notes: string | null;
          client_routine_day_id: string | null;
          client_routine_id: string | null;
          completed_at: string | null;
          completed_sets_count: number | null;
          created_at: string;
          day_index: number;
          day_notes: string | null;
          day_title: string;
          gym_id: string;
          id: string;
          idempotency_key: string;
          routine_title: string;
          started_at: string;
          status: string;
          total_sets_count: number | null;
          updated_at: string;
        };
        Insert: {
          abandoned_at?: string | null;
          client_id: string;
          client_notes?: string | null;
          client_routine_day_id?: string | null;
          client_routine_id?: string | null;
          completed_at?: string | null;
          completed_sets_count?: number | null;
          created_at?: string;
          day_index: number;
          day_notes?: string | null;
          day_title: string;
          gym_id: string;
          id?: string;
          idempotency_key: string;
          routine_title: string;
          started_at?: string;
          status?: string;
          total_sets_count?: number | null;
          updated_at?: string;
        };
        Update: {
          abandoned_at?: string | null;
          client_id?: string;
          client_notes?: string | null;
          client_routine_day_id?: string | null;
          client_routine_id?: string | null;
          completed_at?: string | null;
          completed_sets_count?: number | null;
          created_at?: string;
          day_index?: number;
          day_notes?: string | null;
          day_title?: string;
          gym_id?: string;
          id?: string;
          idempotency_key?: string;
          routine_title?: string;
          started_at?: string;
          status?: string;
          total_sets_count?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_routine_sessions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_routine_sessions_client_routine_day_id_fkey";
            columns: ["client_routine_day_id"];
            isOneToOne: false;
            referencedRelation: "client_routine_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_routine_sessions_client_routine_id_fkey";
            columns: ["client_routine_id"];
            isOneToOne: false;
            referencedRelation: "client_routines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_routine_sessions_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
        ];
      };
      client_routines: {
        Row: {
          client_id: string;
          coach_profile_id: string | null;
          created_at: string;
          ends_on: string | null;
          gym_id: string | null;
          id: string;
          notes: string | null;
          starts_on: string | null;
          status: "draft" | "active" | "archived";
          title: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          coach_profile_id?: string | null;
          created_at?: string;
          ends_on?: string | null;
          gym_id?: string | null;
          id?: string;
          notes?: string | null;
          starts_on?: string | null;
          status?: "draft" | "active" | "archived";
          title: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          coach_profile_id?: string | null;
          created_at?: string;
          ends_on?: string | null;
          gym_id?: string | null;
          id?: string;
          notes?: string | null;
          starts_on?: string | null;
          status?: "draft" | "active" | "archived";
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_user_links: {
        Row: {
          client_id: string;
          created_at: string;
          gym_id: string | null;
          id: string;
          portal_invite_last_sent_at: string | null;
          portal_invite_send_count_date: string | null;
          portal_invite_send_count_today: number;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          portal_invite_last_sent_at?: string | null;
          portal_invite_send_count_date?: string | null;
          portal_invite_send_count_today?: number;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          portal_invite_last_sent_at?: string | null;
          portal_invite_send_count_date?: string | null;
          portal_invite_send_count_today?: number;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_template_days: {
        Row: {
          created_at: string;
          day_index: number;
          id: string;
          notes: string | null;
          routine_template_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          day_index: number;
          id?: string;
          notes?: string | null;
          routine_template_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          day_index?: number;
          id?: string;
          notes?: string | null;
          routine_template_id?: string;
          title?: string;
        };
        Relationships: [];
      };
      routine_template_exercises: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          notes: string | null;
          reps_text: string;
          rest_seconds: number | null;
          routine_template_day_id: string;
          sets_text: string;
          sort_order: number;
          target_weight_text: string | null;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          notes?: string | null;
          reps_text: string;
          rest_seconds?: number | null;
          routine_template_day_id: string;
          sets_text: string;
          sort_order?: number;
          target_weight_text?: string | null;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          reps_text?: string;
          rest_seconds?: number | null;
          routine_template_day_id?: string;
          sets_text?: string;
          sort_order?: number;
          target_weight_text?: string | null;
        };
        Relationships: [];
      };
      routine_templates: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          id: string;
          notes: string | null;
          source_routine_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          notes?: string | null;
          source_routine_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          notes?: string | null;
          source_routine_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          checked_in_at: string;
          client_id: string;
          created_at: string;
          id: string;
          notes: string | null;
        };
        Insert: {
          checked_in_at?: string;
          client_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
        };
        Update: {
          checked_in_at?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      exercise_library: {
        Row: {
          coach_tips: string | null;
          common_mistakes: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          difficulty: "beginner" | "intermediate" | "advanced" | null;
          equipment: string | null;
          gym_id: string | null;
          id: string;
          instructions: string | null;
          is_active: boolean;
          name: string;
          primary_muscle: string | null;
          secondary_muscle: string | null;
          slug: string;
          thumbnail_url: string | null;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          coach_tips?: string | null;
          common_mistakes?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          difficulty?: "beginner" | "intermediate" | "advanced" | null;
          equipment?: string | null;
          gym_id?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          name: string;
          primary_muscle?: string | null;
          secondary_muscle?: string | null;
          slug: string;
          thumbnail_url?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          coach_tips?: string | null;
          common_mistakes?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          difficulty?: "beginner" | "intermediate" | "advanced" | null;
          equipment?: string | null;
          gym_id?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          name?: string;
          primary_muscle?: string | null;
          secondary_muscle?: string | null;
          slug?: string;
          thumbnail_url?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      exercise_media: {
        Row: {
          alt_text: string | null;
          created_at: string;
          exercise_id: string;
          id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          exercise_id: string;
          id?: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          exercise_id?: string;
          id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercise_library";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_plans: {
        Row: {
          created_at: string;
          description: string | null;
          duration_in_days: number;
          gym_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_in_days: number;
          gym_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_in_days?: number;
          gym_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      idempotent_operations: {
        Row: {
          created_at: string;
          entity_id: string;
          gym_id: string;
          id: string;
          idempotency_key: string;
          operation_type: string;
          request_fingerprint: Json;
          result: Json;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          gym_id: string;
          id?: string;
          idempotency_key: string;
          operation_type: string;
          request_fingerprint: Json;
          result: Json;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          gym_id?: string;
          id?: string;
          idempotency_key?: string;
          operation_type?: string;
          request_fingerprint?: Json;
          result?: Json;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          client_id: string;
          client_membership_id: string | null;
          concept: string;
          created_at: string;
          gym_id: string | null;
          id: string;
          notes: string | null;
          payment_date: string;
          payment_method: "cash" | "transfer" | "card";
          updated_at: string;
        };
        Insert: {
          amount: number;
          client_id: string;
          client_membership_id?: string | null;
          concept: string;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          notes?: string | null;
          payment_date: string;
          payment_method: "cash" | "transfer" | "card";
          updated_at?: string;
        };
        Update: {
          amount?: number;
          client_id?: string;
          client_membership_id?: string | null;
          concept?: string;
          created_at?: string;
          gym_id?: string | null;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          payment_method?: "cash" | "transfer" | "card";
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          first_name: string | null;
          gym_id: string | null;
          id: string;
          last_name: string | null;
          role: "super_admin" | "admin" | "staff" | "coach" | "client";
        };
        Insert: {
          created_at?: string;
          email: string;
          first_name?: string | null;
          gym_id?: string | null;
          id: string;
          last_name?: string | null;
          role?: "super_admin" | "admin" | "staff" | "coach" | "client";
        };
        Update: {
          created_at?: string;
          email?: string;
          first_name?: string | null;
          gym_id?: string | null;
          id?: string;
          last_name?: string | null;
          role?: "super_admin" | "admin" | "staff" | "coach" | "client";
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      abandon_routine_session: {
        Args: {
          p_session_id: string;
        };
        Returns: {
          abandoned_at: string;
          completed_sets_count: number;
          session_id: string;
          status: string;
          total_sets_count: number;
        }[];
      };
      archive_client_routine: {
        Args: {
          target_routine_id: string;
        };
        Returns: {
          already_archived: boolean;
          id: string;
        }[];
      };
      assign_membership_with_payment: {
        Args: {
          p_amount: number;
          p_client_id: string;
          p_idempotency_key: string;
          p_membership_plan_id: string;
          p_notes: string | null;
          p_payment_method: string;
          p_start_date: string;
        };
        Returns: {
          amount_paid: number;
          membership_id: string;
          payment_id: string;
          remaining_balance: number;
          status: string;
          total_paid: number;
        }[];
      };
      can_access_client: {
        Args: {
          target_client_id: string;
        };
        Returns: boolean;
      };
      extend_membership: {
        Args: {
          p_client_membership_id: string;
          p_days: number;
          p_idempotency_key: string;
        };
        Returns: {
          end_date: string;
          status: string;
        }[];
      };
      finish_routine_session: {
        Args: {
          p_client_notes: string | null;
          p_session_id: string;
        };
        Returns: {
          completed_at: string;
          completed_sets_count: number;
          session_id: string;
          status: string;
          total_sets_count: number;
        }[];
      };
      has_any_role: {
        Args: {
          allowed_roles: string[];
        };
        Returns: boolean;
      };
      is_linked_client: {
        Args: {
          target_client_id: string;
        };
        Returns: boolean;
      };
      lookup_portal_profile_by_email: {
        Args: {
          target_email: string;
        };
        Returns: {
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          role: "super_admin" | "admin" | "staff" | "coach" | "client";
        }[];
      };
      lookup_portal_profile_by_id: {
        Args: {
          target_profile_id: string;
        };
        Returns: {
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          role: "super_admin" | "admin" | "staff" | "coach" | "client";
        }[];
      };
      merge_clients: {
        Args: {
          duplicate_client_id: string;
          main_client_id: string;
        };
        Returns: undefined;
      };
      register_membership_payment: {
        Args: {
          p_amount: number;
          p_client_id: string;
          p_client_membership_id: string;
          p_idempotency_key: string;
          p_payment_method: string;
        };
        Returns: {
          amount: number;
          client_membership_id: string;
          membership_status: string;
          payment_id: string;
          remaining_balance: number;
          total_paid: number;
        }[];
      };
      renew_membership: {
        Args: {
          p_idempotency_key: string;
          p_source_membership_id: string;
        };
        Returns: {
          end_date: string;
          membership_id: string;
          start_date: string;
          status: string;
        }[];
      };
      reorder_client_routine_days: {
        Args: {
          p_day_ids: string[];
          p_routine_id: string;
        };
        Returns: undefined;
      };
      reorder_client_routine_exercises: {
        Args: {
          p_exercise_ids: string[];
          p_routine_day_id: string;
        };
        Returns: undefined;
      };
      start_routine_session: {
        Args: {
          p_client_routine_day_id: string;
          p_idempotency_key: string;
        };
        Returns: {
          requested_day_matches: boolean;
          resumed: boolean;
          session_id: string;
        }[];
      };
      update_routine_session_exercise_note: {
        Args: {
          p_client_notes: string | null;
          p_expected_version: number;
          p_session_exercise_id: string;
        };
        Returns: {
          client_notes: string | null;
          conflict: boolean;
          session_exercise_id: string;
          version: number;
        }[];
      };
      update_routine_session_set: {
        Args: {
          p_completed: boolean;
          p_expected_version: number;
          p_notes: string | null;
          p_reps: number | null;
          p_set_id: string;
          p_weight: number | null;
        };
        Returns: {
          completed: boolean;
          conflict: boolean;
          notes: string | null;
          reps: number | null;
          set_id: string;
          version: number;
          weight: number | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
