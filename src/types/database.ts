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
          id?: string;
          last_name?: string;
          notes?: string | null;
          phone?: string;
          status?: "active" | "inactive";
          updated_at?: string;
        };
        Relationships: [];
      };
      client_memberships: {
        Row: {
          client_id: string;
          created_at: string;
          end_date: string;
          id: string;
          membership_plan_id: string;
          notes: string | null;
          start_date: string;
          status: "active" | "expired" | "cancelled" | "pending_payment";
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          end_date: string;
          id?: string;
          membership_plan_id: string;
          notes?: string | null;
          start_date: string;
          status?: "active" | "expired" | "cancelled" | "pending_payment";
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          membership_plan_id?: string;
          notes?: string | null;
          start_date?: string;
          status?: "active" | "expired" | "cancelled" | "pending_payment";
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
      membership_plans: {
        Row: {
          created_at: string;
          description: string | null;
          duration_in_days: number;
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
          id: string;
          last_name: string | null;
          role: "admin" | "staff" | "coach" | "member";
        };
        Insert: {
          created_at?: string;
          email: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          role?: "admin" | "staff" | "coach" | "member";
        };
        Update: {
          created_at?: string;
          email?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          role?: "admin" | "staff" | "coach" | "member";
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
