/**
 * Database Types - Auto-generated from Supabase schema
 * 
 * To regenerate this file, run:
 * pnpm db:generate
 * 
 * Or manually:
 * supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      availability: {
        Row: {
          id: string
          user_id: string
          date: string
          is_available: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          is_available: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          is_available?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          leader_id: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          leader_id?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          leader_id?: string | null
          color?: string | null
          created_at?: string
        }
      }
      equipment: {
        Row: {
          id: string
          name: string
          category_id: string
          serial_number: string | null
          model: string | null
          manufacturer: string | null
          purchase_date: string | null
          purchase_price: number | null
          warranty_expires: string | null
          location: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          qr_code: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id: string
          serial_number?: string | null
          model?: string | null
          manufacturer?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          warranty_expires?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          qr_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string
          serial_number?: string | null
          model?: string | null
          manufacturer?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          warranty_expires?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          qr_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      equipment_categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          icon?: string | null
          created_at?: string
        }
      }
      equipment_checkouts: {
        Row: {
          id: string
          equipment_id: string
          checked_out_by: string
          checked_out_at: string
          expected_return: string
          returned_at: string | null
          condition_on_return: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          equipment_id: string
          checked_out_by: string
          checked_out_at?: string
          expected_return: string
          returned_at?: string | null
          condition_on_return?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          equipment_id?: string
          checked_out_by?: string
          checked_out_at?: string
          expected_return?: string
          returned_at?: string | null
          condition_on_return?: string | null
          notes?: string | null
        }
      }
      equipment_maintenance: {
        Row: {
          id: string
          equipment_id: string
          type: Database["public"]["Enums"]["maintenance_type"]
          description: string
          performed_by: string | null
          performed_at: string
          next_due: string | null
          cost: number | null
          vendor: string | null
        }
        Insert: {
          id?: string
          equipment_id: string
          type: Database["public"]["Enums"]["maintenance_type"]
          description: string
          performed_by?: string | null
          performed_at?: string
          next_due?: string | null
          cost?: number | null
          vendor?: string | null
        }
        Update: {
          id?: string
          equipment_id?: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          description?: string
          performed_by?: string | null
          performed_at?: string
          next_due?: string | null
          cost?: number | null
          vendor?: string | null
        }
      }
      livestreams: {
        Row: {
          id: string
          rota_id: string | null
          title: string
          youtube_description: string | null
          facebook_description: string | null
          speaker: string | null
          scripture: string | null
          metadata: Json
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          rota_id?: string | null
          title: string
          youtube_description?: string | null
          facebook_description?: string | null
          speaker?: string | null
          scripture?: string | null
          metadata?: Json
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          rota_id?: string | null
          title?: string
          youtube_description?: string | null
          facebook_description?: string | null
          speaker?: string | null
          scripture?: string | null
          metadata?: Json
          created_by?: string
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          email_enabled: boolean
          sms_enabled: boolean
          reminder_timing: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          email_enabled?: boolean
          sms_enabled?: boolean
          reminder_timing?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          email_enabled?: boolean
          sms_enabled?: boolean
          reminder_timing?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          channel: Database["public"]["Enums"]["notification_channel"]
          title: string
          body: string
          data: Json
          sent_at: string | null
          read_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          error_message: string | null
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          channel: Database["public"]["Enums"]["notification_channel"]
          title: string
          body: string
          data?: Json
          sent_at?: string | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          error_message?: string | null
          retry_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          title?: string
          body?: string
          data?: Json
          sent_at?: string | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          error_message?: string | null
          retry_count?: number
          created_at?: string
        }
      }
      onboarding_steps: {
        Row: {
          id: string
          track_id: string
          order: number
          title: string
          description: string | null
          type: Database["public"]["Enums"]["step_type"]
          content_url: string | null
          required: boolean
          pass_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          track_id: string
          order: number
          title: string
          description?: string | null
          type: Database["public"]["Enums"]["step_type"]
          content_url?: string | null
          required?: boolean
          pass_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          track_id?: string
          order?: number
          title?: string
          description?: string | null
          type?: Database["public"]["Enums"]["step_type"]
          content_url?: string | null
          required?: boolean
          pass_score?: number | null
          created_at?: string
        }
      }
      onboarding_tracks: {
        Row: {
          id: string
          department_id: string
          name: string
          description: string | null
          estimated_weeks: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          department_id: string
          name: string
          description?: string | null
          estimated_weeks?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          department_id?: string
          name?: string
          description?: string | null
          estimated_weeks?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      positions: {
        Row: {
          id: string
          name: string
          department_id: string
          description: string | null
          min_volunteers: number
          max_volunteers: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          department_id: string
          description?: string | null
          min_volunteers?: number
          max_volunteers?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          department_id?: string
          description?: string | null
          min_volunteers?: number
          max_volunteers?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          name: string
          phone: string | null
          avatar_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          department_id: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          name: string
          phone?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          department_id?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          department_id?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      prompt_templates: {
        Row: {
          id: string
          name: string
          platform: string
          template: string
          is_default: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          platform: string
          template: string
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          platform?: string
          template?: string
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rota_assignments: {
        Row: {
          id: string
          rota_id: string
          user_id: string
          position_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rota_id: string
          user_id: string
          position_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rota_id?: string
          user_id?: string
          position_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          confirmed_at?: string | null
          created_at?: string
        }
      }
      rotas: {
        Row: {
          id: string
          service_id: string
          date: string
          status: Database["public"]["Enums"]["rota_status"]
          created_by: string
          published_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          date: string
          status?: Database["public"]["Enums"]["rota_status"]
          created_by: string
          published_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          date?: string
          status?: Database["public"]["Enums"]["rota_status"]
          created_by?: string
          published_at?: string | null
          created_at?: string
        }
      }
      rundown_items: {
        Row: {
          id: string
          rundown_id: string
          order: number
          type: Database["public"]["Enums"]["rundown_item_type"]
          title: string
          duration_seconds: number
          start_time: string | null
          notes: string | null
          assigned_to: string | null
          media_url: string | null
          song_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rundown_id: string
          order: number
          type: Database["public"]["Enums"]["rundown_item_type"]
          title: string
          duration_seconds?: number
          start_time?: string | null
          notes?: string | null
          assigned_to?: string | null
          media_url?: string | null
          song_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rundown_id?: string
          order?: number
          type?: Database["public"]["Enums"]["rundown_item_type"]
          title?: string
          duration_seconds?: number
          start_time?: string | null
          notes?: string | null
          assigned_to?: string | null
          media_url?: string | null
          song_id?: string | null
          created_at?: string
        }
      }
      rundowns: {
        Row: {
          id: string
          service_id: string | null
          date: string
          title: string
          version: number
          status: Database["public"]["Enums"]["rundown_status"]
          created_by: string
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id?: string | null
          date: string
          title: string
          version?: number
          status?: Database["public"]["Enums"]["rundown_status"]
          created_by: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string | null
          date?: string
          title?: string
          version?: number
          status?: Database["public"]["Enums"]["rundown_status"]
          created_by?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          day_of_week: number | null
          start_time: string | null
          end_time: string | null
          is_recurring: boolean
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          day_of_week?: number | null
          start_time?: string | null
          end_time?: string | null
          is_recurring?: boolean
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          day_of_week?: number | null
          start_time?: string | null
          end_time?: string | null
          is_recurring?: boolean
          location?: string | null
          created_at?: string
        }
      }
      social_integrations: {
        Row: {
          id: string
          user_id: string
          platform: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          account_id: string | null
          account_name: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          account_id?: string | null
          account_name?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          account_id?: string | null
          account_name?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      social_posts: {
        Row: {
          id: string
          content: string
          media_urls: Json
          platforms: Json
          scheduled_for: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          media_urls?: Json
          platforms?: Json
          scheduled_for?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          media_urls?: Json
          platforms?: Json
          scheduled_for?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string | null
          key: string | null
          tempo: number | null
          ccli_number: string | null
          lyrics: string | null
          chord_chart_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          key?: string | null
          tempo?: number | null
          ccli_number?: string | null
          lyrics?: string | null
          chord_chart_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string | null
          key?: string | null
          tempo?: number | null
          ccli_number?: string | null
          lyrics?: string | null
          chord_chart_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      step_completions: {
        Row: {
          id: string
          volunteer_progress_id: string
          step_id: string
          completed_at: string
          score: number | null
          attempts: number
          mentor_verified_by: string | null
          mentor_verified_at: string | null
        }
        Insert: {
          id?: string
          volunteer_progress_id: string
          step_id: string
          completed_at?: string
          score?: number | null
          attempts?: number
          mentor_verified_by?: string | null
          mentor_verified_at?: string | null
        }
        Update: {
          id?: string
          volunteer_progress_id?: string
          step_id?: string
          completed_at?: string
          score?: number | null
          attempts?: number
          mentor_verified_by?: string | null
          mentor_verified_at?: string | null
        }
      }
      swap_requests: {
        Row: {
          id: string
          original_assignment_id: string
          requester_id: string
          target_user_id: string | null
          status: Database["public"]["Enums"]["swap_status"]
          reason: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          original_assignment_id: string
          requester_id: string
          target_user_id?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          reason?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          original_assignment_id?: string
          requester_id?: string
          target_user_id?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          reason?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      volunteer_progress: {
        Row: {
          id: string
          user_id: string
          track_id: string
          started_at: string
          completed_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          started_at?: string
          completed_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
        }
        Update: {
          id?: string
          user_id?: string
          track_id?: string
          started_at?: string
          completed_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assignment_status: "pending" | "confirmed" | "declined"
      equipment_status: "available" | "in_use" | "maintenance" | "retired"
      maintenance_type: "repair" | "cleaning" | "calibration" | "inspection"
      notification_channel: "email" | "sms"
      notification_status: "pending" | "sent" | "failed" | "read"
      post_status: "draft" | "scheduled" | "published" | "failed"
      progress_status: "in_progress" | "completed" | "abandoned"
      rota_status: "draft" | "published"
      rundown_item_type: "song" | "sermon" | "announcement" | "video" | "prayer" | "transition" | "offering"
      rundown_status: "draft" | "published" | "archived"
      step_type: "video" | "document" | "quiz" | "shadowing" | "practical"
      swap_status: "pending" | "accepted" | "declined" | "approved" | "rejected"
      user_role: "admin" | "leader" | "volunteer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier access
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
