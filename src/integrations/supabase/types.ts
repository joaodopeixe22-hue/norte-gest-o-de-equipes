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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          pinned: boolean
          team_id: string | null
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          team_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          daily_goal_bonus: number
          id: boolean
          updated_at: string
          workspace_name: string
        }
        Insert: {
          daily_goal_bonus?: number
          id?: boolean
          updated_at?: string
          workspace_name?: string
        }
        Update: {
          daily_goal_bonus?: number
          id?: boolean
          updated_at?: string
          workspace_name?: string
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["entry_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entry_values: {
        Row: {
          entry_id: string
          id: string
          kpi_id: string
          original_value: number | null
          value: number
        }
        Insert: {
          entry_id: string
          id?: string
          kpi_id: string
          original_value?: number | null
          value: number
        }
        Update: {
          entry_id?: string
          id?: string
          kpi_id?: string
          original_value?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_entry_values_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entry_values_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          ends_at: string | null
          id: string
          owner_id: string
          starts_at: string
          team_id: string | null
          title: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          owner_id?: string
          starts_at: string
          team_id?: string | null
          title: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          owner_id?: string
          starts_at?: string
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          created_at: string
          default_daily_goal: number
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          points_per_unit: number
          sort_order: number
          unit: string
        }
        Insert: {
          created_at?: string
          default_daily_goal?: number
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          points_per_unit?: number
          sort_order?: number
          unit?: string
        }
        Update: {
          created_at?: string
          default_daily_goal?: number
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          points_per_unit?: number
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      kpi_goals: {
        Row: {
          created_at: string
          daily_goal: number
          id: string
          kpi_id: string
          scope: Database["public"]["Enums"]["goal_scope"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          daily_goal: number
          id?: string
          kpi_id: string
          scope: Database["public"]["Enums"]["goal_scope"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          daily_goal?: number
          id?: string
          kpi_id?: string
          scope?: Database["public"]["Enums"]["goal_scope"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_goals_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
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
      points_ledger: {
        Row: {
          created_at: string
          description: string
          id: string
          points: number
          ref_date: string
          source_id: string | null
          source_type: Database["public"]["Enums"]["points_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          points: number
          ref_date: string
          source_id?: string | null
          source_type: Database["public"]["Enums"]["points_source"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          points?: number
          ref_date?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["points_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          matricula: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          matricula: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          matricula?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string
          created_at: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_manager_fk"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      daily_goal_for: { Args: { _kpi: string; _user: string }; Returns: number }
      expected_days: { Args: { _end: string; _start: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      kpi_progress: {
        Args: { _end: string; _start: string; _user: string }
        Returns: {
          daily_goal: number
          goal: number
          key: string
          kpi_id: string
          name: string
          sort_order: number
          total: number
          unit: string
        }[]
      }
      kpi_series: {
        Args: { _end: string; _start: string; _user: string }
        Returns: {
          entry_date: string
          kpi_id: string
          value: number
        }[]
      }
      manages_team: { Args: { _team: string; _uid: string }; Returns: boolean }
      manages_user: {
        Args: { _manager: string; _target: string }
        Returns: boolean
      }
      my_day_summary: { Args: { _date: string }; Returns: Json }
      my_team_id: { Args: never; Returns: string }
      ranking: { Args: { _end: string; _start: string }; Returns: Json }
      reopen_daily_entry: { Args: { _entry: string }; Returns: undefined }
      review_daily_entry: {
        Args: {
          _approve: boolean
          _entry: string
          _note?: string
          _values?: Json
        }
        Returns: undefined
      }
      sp_today: { Args: never; Returns: string }
      submit_daily_entry: {
        Args: { _date: string; _values: Json }
        Returns: string
      }
      team_weekly: {
        Args: { _team: string; _weeks?: number }
        Returns: {
          points: number
          week_start: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "colaborador"
      entry_status: "pending" | "approved" | "rejected"
      goal_scope: "global" | "team" | "user"
      points_source: "kpi" | "goal_bonus" | "achievement" | "adjustment"
      task_priority: "baixa" | "media" | "alta"
      task_status: "aberta" | "concluida"
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
      app_role: ["admin", "gerente", "colaborador"],
      entry_status: ["pending", "approved", "rejected"],
      goal_scope: ["global", "team", "user"],
      points_source: ["kpi", "goal_bonus", "achievement", "adjustment"],
      task_priority: ["baixa", "media", "alta"],
      task_status: ["aberta", "concluida"],
    },
  },
} as const
