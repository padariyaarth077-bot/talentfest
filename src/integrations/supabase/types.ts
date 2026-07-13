export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      entry_passes: {
        Row: {
          id: string;
          participant_name: string;
          entry_number: string;
          competition: string;
          category: string;
          sub_category: string | null;
          event_date: string | null;
          venue: string | null;
          reporting_time: string | null;
          performance_time: string | null;
          stage: string | null;
          hall: string | null;
          entry_gate: string | null;
          photo_url: string | null;
          status: string;
          checked_in: boolean | null;
          checked_in_at: string | null;
          pass_status: string | null;
          verification_token: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          participant_name: string;
          entry_number?: string;
          competition: string;
          category: string;
          verification_token?: string;
        };
        Update: {
          participant_name?: string;
          entry_number?: string;
          checked_in?: boolean | null;
          checked_in_at?: string | null;
          status?: string;
          pass_status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          slug: string;
          city: string;
          city_code: string;
          event_image_url: string | null;
          event_date: string | null;
          start_time: string | null;
          end_time: string | null;
          venue: string | null;
          map_url: string | null;
          participant_price: number;
          visitor_price: number;
          guest_price: number;
          participant_capacity: number;
          visitor_capacity: number;
          guest_capacity: number;
          maximum_guests_per_participant: number;
          registration_opens_at: string | null;
          registration_closes_at: string | null;
          registration_status: string;
          visitor_registration_enabled: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          city: string;
          city_code: string;
        };
        Update: {
          name?: string;
          slug?: string;
          city?: string;
          city_code?: string;
          is_active?: boolean;
          registration_status?: string;
          event_image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
        };
        Update: {
          name?: string;
          slug?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_activity_categories: {
        Row: {
          id: string;
          event_id: string;
          activity_category_id: string;
          capacity: number | null;
          registration_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          activity_category_id: string;
          registration_status?: string;
        };
        Update: {
          capacity?: number | null;
          registration_status?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "eac_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "eac_category_fk"; columns: ["activity_category_id"]; referencedRelation: "activity_categories"; referencedColumns: ["id"] },
        ];
      };
      registrations: {
        Row: {
          id: string;
          registration_number: string | null;
          registration_type: string;
          event_id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          encrypted_aadhaar: string | null;
          aadhaar_last_four: string | null;
          aadhaar_consent: boolean;
          activity_category_id: string | null;
          payment_status: string;
          registration_status: string;
          reservation_expires_at: string | null;
          event_name_snapshot: string | null;
          event_city_snapshot: string | null;
          event_date_snapshot: string | null;
          event_start_time_snapshot: string | null;
          event_end_time_snapshot: string | null;
          event_venue_snapshot: string | null;
          photo_storage_path: string | null;
          photo_url: string | null;
          photo_uploaded_at: string | null;
          photo_mime_type: string | null;
          photo_size_bytes: number | null;
          seat_allocation_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          registration_type: string;
          event_id: string;
          first_name?: string;
          last_name?: string;
          full_name?: string;
          phone?: string;
          email?: string;
          activity_category_id?: string | null;
          payment_status?: string;
          registration_status?: string;
        };
        Update: {
          payment_status?: string;
          registration_status?: string;
          seat_allocation_status?: string;
          photo_storage_path?: string | null;
          photo_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "reg_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "reg_category_fk"; columns: ["activity_category_id"]; referencedRelation: "activity_categories"; referencedColumns: ["id"] },
        ];
      };
      passes: {
        Row: {
          id: string;
          registration_id: string;
          guest_id: string | null;
          pass_number: string | null;
          pass_type: string;
          secure_qr_token: string | null;
          status: string;
          checked_in: boolean;
          checked_in_at: string | null;
          generated_at: string | null;
          revoked_at: string | null;
          event_id: string | null;
          seat_section_name: string | null;
          seat_row_label: string | null;
          seat_number: number | null;
          seat_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          registration_id: string;
          pass_type?: string;
          status?: string;
        };
        Update: {
          status?: string;
          checked_in?: boolean;
          checked_in_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "pass_reg_fk"; columns: ["registration_id"]; referencedRelation: "registrations"; referencedColumns: ["id"] },
          { foreignKeyName: "pass_guest_fk"; columns: ["guest_id"]; referencedRelation: "guests"; referencedColumns: ["id"] },
          { foreignKeyName: "pass_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
        ];
      };
      guests: {
        Row: {
          id: string;
          registration_id: string;
          guest_number: number | null;
          full_name: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          registration_id: string;
          guest_number?: number;
          full_name: string;
          phone?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "guest_reg_fk"; columns: ["registration_id"]; referencedRelation: "registrations"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          registration_id: string;
          provider: string;
          payment_mode: string | null;
          order_id: string | null;
          transaction_id: string | null;
          amount: number;
          currency: string;
          status: string;
          verified_at: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          registration_id: string;
          provider?: string;
          amount: number;
          currency?: string;
          status?: string;
        };
        Update: {
          status?: string;
          payment_mode?: string | null;
          order_id?: string | null;
          transaction_id?: string | null;
          verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "pay_reg_fk"; columns: ["registration_id"]; referencedRelation: "registrations"; referencedColumns: ["id"] },
        ];
      };
      check_in_logs: {
        Row: {
          id: string;
          pass_id: string;
          admin_user_id: string | null;
          previous_status: string | null;
          new_status: string;
          action: string;
          checked_in_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          pass_id: string;
          new_status: string;
          action: string;
          checked_in_at?: string | null;
          admin_user_id?: string | null;
          previous_status?: string | null;
        };
        Update: {};
        Relationships: [
          { foreignKeyName: "checkin_pass_fk"; columns: ["pass_id"]; referencedRelation: "passes"; referencedColumns: ["id"] },
        ];
      };
      concert_settings: {
        Row: {
          id: string;
          eyebrow: string;
          title: string;
          subtitle: string;
          event_label: string;
          event_title: string;
          venue: string;
          city: string | null;
          event_date: string | null;
          start_time: string | null;
          end_time: string | null;
          price_text: string;
          button_text: string;
          button_url: string;
          map_url: string;
          map_embed_url: string;
          latitude: number | null;
          longitude: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title?: string;
          event_title?: string;
        };
        Update: {
          title?: string;
          event_title?: string;
          map_url?: string;
          map_embed_url?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      concert_artists: {
        Row: {
          id: string;
          concert_info_id: string | null;
          artist_name: string;
          performance_type: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          artist_name: string;
          concert_info_id?: string | null;
          display_order?: number;
        };
        Update: {
          artist_name?: string;
          performance_type?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "artist_concert_fk"; columns: ["concert_info_id"]; referencedRelation: "concert_settings"; referencedColumns: ["id"] },
        ];
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          content: string;
          category: string;
          thumbnail_url: string | null;
          thumbnail_alt: string | null;
          status: string;
          published_at: string | null;
          is_featured: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          slug: string;
          status?: string;
          display_order?: number;
        };
        Update: {
          title?: string;
          slug?: string;
          status?: string;
          thumbnail_url?: string | null;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      employee_award_registrations: {
        Row: {
          id: string;
          application_number: string | null;
          company_name: string | null;
          company_address: string | null;
          coordinator_name: string | null;
          contact_number: string | null;
          company_email: string | null;
          employee_full_name: string | null;
          designation: string | null;
          department: string | null;
          gender: string | null;
          mobile_number: string | null;
          employee_email: string | null;
          award_categories: string[] | null;
          other_award_category: string | null;
          working_since: string | null;
          total_experience: string | null;
          major_achievements: string | null;
          event_participation: string | null;
          number_of_participants: number | null;
          declaration_accepted: boolean | null;
          employee_signature_name: string | null;
          authorized_company_signature_name: string | null;
          declaration_date: string | null;
          status: string;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          company_name: string;
          employee_full_name: string;
          status?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string;
          subject: string;
          message: string;
          status: string;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          full_name: string;
          phone: string;
          email: string;
          subject: string;
          message: string;
          status?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gallery_cities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          display_order?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      gallery_media: {
        Row: {
          id: string;
          city_id: string | null;
          title: string;
          media_type: string;
          category: string;
          media_url: string;
          thumbnail_url: string | null;
          description: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          media_type: string;
          media_url: string;
          city_id?: string | null;
          category?: string;
        };
        Update: {
          title?: string;
          media_url?: string;
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "media_city_fk"; columns: ["city_id"]; referencedRelation: "gallery_cities"; referencedColumns: ["id"] },
        ];
      };
      admin_activity: {
        Row: {
          id: string;
          action: string;
          entry_number: string | null;
          participant_name: string | null;
          admin_email: string | null;
          pass_id: string | null;
          created_at: string;
        };
        Insert: {
          action: string;
          entry_number?: string | null;
          participant_name?: string | null;
          admin_email?: string | null;
        };
        Update: {};
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
        };
        Insert: {
          user_id: string;
          role: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          photo_url: string | null;
          city: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      public_entry_passes: {
        Row: {
          id: string;
          participant_name: string;
          event_name: string;
          entry_number: string;
          qr_value: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          checked_in: boolean | null;
          checked_in_at: string | null;
          pass_status: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          participant_name: string;
          event_name: string;
          entry_number: string;
        };
        Update: {
          checked_in?: boolean | null;
          checked_in_at?: string | null;
          pass_status?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      seat_bookings: {
        Row: {
          id: string;
          event_id: string;
          seat_id: string;
          registration_id: string;
          pass_id: string | null;
          holder_type: string;
          holder_name: string;
          booked_at: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          seat_id: string;
          registration_id: string;
          holder_type: string;
          holder_name: string;
        };
        Update: {};
        Relationships: [
          { foreignKeyName: "sb_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "sb_reg_fk"; columns: ["registration_id"]; referencedRelation: "registrations"; referencedColumns: ["id"] },
        ];
      };
      event_seats: {
        Row: {
          id: string;
          event_id: string;
          section_id: string;
          row_label: string;
          seat_number: number;
          seat_label: string;
          seat_type: string;
          status: string;
          display_order: number;
          is_accessible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          section_id: string;
          row_label: string;
          seat_number: number;
          seat_label: string;
          seat_type: string;
          display_order?: number;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "es_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "es_section_fk"; columns: ["section_id"]; referencedRelation: "event_seat_sections"; referencedColumns: ["id"] },
        ];
      };
      event_seat_sections: {
        Row: {
          id: string;
          event_id: string;
          section_name: string;
          section_code: string;
          seat_type: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          section_name: string;
          section_code: string;
          seat_type: string;
          display_order?: number;
        };
        Update: {
          section_name?: string;
          section_code?: string;
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "ess_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
        ];
      };
      seat_holds: {
        Row: {
          id: string;
          event_id: string;
          seat_id: string;
          registration_id: string | null;
          hold_token: string;
          expires_at: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          seat_id: string;
          registration_id?: string | null;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sh_event_fk"; columns: ["event_id"]; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "sh_seat_fk"; columns: ["seat_id"]; referencedRelation: "event_seats"; referencedColumns: ["id"] },
        ];
      };
      seat_allocation_audit: {
        Row: {
          id: string;
          event_id: string;
          registration_id: string | null;
          pass_id: string | null;
          old_seat_id: string | null;
          new_seat_id: string | null;
          action: string;
          changed_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          event_id: string;
          action: string;
          registration_id?: string | null;
          pass_id?: string | null;
          new_seat_id?: string | null;
          changed_by?: string | null;
          reason?: string | null;
        };
        Update: {};
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          action_key: string;
          identifier: string;
          window_start: string;
          attempt_count: number;
          created_at: string;
        };
        Insert: {
          action_key: string;
          identifier: string;
          attempt_count?: number;
        };
        Update: {
          attempt_count?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      allocate_registration_seats: {
        Args: { p_registration_id: string; p_admin_user_id?: string };
        Returns: Json;
      };
      generate_event_seats: {
        Args: {
          p_event_id: string;
          p_section_id: string;
          p_seat_type: string;
          p_start_row?: string;
          p_num_rows?: number;
          p_seats_per_row?: number;
        };
        Returns: Json;
      };
      increment_rate_limit: {
        Args: { p_action_key: string; p_identifier: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "participant";
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
    },
  },
} as const;
