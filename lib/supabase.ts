import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'student' | 'lecturer' | 'admin'
          first_name: string
          last_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'student' | 'lecturer' | 'admin'
          first_name: string
          last_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'student' | 'lecturer' | 'admin'
          first_name?: string
          last_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      student_profiles: {
        Row: {
          id: string
          enrollment_year: number
          completion_year: number
          contact_info: any
          date_of_birth: string
          transcript_urls: string[]
          cv_url: string | null
          photo_url: string | null
        }
        Insert: {
          id: string
          enrollment_year: number
          completion_year: number
          contact_info: any
          date_of_birth: string
          transcript_urls: string[]
          cv_url?: string | null
          photo_url?: string | null
        }
        Update: {
          id?: string
          enrollment_year?: number
          completion_year?: number
          contact_info?: any
          date_of_birth?: string
          transcript_urls?: string[]
          cv_url?: string | null
          photo_url?: string | null
        }
      }
      lecturer_profiles: {
        Row: {
          id: string
          staff_number: string
          department: string
          affiliated_departments: string[] | null
          employment_year: number
          rank: string
          notification_preferences: any
          payment_details: any | null
        }
        Insert: {
          id: string
          staff_number: string
          department: string
          affiliated_departments?: string[] | null
          employment_year: number
          rank: string
          notification_preferences: any
          payment_details?: any | null
        }
        Update: {
          id?: string
          staff_number?: string
          department?: string
          affiliated_departments?: string[] | null
          employment_year?: number
          rank?: string
          notification_preferences?: any
          payment_details?: any | null
        }
      }
      requests: {
        Row: {
          id: string
          student_id: string
          purpose: 'school' | 'scholarship' | 'job'
          details: any
          lecturer_ids: string[]
          document_urls: string[]
          draft_letter: string | null
          additional_notes: string | null
          deadline: string
          status: string
          payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          purpose: 'school' | 'scholarship' | 'job'
          details: any
          lecturer_ids: string[]
          document_urls: string[]
          draft_letter?: string | null
          additional_notes?: string | null
          deadline: string
          status?: string
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          purpose?: 'school' | 'scholarship' | 'job'
          details?: any
          lecturer_ids?: string[]
          document_urls?: string[]
          draft_letter?: string | null
          additional_notes?: string | null
          deadline?: string
          status?: string
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      letters: {
        Row: {
          id: string
          request_id: string
          lecturer_id: string
          content: string
          attribute_ratings: any | null
          ai_generated: boolean
          submitted_at: string | null
          declaration_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          lecturer_id: string
          content: string
          attribute_ratings?: any | null
          ai_generated?: boolean
          submitted_at?: string | null
          declaration_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          lecturer_id?: string
          content?: string
          attribute_ratings?: any | null
          ai_generated?: boolean
          submitted_at?: string | null
          declaration_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          student_id: string
          request_id: string
          amount: number
          currency: string
          status: string
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          request_id: string
          amount: number
          currency?: string
          status?: string
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          request_id?: string
          amount?: number
          currency?: string
          status?: string
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tokens: {
        Row: {
          id: string
          code: string
          value: number
          expiry_date: string
          created_by: string
          used_by: string | null
          used_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          value: number
          expiry_date: string
          created_by: string
          used_by?: string | null
          used_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          value?: number
          expiry_date?: string
          created_by?: string
          used_by?: string | null
          used_date?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          data: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          data?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          data?: any | null
          created_at?: string
        }
      }
      complaints: {
        Row: {
          id: string
          student_id: string
          request_id: string | null
          lecturer_id: string | null
          type: 'request_issue' | 'lecturer_issue' | 'payment_issue' | 'technical_issue' | 'other'
          subject: string
          description: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to: string | null
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          request_id?: string | null
          lecturer_id?: string | null
          type: 'request_issue' | 'lecturer_issue' | 'payment_issue' | 'technical_issue' | 'other'
          subject: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          request_id?: string | null
          lecturer_id?: string | null
          type?: 'request_issue' | 'lecturer_issue' | 'payment_issue' | 'technical_issue' | 'other'
          subject?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: any | null
          new_values: any | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
