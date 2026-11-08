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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      announcement: {
        Row: {
          body: string
          created_at: string
          creator_id: string
          draft_ends_at: string | null
          draft_starts_at: string | null
          ends_at: string | null
          id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          creator_id: string
          draft_ends_at?: string | null
          draft_starts_at?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_id?: string
          draft_ends_at?: string | null
          draft_starts_at?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
      announcement_attachment: {
        Row: {
          announcement_id: string
          attachment_id: string
        }
        Insert: {
          announcement_id: string
          attachment_id: string
        }
        Update: {
          announcement_id?: string
          attachment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachment_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachment_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_attachment_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_tag: {
        Row: {
          announcement_id: string
          tag_id: string
        }
        Insert: {
          announcement_id: string
          tag_id: string
        }
        Update: {
          announcement_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_tag_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_tag_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment: {
        Row: {
          created_at: string
          creator_id: string | null
          filename: string
          filesize: number
          id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          filename: string
          filesize: number
          id?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          filename?: string
          filesize?: number
          id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "attachment_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
      contact: {
        Row: {
          bio: string | null
          building: string | null
          created_at: string
          creator_id: string
          email: string | null
          id: string
          name: string
          other_contact: string | null
          role_type: Database["public"]["Enums"]["contact_role_type"]
          room: string | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          building?: string | null
          created_at?: string
          creator_id: string
          email?: string | null
          id?: string
          name: string
          other_contact?: string | null
          role_type?: Database["public"]["Enums"]["contact_role_type"]
          room?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          building?: string | null
          created_at?: string
          creator_id?: string
          email?: string | null
          id?: string
          name?: string
          other_contact?: string | null
          role_type?: Database["public"]["Enums"]["contact_role_type"]
          room?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: []
      }
      contact_attachment: {
        Row: {
          attachment_id: string
          contact_id: string
        }
        Insert: {
          attachment_id: string
          contact_id: string
        }
        Update: {
          attachment_id?: string
          contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_attachment_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_attachment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_attachment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tag: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tag_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_attachment: {
        Row: {
          attachment_id: string
          faq_id: string
        }
        Insert: {
          attachment_id: string
          faq_id: string
        }
        Update: {
          attachment_id?: string
          faq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_attachment_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_attachment_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faq_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_attachment_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          faq_id: string
          id: string
          is_staff: boolean
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          faq_id: string
          id?: string
          is_staff?: boolean
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          faq_id?: string
          id?: string
          is_staff?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "faq_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "faq_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "faq_comments_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faq_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_comments_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_tag: {
        Row: {
          faq_id: string
          tag_id: string
        }
        Insert: {
          faq_id: string
          tag_id: string
        }
        Update: {
          faq_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_tag_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faq_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_tag_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answered_by_id: string | null
          created_at: string
          creator_id: string | null
          description: string
          id: string
          is_anonymous: boolean
          question: string
          status: Database["public"]["Enums"]["faq_status"]
          updated_at: string
        }
        Insert: {
          answered_by_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean
          question: string
          status?: Database["public"]["Enums"]["faq_status"]
          updated_at?: string
        }
        Update: {
          answered_by_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean
          question?: string
          status?: Database["public"]["Enums"]["faq_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_link: {
        Row: {
          created_at: string
          creator_id: string
          draft_ends_at: string | null
          draft_starts_at: string | null
          ends_at: string | null
          id: string
          starts_at: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          draft_ends_at?: string | null
          draft_starts_at?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          draft_ends_at?: string | null
          draft_starts_at?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
      resource_link_tag: {
        Row: {
          resource_link_id: string
          tag_id: string
        }
        Insert: {
          resource_link_id: string
          tag_id: string
        }
        Update: {
          resource_link_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_link_tag_resource_link_id_fkey"
            columns: ["resource_link_id"]
            isOneToOne: false
            referencedRelation: "resource_link"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_tag_resource_link_id_fkey"
            columns: ["resource_link_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule: {
        Row: {
          created_at: string
          creator_id: string | null
          description: string | null
          end_time: string
          event_date: string
          id: string
          location: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_time: string
          event_date: string
          id?: string
          location: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_time?: string
          event_date?: string
          id?: string
          location?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "schedule_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
      schedule_tag: {
        Row: {
          schedule_id: string
          tag_id: string
        }
        Insert: {
          schedule_id: string
          tag_id: string
        }
        Update: {
          schedule_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tag_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      tag: {
        Row: {
          category: Database["public"]["Enums"]["tag_category"] | null
          created_at: string
          creator_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["tag_category"] | null
          created_at?: string
          creator_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["tag_category"] | null
          created_at?: string
          creator_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "tag_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
    }
    Views: {
      announcement_with_details: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string | null
          body: string | null
          created_at: string | null
          creator_id: string | null
          draft_ends_at: string | null
          draft_starts_at: string | null
          ends_at: string | null
          id: string | null
          starts_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
      contact_with_details: {
        Row: {
          bio: string | null
          building: string | null
          created_at: string | null
          creator_id: string | null
          email: string | null
          id: string | null
          name: string | null
          other_contact: string | null
          role_type: Database["public"]["Enums"]["contact_role_type"] | null
          room: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          building?: string | null
          created_at?: string | null
          creator_id?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          other_contact?: string | null
          role_type?: Database["public"]["Enums"]["contact_role_type"] | null
          room?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          building?: string | null
          created_at?: string | null
          creator_id?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          other_contact?: string | null
          role_type?: Database["public"]["Enums"]["contact_role_type"] | null
          room?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      faq_with_details: {
        Row: {
          author_email: string | null
          author_name: string | null
          author_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string | null
          is_anonymous: boolean | null
          question: string | null
          status: Database["public"]["Enums"]["faq_status"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      profile_with_auth_user: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      resource_link_with_details: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string | null
          created_at: string | null
          creator_id: string | null
          draft_ends_at: string | null
          draft_starts_at: string | null
          ends_at: string | null
          id: string | null
          starts_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "announcement_with_details"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile_with_auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_link_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "resource_link_with_details"
            referencedColumns: ["author_id"]
          },
        ]
      }
    }
    Functions: {
      hook_validate_signup_email: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "lecturer" | "ta" | "student"
      contact_role_type: "LECTURER" | "TA"
      contact_status: "DRAFT" | "ACTIVE" | "ARCHIVED"
      faq_status: "UNANSWERED" | "ANSWERED" | "RESOLVED"
      tag_category: "year" | "course" | "activity"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "lecturer", "ta", "student"],
      contact_role_type: ["LECTURER", "TA"],
      contact_status: ["DRAFT", "ACTIVE", "ARCHIVED"],
      faq_status: ["UNANSWERED", "ANSWERED", "RESOLVED"],
      tag_category: ["year", "course", "activity"],
    },
  },
} as const
