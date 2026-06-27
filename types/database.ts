export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      billing_cycles: {
        Row: {
          id: string;
          start_date: string;
          end_date: string;
          food_budget_target: number;
          food_wallet_holder_user_id: string;
          carry_over_amount: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["billing_cycles"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["billing_cycles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          is_default: boolean;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          billing_cycle_id: string;
          date: string;
          title: string;
          category_id: string;
          amount: number;
          payer_user_id: string;
          transaction_type: "food" | "normal" | "installment";
          split_type: "split_half" | "no_split" | "full_reimburse";
          note: string | null;
          attachment_url: string | null;
          installment_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      installments: {
        Row: {
          id: string;
          title: string;
          total_installments: number;
          current_installment: number;
          monthly_amount: number;
          start_date: string;
          end_date: string;
          payer_user_id: string;
          split_type: "split_half" | "no_split" | "full_reimburse";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["installments"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installments"]["Insert"]>;
        Relationships: [];
      };
      installment_transactions: {
        Row: {
          id: string;
          installment_id: string;
          transaction_id: string;
          installment_number: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["installment_transactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installment_transactions"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          actor_user_id: string;
          recipient_user_id: string;
          transaction_id: string | null;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      translation_pairs: {
        Row: {
          id: string;
          translation_key: string;
          thai_text: string;
          english_text: string;
          source_file: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["translation_pairs"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["translation_pairs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
