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
