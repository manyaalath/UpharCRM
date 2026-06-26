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
      agents: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      call_feedback: {
        Row: {
          agent_id: string | null
          call_outcome: string
          complaints: string | null
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          remarks: string | null
          suggestions: string | null
        }
        Insert: {
          agent_id?: string | null
          call_outcome: string
          complaints?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          remarks?: string | null
          suggestions?: string | null
        }
        Update: {
          agent_id?: string | null
          call_outcome?: string
          complaints?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          remarks?: string | null
          suggestions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_feedback_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      challan_books: {
        Row: {
          book_id: string
          challan_id: string
          quantity: number
        }
        Insert: {
          book_id: string
          challan_id: string
          quantity?: number
        }
        Update: {
          book_id?: string
          challan_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "challan_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challan_books_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "challans"
            referencedColumns: ["id"]
          },
        ]
      }
      challans: {
        Row: {
          agent_id: string | null
          challan_date: string
          challan_no: string
          created_at: string | null
          id: string
          lead_id: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          challan_date: string
          challan_no: string
          created_at?: string | null
          id?: string
          lead_id: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          challan_date?: string
          challan_no?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challans_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challans_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          id: string
          mobile_no: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mobile_no: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mobile_no?: string
          name?: string
        }
        Relationships: []
      }
      data_entry_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string
          status?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          agent_id: string | null
          challan_id: string | null
          created_at: string | null
          followup_date: string
          id: string
          lead_id: string
          remarks: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          challan_id?: string | null
          created_at?: string | null
          followup_date: string
          id?: string
          lead_id: string
          remarks?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          challan_id?: string | null
          created_at?: string | null
          followup_date?: string
          id?: string
          lead_id?: string
          remarks?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "challans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          institute_id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          institute_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          institute_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institute_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_contacts_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          address_line: string | null
          created_at: string | null
          id: string
          locality: string | null
          location_id: string | null
          name: string
          village_town: string | null
        }
        Insert: {
          address_line?: string | null
          created_at?: string | null
          id?: string
          locality?: string | null
          location_id?: string | null
          name: string
          village_town?: string | null
        }
        Update: {
          address_line?: string | null
          created_at?: string | null
          id?: string
          locality?: string | null
          location_id?: string | null
          name?: string
          village_town?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          institute_contact_id: string
          last_contact_date: string | null
          lead_seq_id: string
          next_followup_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          institute_contact_id: string
          last_contact_date?: string | null
          lead_seq_id: string
          next_followup_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          institute_contact_id?: string
          last_contact_date?: string | null
          lead_seq_id?: string
          next_followup_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_institute_contact_id_fkey"
            columns: ["institute_contact_id"]
            isOneToOne: false
            referencedRelation: "institute_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          district: string
          id: string
          pincode: string
          state: string
        }
        Insert: {
          created_at?: string | null
          district: string
          id?: string
          pincode: string
          state: string
        }
        Update: {
          created_at?: string | null
          district?: string
          id?: string
          pincode?: string
          state?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      specimen_books: {
        Row: {
          book_code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          book_code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          book_code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
