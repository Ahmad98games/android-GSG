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
      messenger_channels: {
        Row: {
          id: string
          name: string
          type: string
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      messenger_messages: {
        Row: {
          id: string
          channel_id: string
          sender_type: string
          sender_id: string
          sender_label: string
          message_type: string
          content_plain: string | null
          content_enc: string | null
          file_url: string | null
          file_name: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          channel_id: string
          sender_type: string
          sender_id: string
          sender_label: string
          message_type?: string
          content_plain?: string | null
          content_enc?: string | null
          file_url?: string | null
          file_name?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          channel_id?: string
          sender_type?: string
          sender_id?: string
          sender_label?: string
          message_type?: string
          content_plain?: string | null
          content_enc?: string | null
          file_url?: string | null
          file_name?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      node_registrations: {
        Row: {
          id: string
          label: string
          node_slot: number
          ip_address: string | null
          public_key_pem: string | null
          last_seen_at: string | null
          battery_pct: number | null
          signal_strength: number | null
          current_screen: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          node_slot: number
          ip_address?: string | null
          public_key_pem?: string | null
          last_seen_at?: string | null
          battery_pct?: number | null
          signal_strength?: number | null
          current_screen?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          node_slot?: number
          ip_address?: string | null
          public_key_pem?: string | null
          last_seen_at?: string | null
          battery_pct?: number | null
          signal_strength?: number | null
          current_screen?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      node_pairing_tokens: {
        Row: {
          id: string
          code: string
          node_slot: number
          role: string
          claimed: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          node_slot: number
          role: string
          claimed?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          node_slot?: number
          role?: string
          claimed?: boolean
          expires_at?: string
          created_at?: string
        }
      }
      broadcast_alerts: {
        Row: {
          id: string
          title: string
          body: string
          severity: string
          sent_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          severity: string
          sent_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          severity?: string
          sent_by?: string
          created_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
