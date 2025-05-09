export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          email: string;
          password: string;
          name: string;
          role: string;
          active: boolean;
          language: string;
          created_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: number;
          email: string;
          password: string;
          name: string;
          role?: string;
          active?: boolean;
          language?: string;
          created_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: number;
          email?: string;
          password?: string;
          name?: string;
          role?: string;
          active?: boolean;
          language?: string;
          created_at?: string;
          last_login_at?: string | null;
        };
      };
      instances: {
        Row: {
          id: number;
          name: string;
          user_id: number;
          status: string;
          phone_number: string | null;
          created_at: string;
          last_connected_at: string | null;
          settings: any | null;
        };
        Insert: {
          id?: number;
          name: string;
          user_id: number;
          status?: string;
          phone_number?: string | null;
          created_at?: string;
          last_connected_at?: string | null;
          settings?: any | null;
        };
        Update: {
          id?: number;
          name?: string;
          user_id?: number;
          status?: string;
          phone_number?: string | null;
          created_at?: string;
          last_connected_at?: string | null;
          settings?: any | null;
        };
      };
      webhook_events: {
        Row: {
          id: number;
          platform: string;
          buyer_email: string;
          product_name: string;
          payment_status: string;
          transaction_date: string;
          plan_type: string;
          processed: boolean;
          user_id: number | null;
          raw_data: any;
          created_at: string;
        };
        Insert: {
          id?: number;
          platform: string;
          buyer_email: string;
          product_name: string;
          payment_status: string;
          transaction_date?: string;
          plan_type: string;
          processed?: boolean;
          user_id?: number | null;
          raw_data?: any;
          created_at?: string;
        };
        Update: {
          id?: number;
          platform?: string;
          buyer_email?: string;
          product_name?: string;
          payment_status?: string;
          transaction_date?: string;
          plan_type?: string;
          processed?: boolean;
          user_id?: number | null;
          raw_data?: any;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}