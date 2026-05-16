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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_count: number | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_count?: number | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_count?: number | null
        }
        Relationships: []
      }
      agent_profiles: {
        Row: {
          agent_id: string
          display_name: string
          doc_summary: string
          examples: string
          id: string
          is_active: boolean
          system_addendum: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id: string
          display_name: string
          doc_summary?: string
          examples?: string
          id?: string
          is_active?: boolean
          system_addendum?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string
          display_name?: string
          doc_summary?: string
          examples?: string
          id?: string
          is_active?: boolean
          system_addendum?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          link_text: string | null
          link_text_ar: string | null
          link_url: string | null
          message: string
          message_ar: string | null
          starts_at: string | null
          title: string
          title_ar: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_text_ar?: string | null
          link_url?: string | null
          message: string
          message_ar?: string | null
          starts_at?: string | null
          title: string
          title_ar?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_text_ar?: string | null
          link_url?: string | null
          message?: string
          message_ar?: string | null
          starts_at?: string | null
          title?: string
          title_ar?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_selection: {
        Row: {
          brand_kit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_kit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_selection_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          audience: string | null
          created_at: string
          description: string
          id: string
          logo_path: string | null
          name: string
          subject: string
          tagline: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_path?: string | null
          name?: string
          subject?: string
          tagline?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_path?: string | null
          name?: string
          subject?: string
          tagline?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      character_kit_selection: {
        Row: {
          character_kit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          character_kit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          character_kit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      character_kits: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          reference_path: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          reference_path?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          reference_path?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_presets: {
        Row: {
          anim_class: string | null
          best_for: string
          created_at: string
          created_by: string | null
          description: string
          group_id: string
          icon_name: string
          id: string
          label: string
        }
        Insert: {
          anim_class?: string | null
          best_for?: string
          created_at?: string
          created_by?: string | null
          description?: string
          group_id: string
          icon_name: string
          id: string
          label: string
        }
        Update: {
          anim_class?: string | null
          best_for?: string
          created_at?: string
          created_by?: string | null
          description?: string
          group_id?: string
          icon_name?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      director_sessions: {
        Row: {
          brief_context: Json
          created_at: string
          final_prompt: string | null
          id: string
          messages: Json
          pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
          video_job_id: string | null
        }
        Insert: {
          brief_context?: Json
          created_at?: string
          final_prompt?: string | null
          id?: string
          messages?: Json
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
          video_job_id?: string | null
        }
        Update: {
          brief_context?: Json
          created_at?: string
          final_prompt?: string | null
          id?: string
          messages?: Json
          pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
          video_job_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      generation_events: {
        Row: {
          created_at: string
          id: string
          session_id: string
          target_model: string
          user_id: string | null
          workflow_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          target_model: string
          user_id?: string | null
          workflow_type: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          target_model?: string
          user_id?: string | null
          workflow_type?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          message_ar: string | null
          title: string
          title_ar: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          message_ar?: string | null
          title: string
          title_ar?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          message_ar?: string | null
          title?: string
          title_ar?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          id: string
          page_path: string
          session_id: string
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          page_path: string
          session_id: string
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          page_path?: string
          session_id?: string
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      preset_preview_meta: {
        Row: {
          generated_at: string
          generated_by: string | null
          preset_id: string
          preview_model: string | null
        }
        Insert: {
          generated_at?: string
          generated_by?: string | null
          preset_id: string
          preview_model?: string | null
        }
        Update: {
          generated_at?: string
          generated_by?: string | null
          preset_id?: string
          preview_model?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          admin_notes_updated_at: string | null
          admin_notes_updated_by: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_notes_updated_at?: string | null
          admin_notes_updated_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          admin_notes?: string | null
          admin_notes_updated_at?: string | null
          admin_notes_updated_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          created_at: string | null
          id: string
          image_paths: string[] | null
          results: Json
          target_model: string
          user_id: string
          workflow_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_paths?: string[] | null
          results: Json
          target_model: string
          user_id: string
          workflow_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_paths?: string[] | null
          results?: Json
          target_model?: string
          user_id?: string
          workflow_type?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      shared_prompts: {
        Row: {
          agent_name: string | null
          created_at: string
          expires_at: string | null
          featured: boolean
          featured_at: string | null
          id: string
          results: Json
          slug: string
          target_model: string
          title: string | null
          updated_at: string
          user_id: string
          view_count: number
          workflow_type: string
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          expires_at?: string | null
          featured?: boolean
          featured_at?: string | null
          id?: string
          results: Json
          slug: string
          target_model: string
          title?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
          workflow_type: string
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          expires_at?: string | null
          featured?: boolean
          featured_at?: string | null
          id?: string
          results?: Json
          slug?: string
          target_model?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
          workflow_type?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      video_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          fal_request_id: string | null
          fal_response_url: string | null
          fal_status_url: string | null
          id: string
          prompt: string
          provider: string
          reference_image_urls: Json | null
          session_id: string | null
          status: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          fal_response_url?: string | null
          fal_status_url?: string | null
          id?: string
          prompt: string
          provider: string
          reference_image_urls?: Json | null
          session_id?: string | null
          status?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          fal_response_url?: string | null
          fal_status_url?: string | null
          id?: string
          prompt?: string
          provider?: string
          reference_image_urls?: Json | null
          session_id?: string | null
          status?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "director_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_popups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_text: string | null
          link_text_ar: string | null
          link_url: string | null
          message: string
          message_ar: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_text_ar?: string | null
          link_url?: string | null
          message: string
          message_ar?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_text_ar?: string | null
          link_url?: string | null
          message?: string
          message_ar?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "welcome_popups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attribute_referral: { Args: { _code: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gen_referral_code: { Args: never; Returns: string }
      get_or_create_my_referral_code: { Args: never; Returns: string }
      has_role:
        | {
            Args: { _role: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      increment_shared_prompt_views: {
        Args: { _slug: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
