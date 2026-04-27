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
          id: string;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
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
      can_access_client: {
        Args: {
          target_client_id: string;
        };
        Returns: boolean;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
