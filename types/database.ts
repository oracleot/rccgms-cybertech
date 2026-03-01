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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_available: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_available: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_requests: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deliverable_url: string | null
          description: string
          id: string
          internal_notes: string | null
          is_archived: boolean | null
          needed_by: string | null
          priority: Database["public"]["Enums"]["design_priority"]
          reference_urls: Json | null
          request_type:
            | Database["public"]["Enums"]["design_request_type"]
            | null
          requester_email: string | null
          requester_ministry: string | null
          requester_name: string
          requester_phone: string | null
          revision_notes: string | null
          status: Database["public"]["Enums"]["design_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deliverable_url?: string | null
          description: string
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["design_priority"]
          reference_urls?: Json | null
          request_type?:
            | Database["public"]["Enums"]["design_request_type"]
            | null
          requester_email?: string | null
          requester_ministry?: string | null
          requester_name: string
          requester_phone?: string | null
          revision_notes?: string | null
          status?: Database["public"]["Enums"]["design_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deliverable_url?: string | null
          description?: string
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          needed_by?: string | null
          priority?: Database["public"]["Enums"]["design_priority"]
          reference_urls?: Json | null
          request_type?:
            | Database["public"]["Enums"]["design_request_type"]
            | null
          requester_email?: string | null
          requester_ministry?: string | null
          requester_name?: string
          requester_phone?: string | null
          revision_notes?: string | null
          status?: Database["public"]["Enums"]["design_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_requests_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      display_settings: {
        Row: {
          background_color: string
          created_at: string
          font_family: string
          font_size: number
          id: string
          logo_url: string | null
          profile_id: string
          text_color: string
          transition_effect: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          font_family?: string
          font_size?: number
          id?: string
          logo_url?: string | null
          profile_id: string
          text_color?: string
          transition_effect?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          font_family?: string
          font_size?: number
          id?: string
          logo_url?: string | null
          profile_id?: string
          text_color?: string
          transition_effect?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_borrowed: boolean
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          qr_code: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string | null
          warranty_expires: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_borrowed?: boolean
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string | null
          warranty_expires?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_borrowed?: boolean
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string | null
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_checkouts: {
        Row: {
          checked_out_at: string | null
          checked_out_by: string
          condition_on_return: string | null
          equipment_id: string
          expected_return: string
          id: string
          notes: string | null
          returned_at: string | null
        }
        Insert: {
          checked_out_at?: string | null
          checked_out_by: string
          condition_on_return?: string | null
          equipment_id: string
          expected_return: string
          id?: string
          notes?: string | null
          returned_at?: string | null
        }
        Update: {
          checked_out_at?: string | null
          checked_out_by?: string
          condition_on_return?: string | null
          equipment_id?: string
          expected_return?: string
          id?: string
          notes?: string | null
          returned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checkouts_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          cost: number | null
          description: string
          equipment_id: string
          id: string
          next_due: string | null
          performed_at: string | null
          performed_by: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          description: string
          equipment_id: string
          id?: string
          next_due?: string | null
          performed_at?: string | null
          performed_by?: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          description?: string
          equipment_id?: string
          id?: string
          next_due?: string | null
          performed_at?: string | null
          performed_by?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      livestreams: {
        Row: {
          created_at: string | null
          created_by: string
          facebook_description: string | null
          id: string
          metadata: Json | null
          rota_id: string | null
          scripture: string | null
          speaker: string | null
          title: string
          youtube_description: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          facebook_description?: string | null
          id?: string
          metadata?: Json | null
          rota_id?: string | null
          scripture?: string | null
          speaker?: string | null
          title: string
          youtube_description?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          facebook_description?: string | null
          id?: string
          metadata?: Json | null
          rota_id?: string | null
          scripture?: string | null
          speaker?: string | null
          title?: string
          youtube_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestreams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestreams_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean | null
          id: string
          notification_type: string
          reminder_timing: string | null
          sms_enabled: boolean | null
          user_id: string
        }
        Insert: {
          email_enabled?: boolean | null
          id?: string
          notification_type: string
          reminder_timing?: string | null
          sms_enabled?: boolean | null
          user_id: string
        }
        Update: {
          email_enabled?: boolean | null
          id?: string
          notification_type?: string
          reminder_timing?: string | null
          sms_enabled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          data: Json | null
          error_message: string | null
          id: string
          read_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          content_url: string | null
          created_at: string | null
          description: string | null
          id: string
          order: number
          pass_score: number | null
          required: boolean | null
          title: string
          track_id: string
          type: Database["public"]["Enums"]["step_type"]
        }
        Insert: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order: number
          pass_score?: number | null
          required?: boolean | null
          title: string
          track_id: string
          type: Database["public"]["Enums"]["step_type"]
        }
        Update: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          pass_score?: number | null
          required?: boolean | null
          title?: string
          track_id?: string
          type?: Database["public"]["Enums"]["step_type"]
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tracks: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          estimated_weeks: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          description?: string | null
          estimated_weeks?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          description?: string | null
          estimated_weeks?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tracks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          id: string
          max_volunteers: number
          min_volunteers: number
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          description?: string | null
          id?: string
          max_volunteers?: number
          min_volunteers?: number
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          description?: string | null
          id?: string
          max_volunteers?: number
          min_volunteers?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          email: string
          id: string
          name: string
          notification_preferences: Json | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          id?: string
          name: string
          notification_preferences?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          id?: string
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          platform: string
          template: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          platform: string
          template: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          platform?: string
          template?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_assignments: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string
          position_id: string
          rota_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          position_id: string
          rota_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          position_id?: string
          rota_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_assignments_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          created_at: string | null
          created_by: string
          date: string
          id: string
          published_at: string | null
          service_id: string
          status: Database["public"]["Enums"]["rota_status"]
        }
        Insert: {
          created_at?: string | null
          created_by: string
          date: string
          id?: string
          published_at?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["rota_status"]
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date?: string
          id?: string
          published_at?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["rota_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rotas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      rundown_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          duration_seconds: number
          id: string
          media_url: string | null
          notes: string | null
          order: number
          rundown_id: string
          song_id: string | null
          start_time: string | null
          title: string
          type: Database["public"]["Enums"]["rundown_item_type"]
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          media_url?: string | null
          notes?: string | null
          order: number
          rundown_id: string
          song_id?: string | null
          start_time?: string | null
          title: string
          type: Database["public"]["Enums"]["rundown_item_type"]
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          media_url?: string | null
          notes?: string | null
          order?: number
          rundown_id?: string
          song_id?: string | null
          start_time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["rundown_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_rundown_items_song"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rundown_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rundown_items_rundown_id_fkey"
            columns: ["rundown_id"]
            isOneToOne: false
            referencedRelation: "rundowns"
            referencedColumns: ["id"]
          },
        ]
      }
      rundowns: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string
          date: string
          id: string
          service_id: string | null
          status: Database["public"]["Enums"]["rundown_status"]
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          date: string
          id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["rundown_status"]
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          date?: string
          id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["rundown_status"]
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rundowns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rundowns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rundowns_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          location: string | null
          name: string
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name: string
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name?: string
          start_time?: string | null
        }
        Relationships: []
      }
      social_integrations: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          media_urls: Json | null
          platforms: Json | null
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          media_urls?: Json | null
          platforms?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          media_urls?: Json | null
          platforms?: Json | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string | null
          ccli_number: string | null
          chord_chart_url: string | null
          created_at: string | null
          id: string
          key: string | null
          lyrics: string | null
          tempo: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tempo?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          created_at?: string | null
          id?: string
          key?: string | null
          lyrics?: string | null
          tempo?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      step_completions: {
        Row: {
          attempts: number | null
          completed_at: string | null
          id: string
          mentor_verified_at: string | null
          mentor_verified_by: string | null
          score: number | null
          step_id: string
          volunteer_progress_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          mentor_verified_at?: string | null
          mentor_verified_by?: string | null
          score?: number | null
          step_id: string
          volunteer_progress_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          mentor_verified_at?: string | null
          mentor_verified_by?: string | null
          score?: number | null
          step_id?: string
          volunteer_progress_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_completions_mentor_verified_by_fkey"
            columns: ["mentor_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "onboarding_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_completions_volunteer_progress_id_fkey"
            columns: ["volunteer_progress_id"]
            isOneToOne: false
            referencedRelation: "volunteer_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          created_at: string | null
          decline_reason: string | null
          id: string
          original_assignment_id: string
          reason: string | null
          requester_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["swap_status"]
          target_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          decline_reason?: string | null
          id?: string
          original_assignment_id: string
          reason?: string | null
          requester_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          target_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          decline_reason?: string | null
          id?: string
          original_assignment_id?: string
          reason?: string | null
          requester_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["swap_status"]
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_original_assignment_id_fkey"
            columns: ["original_assignment_id"]
            isOneToOne: false
            referencedRelation: "rota_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          department_id: string
          id: string
          is_primary: boolean
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          department_id: string
          id?: string
          is_primary?: boolean
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          department_id?: string
          id?: string
          is_primary?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_progress: {
        Row: {
          completed_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          track_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          track_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_progress_user_id_fkey"
            columns: ["user_id"]
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
      [_ in never]: never
    }
    Enums: {
      assignment_status: "pending" | "confirmed" | "declined"
      design_priority: "low" | "medium" | "high" | "urgent"
      design_request_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "review"
        | "revision_requested"
      design_request_type:
        | "flyer"
        | "banner"
        | "social_graphic"
        | "video_thumbnail"
        | "presentation"
        | "other"
      equipment_status:
        | "available"
        | "in_use"
        | "maintenance"
        | "retired"
        | "returned"
      maintenance_type: "repair" | "cleaning" | "calibration" | "inspection"
      notification_channel: "email" | "sms"
      notification_status: "pending" | "sent" | "failed" | "read"
      post_status: "draft" | "scheduled" | "published" | "failed"
      progress_status: "in_progress" | "completed" | "abandoned"
      rota_status: "draft" | "published"
      rundown_item_type:
        | "song"
        | "sermon"
        | "announcement"
        | "video"
        | "prayer"
        | "transition"
        | "offering"
      rundown_status: "draft" | "published" | "archived"
      step_type: "video" | "document" | "quiz" | "shadowing" | "practical"
      swap_status: "pending" | "accepted" | "declined" | "approved" | "rejected"
      user_role: "admin" | "leader" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_status: ["pending", "confirmed", "declined"],
      design_priority: ["low", "medium", "high", "urgent"],
      design_request_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "review",
        "revision_requested",
      ],
      design_request_type: [
        "flyer",
        "banner",
        "social_graphic",
        "video_thumbnail",
        "presentation",
        "other",
      ],
      equipment_status: [
        "available",
        "in_use",
        "maintenance",
        "retired",
        "returned",
      ],
      maintenance_type: ["repair", "cleaning", "calibration", "inspection"],
      notification_channel: ["email", "sms"],
      notification_status: ["pending", "sent", "failed", "read"],
      post_status: ["draft", "scheduled", "published", "failed"],
      progress_status: ["in_progress", "completed", "abandoned"],
      rota_status: ["draft", "published"],
      rundown_item_type: [
        "song",
        "sermon",
        "announcement",
        "video",
        "prayer",
        "transition",
        "offering",
      ],
      rundown_status: ["draft", "published", "archived"],
      step_type: ["video", "document", "quiz", "shadowing", "practical"],
      swap_status: ["pending", "accepted", "declined", "approved", "rejected"],
      user_role: ["admin", "leader", "member"],
    },
  },
} as const
