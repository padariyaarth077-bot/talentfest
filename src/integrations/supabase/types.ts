export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      entry_passes: {
        Row: {
          award_category: string | null;
          category: string;
          checked_in_at: string | null;
          city: string | null;
          company_address: string | null;
          company_authorized_signature_url: string | null;
          company_contact_number: string | null;
          company_email: string | null;
          company_name: string | null;
          competition: string;
          coordinator_name: string | null;
          created_at: string;
          declaration_accepted: boolean | null;
          department: string | null;
          designation: string | null;
          employee_email: string | null;
          employee_full_name: string | null;
          employee_mobile_number: string | null;
          employee_signature_url: string | null;
          entry_gate: string | null;
          entry_number: string;
          event_date: string | null;
          gender: string | null;
          hall: string | null;
          id: string;
          major_achievements: string | null;
          number_of_participants: number | null;
          other_award_category: string | null;
          participant_name: string;
          participation_type: string | null;
          performance_time: string | null;
          photo_url: string | null;
          payment_method: string | null;
          reporting_time: string | null;
          registration_date: string | null;
          registration_fees: number | null;
          stage: string | null;
          status: Database["public"]["Enums"]["pass_status"];
          sub_category: string | null;
          total_experience: string | null;
          transaction_reference: string | null;
          user_id: string;
          venue: string | null;
          verification_token: string;
          working_since: string | null;
        };
        Insert: {
          award_category?: string | null;
          category: string;
          checked_in_at?: string | null;
          city?: string | null;
          company_address?: string | null;
          company_authorized_signature_url?: string | null;
          company_contact_number?: string | null;
          company_email?: string | null;
          company_name?: string | null;
          competition: string;
          coordinator_name?: string | null;
          created_at?: string;
          declaration_accepted?: boolean | null;
          department?: string | null;
          designation?: string | null;
          employee_email?: string | null;
          employee_full_name?: string | null;
          employee_mobile_number?: string | null;
          employee_signature_url?: string | null;
          entry_gate?: string | null;
          entry_number?: string;
          event_date?: string | null;
          gender?: string | null;
          hall?: string | null;
          id?: string;
          major_achievements?: string | null;
          number_of_participants?: number | null;
          other_award_category?: string | null;
          participant_name: string;
          participation_type?: string | null;
          performance_time?: string | null;
          photo_url?: string | null;
          payment_method?: string | null;
          reporting_time?: string | null;
          registration_date?: string | null;
          registration_fees?: number | null;
          stage?: string | null;
          status?: Database["public"]["Enums"]["pass_status"];
          sub_category?: string | null;
          total_experience?: string | null;
          transaction_reference?: string | null;
          user_id: string;
          venue?: string | null;
          verification_token?: string;
          working_since?: string | null;
        };
        Update: {
          award_category?: string | null;
          category?: string;
          checked_in_at?: string | null;
          city?: string | null;
          company_address?: string | null;
          company_authorized_signature_url?: string | null;
          company_contact_number?: string | null;
          company_email?: string | null;
          company_name?: string | null;
          competition?: string;
          coordinator_name?: string | null;
          created_at?: string;
          declaration_accepted?: boolean | null;
          department?: string | null;
          designation?: string | null;
          employee_email?: string | null;
          employee_full_name?: string | null;
          employee_mobile_number?: string | null;
          employee_signature_url?: string | null;
          entry_gate?: string | null;
          entry_number?: string;
          event_date?: string | null;
          gender?: string | null;
          hall?: string | null;
          id?: string;
          major_achievements?: string | null;
          number_of_participants?: number | null;
          other_award_category?: string | null;
          participant_name?: string;
          participation_type?: string | null;
          performance_time?: string | null;
          photo_url?: string | null;
          payment_method?: string | null;
          reporting_time?: string | null;
          registration_date?: string | null;
          registration_fees?: number | null;
          stage?: string | null;
          status?: Database["public"]["Enums"]["pass_status"];
          sub_category?: string | null;
          total_experience?: string | null;
          transaction_reference?: string | null;
          user_id?: string;
          venue?: string | null;
          verification_token?: string;
          working_since?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          photo_url: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          photo_url?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          photo_url?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "admin" | "participant";
      pass_status:
        "pending" | "approved" | "rejected" | "checked_in" | "completed" | "cancelled" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "participant"],
      pass_status: [
        "pending",
        "approved",
        "rejected",
        "checked_in",
        "completed",
        "cancelled",
        "expired",
      ],
    },
  },
} as const;
