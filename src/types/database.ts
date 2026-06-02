// Auto-generated from Supabase schema
// After deploying migrations, regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'rep' | 'manager' | 'admin' | 'agency_owner'
export type LeadStage = 'new' | 'contacted' | 'quoted' | 'appointment' | 'applied' | 'issued' | 'declined' | 'lost'
export type RecruitStage = 'prospect' | 'contacted' | 'interviewing' | 'contracting' | 'licensed' | 'producing' | 'inactive'
export type CallDisposition = 'no_answer' | 'voicemail' | 'not_interested' | 'callback' | 'appointment_set' | 'sold' | 'wrong_number'
export type TextStatus = 'pending' | 'sent' | 'delivered' | 'replied' | 'opted_out' | 'error'
export type RoutingStrategy = 'direct' | 'round_robin' | 'least_loaded' | 'cap_based'

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: string
          stripe_customer_id: string | null
          settings: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['agencies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['agencies']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          agency_id: string | null
          role: UserRole
          full_name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          manager_id: string | null
          twilio_number: string | null
          daily_dial_goal: number
          daily_close_goal: number
          active: boolean
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      leads: {
        Row: {
          id: string
          agency_id: string | null
          assigned_to: string | null
          first_name: string
          last_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          date_of_birth: string | null
          stage: LeadStage
          lead_score: number
          source: string | null
          product_interest: string | null
          annual_income: number | null
          notes: string | null
          tags: string[]
          google_sheet_row: number | null
          last_contacted: string | null
          next_followup: string | null
          meta_lead_id: string | null
          meta_form_id: string | null
          meta_campaign_id: string | null
          meta_campaign_name: string | null
          meta_adset_id: string | null
          meta_adset_name: string | null
          meta_ad_id: string | null
          meta_page_id: string | null
          fbclid: string | null
          raw_meta_payload: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      daily_activities: {
        Row: {
          id: string
          rep_id: string
          agency_id: string
          date: string
          dials: number
          contacts: number
          appointments: number
          presentations: number
          applications: number
          closes: number
          premium: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_activities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['daily_activities']['Insert']>
      }
      calls: {
        Row: {
          id: string
          agency_id: string | null
          rep_id: string | null
          lead_id: string | null
          twilio_call_sid: string | null
          direction: string
          from_number: string | null
          to_number: string | null
          duration_seconds: number
          disposition: CallDisposition | null
          recording_url: string | null
          transcript: string | null
          ai_summary: string | null
          notes: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['calls']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['calls']['Insert']>
      }
      texts: {
        Row: {
          id: string
          agency_id: string | null
          rep_id: string | null
          lead_id: string | null
          twilio_message_sid: string | null
          direction: string
          from_number: string | null
          to_number: string | null
          body: string
          status: TextStatus
          is_ai_generated: boolean
          sequence_id: string | null
          sequence_step: number | null
          sent_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['texts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['texts']['Insert']>
      }
      text_sequences: {
        Row: {
          id: string
          agency_id: string | null
          name: string
          description: string | null
          trigger: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['text_sequences']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['text_sequences']['Insert']>
      }
      text_sequence_steps: {
        Row: {
          id: string
          sequence_id: string
          step_number: number
          delay_minutes: number
          message_template: string
          ai_personalize: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['text_sequence_steps']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['text_sequence_steps']['Insert']>
      }
      recruits: {
        Row: {
          id: string
          agency_id: string
          recruited_by: string | null
          first_name: string
          last_name: string | null
          phone: string | null
          email: string | null
          stage: RecruitStage
          source: string | null
          current_career: string | null
          desired_income: number | null
          license_state: string | null
          license_number: string | null
          licensed_date: string | null
          notes: string | null
          tags: string[]
          last_contacted: string | null
          next_followup: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recruits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recruits']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          agency_id: string | null
          rep_id: string | null
          lead_id: string | null
          title: string | null
          scheduled_at: string
          duration_minutes: number
          location: string | null
          zoom_link: string | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
      routing_rules: {
        Row: {
          id: string
          agency_id: string
          name: string
          priority: number
          active: boolean
          meta_form_id: string | null
          meta_campaign_id: string | null
          meta_adset_id: string | null
          page_id: string | null
          source: string | null
          strategy: RoutingStrategy
          rep_ids: string[] | null
          direct_rep_id: string | null
          daily_cap: number | null
          auto_sequence_id: string | null
          lead_stage: string
          lead_tags: string[]
          leads_routed: number
          last_routed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['routing_rules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['routing_rules']['Insert']>
      }
      meta_configs: {
        Row: {
          id: string
          agency_id: string
          page_id: string
          page_name: string | null
          app_id: string | null
          access_token: string
          pixel_id: string | null
          capi_access_token: string | null
          verify_token: string
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meta_configs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meta_configs']['Insert']>
      }
      meta_events: {
        Row: {
          id: string
          agency_id: string | null
          lead_id: string | null
          event_name: string
          event_time: string
          event_id: string | null
          pixel_id: string | null
          value: number | null
          currency: string
          sent: boolean
          meta_response: Json | null
          error: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meta_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meta_events']['Insert']>
      }
      sheet_syncs: {
        Row: {
          id: string
          agency_id: string | null
          spreadsheet_id: string
          sheet_name: string
          sync_direction: string
          column_mapping: Json
          last_synced_at: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sheet_syncs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sheet_syncs']['Insert']>
      }
    }
    Views: {
      campaign_performance: {
        Row: {
          agency_id: string | null
          meta_campaign_id: string | null
          meta_campaign_name: string | null
          meta_adset_id: string | null
          meta_adset_name: string | null
          meta_form_id: string | null
          total_leads: number | null
          issued: number | null
          appointments: number | null
          applied: number | null
          close_rate_pct: number | null
          first_lead_at: string | null
          last_lead_at: string | null
        }
      }
    }
    Functions: {
      increment_activity: {
        Args: { p_rep_id: string; p_agency_id: string; p_field: string; p_date?: string }
        Returns: Database['public']['Tables']['daily_activities']['Row']
      }
    }
  }
}
