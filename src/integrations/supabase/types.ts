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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_student_emails: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          id: string
          notes: string | null
          student_name: string | null
          student_number: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          id?: string
          notes?: string | null
          student_name?: string | null
          student_number?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          id?: string
          notes?: string | null
          student_name?: string | null
          student_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_student_emails_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_attempts: {
        Row: {
          booking_phase: number | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          response_time_ms: number | null
          slot_available_capacity: number | null
          slot_id: string | null
          student_booking_count: number | null
          student_id: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          booking_phase?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          response_time_ms?: number | null
          slot_available_capacity?: number | null
          slot_id?: string | null
          student_booking_count?: number | null
          student_id?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          booking_phase?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          response_time_ms?: number | null
          slot_available_capacity?: number | null
          slot_id?: string | null
          student_booking_count?: number | null
          student_id?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_attempts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "event_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attempts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slot_availability"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "booking_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attended: boolean | null
          booking_phase: number
          cancelled_at: string | null
          cancelled_reason: string | null
          company_notes: string | null
          created_at: string
          feedback: string | null
          id: string
          ip_address: unknown
          rating: number | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          student_notes: string | null
          user_agent: string | null
        }
        Insert: {
          attended?: boolean | null
          booking_phase: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          company_notes?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          ip_address?: unknown
          rating?: number | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: string
          student_notes?: string | null
          user_agent?: string | null
        }
        Update: {
          attended?: boolean | null
          booking_phase?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          company_notes?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          ip_address?: unknown
          rating?: number | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: string
          student_notes?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "event_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slot_availability"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          company_code: string | null
          company_name: string
          company_size: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          industry: string | null
          is_verified: boolean
          logo_url: string | null
          profile_id: string | null
          rejection_reason: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["company_verification_status"]
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          company_code?: string | null
          company_name: string
          company_size?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean
          logo_url?: string | null
          profile_id?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["company_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          company_code?: string | null
          company_name?: string
          company_size?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean
          logo_url?: string | null
          profile_id?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["company_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_config: {
        Row: {
          announcement_message: string | null
          company_registration_deadline: string | null
          created_at: string
          current_phase: number
          emergency_contact_email: string | null
          emergency_contact_phone: string | null
          event_date: string
          event_end_time: string
          event_name: string
          event_start_time: string
          id: number
          phase1_booking_limit: number
          phase1_end: string
          phase1_start: string
          phase2_booking_limit: number
          phase2_end: string
          phase2_start: string
          registration_open: boolean
          slot_buffer_minutes: number
          slot_capacity: number
          slot_duration_minutes: number
          student_registration_deadline: string | null
          updated_at: string
        }
        Insert: {
          announcement_message?: string | null
          company_registration_deadline?: string | null
          created_at?: string
          current_phase?: number
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          event_date: string
          event_end_time?: string
          event_name?: string
          event_start_time?: string
          id?: number
          phase1_booking_limit?: number
          phase1_end: string
          phase1_start: string
          phase2_booking_limit?: number
          phase2_end: string
          phase2_start: string
          registration_open?: boolean
          slot_buffer_minutes?: number
          slot_capacity?: number
          slot_duration_minutes?: number
          student_registration_deadline?: string | null
          updated_at?: string
        }
        Update: {
          announcement_message?: string | null
          company_registration_deadline?: string | null
          created_at?: string
          current_phase?: number
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          event_date?: string
          event_end_time?: string
          event_name?: string
          event_start_time?: string
          id?: number
          phase1_booking_limit?: number
          phase1_end?: string
          phase1_start?: string
          phase2_booking_limit?: number
          phase2_end?: string
          phase2_start?: string
          registration_open?: boolean
          slot_buffer_minutes?: number
          slot_capacity?: number
          slot_duration_minutes?: number
          student_registration_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          booth_location: string | null
          company_id: string
          created_at: string
          event_id: string
          id: string
          invited_at: string
          invited_by: string | null
          notes: string | null
          num_recruiters: number | null
        }
        Insert: {
          booth_location?: string | null
          company_id: string
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          num_recruiters?: number | null
        }
        Update: {
          booth_location?: string | null
          company_id?: string
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          num_recruiters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          event_id: string
          id: string
          notes: string | null
          registered_at: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          event_id: string
          id?: string
          notes?: string | null
          registered_at?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          registered_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule_items: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          event_id: string
          id: string
          is_active: boolean | null
          item_type: string
          location: string | null
          name: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          event_id: string
          id?: string
          is_active?: boolean | null
          item_type?: string
          location?: string | null
          name: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_id?: string
          id?: string
          is_active?: boolean | null
          item_type?: string
          location?: string | null
          name?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_slots: {
        Row: {
          capacity: number
          company_id: string
          created_at: string
          end_time: string
          event_id: string | null
          id: string
          is_active: boolean
          location: string | null
          notes: string | null
          offer_id: string | null
          room_number: string | null
          session_id: string | null
          slot_time: string | null
          start_time: string
        }
        Insert: {
          capacity?: number
          company_id: string
          created_at?: string
          end_time: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          notes?: string | null
          offer_id?: string | null
          room_number?: string | null
          session_id?: string | null
          slot_time?: string | null
          start_time: string
        }
        Update: {
          capacity?: number
          company_id?: string
          created_at?: string
          end_time?: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          notes?: string | null
          offer_id?: string | null
          room_number?: string | null
          session_id?: string | null
          slot_time?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "speed_recruiting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_time_ranges: {
        Row: {
          created_at: string | null
          day_date: string
          end_time: string
          event_id: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_date: string
          end_time: string
          event_id: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_date?: string
          end_time?: string
          event_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_time_ranges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          buffer_minutes: number | null
          created_at: string
          current_phase: number | null
          date: string
          description: string | null
          id: string
          interview_duration_minutes: number | null
          is_active: boolean
          location: string | null
          name: string
          phase_mode: string | null
          phase1_end_date: string | null
          phase1_max_bookings: number | null
          phase1_start_date: string | null
          phase2_end_date: string | null
          phase2_max_bookings: number | null
          phase2_start_date: string | null
          slots_per_time: number | null
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number | null
          created_at?: string
          current_phase?: number | null
          date: string
          description?: string | null
          id?: string
          interview_duration_minutes?: number | null
          is_active?: boolean
          location?: string | null
          name: string
          phase_mode?: string | null
          phase1_end_date?: string | null
          phase1_max_bookings?: number | null
          phase1_start_date?: string | null
          phase2_end_date?: string | null
          phase2_max_bookings?: number | null
          phase2_start_date?: string | null
          slots_per_time?: number | null
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number | null
          created_at?: string
          current_phase?: number | null
          date?: string
          description?: string | null
          id?: string
          interview_duration_minutes?: number | null
          is_active?: boolean
          location?: string | null
          name?: string
          phase_mode?: string | null
          phase1_end_date?: string | null
          phase1_max_bookings?: number | null
          phase1_start_date?: string | null
          phase2_end_date?: string | null
          phase2_max_bookings?: number | null
          phase2_start_date?: string | null
          slots_per_time?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_bookings_deprecated: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          offer_id: string | null
          slot_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          slot_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          slot_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "event_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slot_availability"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "interview_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
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
      offers: {
        Row: {
          benefits: string | null
          company_id: string
          created_at: string
          department: string | null
          description: string
          duration_months: number | null
          event_id: string
          id: string
          interest_tag: Database["public"]["Enums"]["interest_tag"]
          is_active: boolean
          location: string | null
          paid: boolean | null
          remote_possible: boolean | null
          requirements: string | null
          salary_range: string | null
          skills_required: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          benefits?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          description: string
          duration_months?: number | null
          event_id: string
          id?: string
          interest_tag: Database["public"]["Enums"]["interest_tag"]
          is_active?: boolean
          location?: string | null
          paid?: boolean | null
          remote_possible?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          skills_required?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          benefits?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          description?: string
          duration_months?: number | null
          event_id?: string
          id?: string
          interest_tag?: Database["public"]["Enums"]["interest_tag"]
          is_active?: boolean
          location?: string | null
          paid?: boolean | null
          remote_possible?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          skills_required?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_dashboard"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          cv_url: string | null
          email: string
          full_name: string
          graduation_year: number | null
          id: string
          is_deprioritized: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialization: string | null
          student_number: string | null
          updated_at: string
          profile_photo_url: string | null
          languages_spoken: string[] | null
          program: string | null
          biography: string | null
          linkedin_url: string | null
          resume_url: string | null
          year_of_study: number | null
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          email: string
          full_name: string
          graduation_year?: number | null
          id: string
          is_deprioritized?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialization?: string | null
          student_number?: string | null
          updated_at?: string
          profile_photo_url?: string | null
          languages_spoken?: string[] | null
          program?: string | null
          biography?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          year_of_study?: number | null
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          email?: string
          full_name?: string
          graduation_year?: number | null
          id?: string
          is_deprioritized?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialization?: string | null
          student_number?: string | null
          updated_at?: string
          profile_photo_url?: string | null
          languages_spoken?: string[] | null
          program?: string | null
          biography?: string | null
          linkedin_url?: string | null
          resume_url?: string | null
          year_of_study?: number | null
        }
        Relationships: []
      }
      company_representatives: {
        Row: {
          id: string
          company_id: string
          full_name: string
          title: string
          phone: string | null
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          title: string
          phone?: string | null
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          title?: string
          phone?: string | null
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_representatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_recruiting_sessions: {
        Row: {
          buffer_minutes: number
          created_at: string
          end_time: string
          event_id: string
          id: string
          interview_duration_minutes: number
          is_active: boolean | null
          name: string
          slots_per_time: number
          start_time: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          end_time: string
          event_id: string
          id?: string
          interview_duration_minutes?: number
          is_active?: boolean | null
          name: string
          slots_per_time?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          end_time?: string
          event_id?: string
          id?: string
          interview_duration_minutes?: number
          is_active?: boolean | null
          name?: string
          slots_per_time?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_recruiting_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          id: string
          email: string
          ip_address: string
          attempt_time: string
          reason: string | null
        }
        Insert: {
          id?: string
          email: string
          ip_address: string
          attempt_time?: string
          reason?: string | null
        }
        Update: {
          id?: string
          email?: string
          ip_address?: string
          attempt_time?: string
          reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      company_dashboard: {
        Row: {
          active_offers: number | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          is_verified: boolean | null
          profile_id: string | null
          rejection_reason: string | null
          status_message: string | null
          total_bookings: number | null
          total_offers: number | null
          total_slots: number | null
          verification_status:
            | Database["public"]["Enums"]["company_verification_status"]
            | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_availability: {
        Row: {
          available_count: number | null
          booked_count: number | null
          capacity: number | null
          company_id: string | null
          end_time: string | null
          is_available: boolean | null
          offer_id: string | null
          slot_id: string | null
          start_time: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_email_exists: { Args: { p_email: string }; Returns: Json }
      delete_user_account: { Args: never; Returns: undefined }
      fn_add_event_time_range: {
        Args: {
          p_day_date: string
          p_end_time: string
          p_event_id: string
          p_start_time: string
        }
        Returns: string
      }
      fn_auto_transition_event_phases: { Args: never; Returns: undefined }
      fn_book_interview: {
        Args: { p_offer_id: string; p_slot_id: string; p_student_id: string }
        Returns: {
          booking_id: string
          message: string
          success: boolean
        }[]
      }
      fn_cancel_booking: {
        Args: { p_booking_id: string; p_student_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      fn_check_slot_availability: {
        Args: { p_slot_id: string }
        Returns: {
          available_spots: number
          current_bookings: number
          is_available: boolean
          max_capacity: number
        }[]
      }
      fn_check_student_booking_limit: {
        Args: { p_event_id: string; p_student_id: string }
        Returns: {
          can_book: boolean
          current_count: number
          current_phase: number
          max_allowed: number
          message: string
        }[]
      }
      fn_delete_event_time_range: {
        Args: { p_range_id: string }
        Returns: undefined
      }
      fn_generate_event_slots: {
        Args: { p_event_id: string }
        Returns: {
          companies_processed: number
          slots_created: number
          time_ranges_processed: number
        }[]
      }
      fn_generate_slots_for_session: {
        Args: { p_company_id: string; p_session_id: string }
        Returns: number
      }
      fn_get_available_slots: {
        Args: { p_event_id?: string; p_offer_id: string }
        Returns: {
          available_count: number
          booked_count: number
          capacity: number
          event_date: string
          event_name: string
          slot_id: string
          slot_time: string
        }[]
      }
      fn_get_company_analytics: {
        Args: never
        Returns: {
          active_offers: number
          company_id: string
          company_name: string
          confirmed_bookings: number
          is_verified: boolean
          total_bookings: number
          total_offers: number
          unique_students: number
          verification_status: string
        }[]
      }
      fn_get_company_bookings: {
        Args: never
        Returns: {
          booking_id: string
          company_notes: string
          created_at: string
          cv_url: string
          end_time: string
          graduation_year: number
          offer_title: string
          slot_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          student_email: string
          student_name: string
          student_notes: string
          student_phone: string
          student_specialization: string
        }[]
      }
      fn_get_company_registrations: {
        Args: { p_company_id: string }
        Returns: {
          approved_at: string
          event_date: string
          event_id: string
          event_location: string
          event_name: string
          id: string
          notes: string
          registered_at: string
          status: string
        }[]
      }
      fn_get_event_analytics: {
        Args: never
        Returns: {
          available_slots: number
          booked_slots: number
          booking_rate: number
          event_date: string
          event_id: string
          event_name: string
          total_companies: number
          total_offers: number
          total_slots: number
          total_students: number
        }[]
      }
      fn_get_event_registrations: {
        Args: { p_event_id: string }
        Returns: {
          approved_at: string
          approved_by: string
          company_id: string
          company_industry: string
          company_name: string
          company_verification_status: Database["public"]["Enums"]["company_verification_status"]
          contact_email: string
          contact_name: string
          id: string
          notes: string
          registered_at: string
          status: string
        }[]
      }
      fn_get_student_analytics: {
        Args: never
        Returns: {
          avg_bookings_per_student: number
          students_by_graduation_year: Json
          students_by_specialization: Json
          students_with_bookings: number
          total_bookings: number
          total_students: number
        }[]
      }
      fn_get_student_booking_stats: {
        Args: { student_id_param?: string }
        Returns: Json
      }
      fn_get_student_bookings: {
        Args: { p_student_id: string }
        Returns: {
          booking_id: string
          can_cancel: boolean
          company_name: string
          event_name: string
          notes: string
          offer_title: string
          slot_id: string
          slot_time: string
          status: string
        }[]
      }
      fn_manage_event_registration: {
        Args: { p_notes?: string; p_registration_id: string; p_status: string }
        Returns: undefined
      }
      fn_regenerate_event_slots: {
        Args: { p_session_id: string }
        Returns: {
          companies_affected: number
          slots_created: number
        }[]
      }
      fn_regenerate_session_slots: {
        Args: { p_event_id: string }
        Returns: {
          company_count: number
          session_name: string
          slots_per_company: number
          total_slots: number
        }[]
      }
      fn_register_for_event: {
        Args: { p_company_id: string; p_event_id: string }
        Returns: string
      }
      fn_trigger_slot_regeneration: {
        Args: { p_event_id: string }
        Returns: {
          companies_processed: number
          message: string
          slots_created: number
          time_ranges_processed: number
        }[]
      }
      fn_update_event_phase: { Args: { new_phase: number }; Returns: Json }
      fn_verify_company:
        | {
            Args: {
              company_id_to_verify: string
              reason?: string
              verify_status: boolean
            }
            Returns: Json
          }
        | {
            Args: { p_company_id: string; p_is_verified: boolean }
            Returns: undefined
          }
      generate_company_code: {
        Args: { company_name_input: string }
        Returns: string
      }
      get_company_participation_history: {
        Args: { p_company_id: string }
        Returns: {
          booked_slots: number
          event_date: string
          event_id: string
          event_name: string
          invited_at: string
          total_offers: number
          total_slots: number
        }[]
      }
      get_company_quick_invite_history: {
        Args: { p_company_id: string }
        Returns: {
          booked_slots: number
          event_date: string
          event_id: string
          event_name: string
          invited_at: string
          total_offers: number
          total_slots: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_allowed_emails: { Args: { emails_csv: string }; Returns: Json }
      is_email_allowed: { Args: { email_to_check: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          action_type_param: string
          description_param?: string
          new_values_param?: Json
          old_values_param?: Json
          target_id_param?: string
          target_table_param?: string
        }
        Returns: undefined
      }
      quick_invite_company: {
        Args: {
          p_company_name: string
          p_email: string
          p_event_id: string
          p_force_reinvite?: boolean
          p_industry?: string
          p_website?: string
        }
        Returns: Json
      }
      refresh_slot_availability: { Args: never; Returns: undefined }
      search_companies_for_invitation: {
        Args: { event_id_filter?: string; search_query: string }
        Returns: {
          already_invited: boolean
          company_code: string
          company_name: string
          email: string
          id: string
          industry: string
          is_verified: boolean
          last_event_date: string
          last_event_name: string
          total_participations: number
          website: string
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
      fn_record_failed_login: {
        Args: {
          p_email: string
          p_ip_address: string
          p_reason: string
        }
        Returns: undefined
      }
      fn_clear_rate_limit: {
        Args: {
          p_email: string
          p_ip_address: string
        }
        Returns: undefined
      }
      fn_check_rate_limit: {
        Args: {
          p_email: string
          p_ip_address: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          attempt_time: string | null
          attempts: number
        }[]
      }
      fn_delete_event: {
        Args: {
          p_event_id: string
        }
        Returns: {
          bookings_deleted: number
          companies_processed: number
          message: string
          offers_updated: number
          registrations_deleted: number
          sessions_deleted: number
          slots_created: number
          slots_deleted: number
          time_ranges_processed: number
        }[]
      }
      fn_generate_inf_slots: {
        Args: {
          p_event_id: string
          p_session1_end: string
          p_session1_start: string
          p_session2_end: string
          p_session2_start: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      create_profile_for_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "company" | "student"
      booking_status: "confirmed" | "cancelled"
      company_verification_status: "pending" | "verified" | "rejected"
      interest_tag: "Opérationnel" | "Administratif"
      user_role: "student" | "company" | "admin"
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
      app_role: ["admin", "company", "student"],
      booking_status: ["confirmed", "cancelled"],
      company_verification_status: ["pending", "verified", "rejected"],
      interest_tag: ["Opérationnel", "Administratif"],
      user_role: ["student", "company", "admin"],
    },
  },
} as const
