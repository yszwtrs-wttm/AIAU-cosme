export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      brands: {
        Row: {
          id: number
          is_demo: boolean
          name: string
        }
        Insert: {
          id?: never
          is_demo?: boolean
          name: string
        }
        Update: {
          id?: never
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      ingredients_master: {
        Row: {
          df: number
          dim: number
          functions: string[]
          hazard_tags: string[]
          id: number
          idf: number
          inci: string
          name_ja: string | null
        }
        Insert: {
          df?: number
          dim: number
          functions?: string[]
          hazard_tags?: string[]
          id?: never
          idf?: number
          inci: string
          name_ja?: string | null
        }
        Update: {
          df?: number
          dim?: number
          functions?: string[]
          hazard_tags?: string[]
          id?: never
          idf?: number
          inci?: string
          name_ja?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand_id: number
          category: string
          color_hex: string | null
          color_lab: number[] | null
          created_at: string
          id: number
          image_url: string | null
          ingredient_vec: string | null
          ingredients: string[]
          is_mens: boolean
          jan: string | null
          name: string
          price_yen: number
          volume: number | null
          volume_unit: string | null
        }
        Insert: {
          brand_id: number
          category: string
          color_hex?: string | null
          color_lab?: number[] | null
          created_at?: string
          id?: never
          image_url?: string | null
          ingredient_vec?: string | null
          ingredients?: string[]
          is_mens?: boolean
          jan?: string | null
          name: string
          price_yen: number
          volume?: number | null
          volume_unit?: string | null
        }
        Update: {
          brand_id?: number
          category?: string
          color_hex?: string | null
          color_lab?: number[] | null
          created_at?: string
          id?: never
          image_url?: string | null
          ingredient_vec?: string | null
          ingredients?: string[]
          is_mens?: boolean
          jan?: string | null
          name?: string
          price_yen?: number
          volume?: number | null
          volume_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      review_investigations: {
        Row: {
          created_at: string
          id: number
          product_id: number
          report: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          product_id: number
          report?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: never
          product_id?: number
          report?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_investigations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_rating_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "review_investigations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_key: string
          author_name: string
          body: string
          excluded: boolean
          flags: string[]
          id: number
          image_phash: string | null
          posted_at: string
          product_id: number
          rating: number
          trust_score: number
        }
        Insert: {
          author_key: string
          author_name: string
          body: string
          excluded?: boolean
          flags?: string[]
          id?: never
          image_phash?: string | null
          posted_at?: string
          product_id: number
          rating: number
          trust_score?: number
        }
        Update: {
          author_key?: string
          author_name?: string
          body?: string
          excluded?: boolean
          flags?: string[]
          id?: never
          image_phash?: string | null
          posted_at?: string
          product_id?: number
          rating?: number
          trust_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_rating_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          created_at: string
          id: number
          opened_at: string | null
          product_id: number
          remaining_pct: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          opened_at?: string | null
          product_id: number
          remaining_pct?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          opened_at?: string | null
          product_id?: number
          remaining_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_rating_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "user_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_rating_summary: {
        Row: {
          adjusted_rating: number | null
          excluded_count: number | null
          exclusion_reasons: string[] | null
          product_id: number | null
          raw_rating: number | null
          review_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      build_ingredient_vec: {
        Args: { p_ingredients: string[] }
        Returns: string
      }
      dupe_score: {
        Args: { delta_e: number; ing_sim: number }
        Returns: number
      }
      find_by_color: {
        Args: { p_category?: string; p_lab: number[]; p_limit?: number }
        Returns: {
          brand: string
          category: string
          color_hex: string
          delta_e: number
          image_url: string
          name: string
          price_yen: number
          product_id: number
        }[]
      }
      find_cheaper_dupes: {
        Args: { p_limit?: number; p_min_score?: number; p_product_id: number }
        Returns: {
          brand: string
          color_hex: string
          delta_e: number
          image_url: string
          ing_sim: number
          name: string
          price_yen: number
          product_id: number
          savings: number
          score: number
        }[]
      }
      find_duplicates_in_stash: {
        Args: { p_min_score?: number; p_product_id: number }
        Returns: {
          brand: string
          category: string
          color_hex: string
          delta_e: number
          image_url: string
          ing_sim: number
          name: string
          price_diff: number
          price_yen: number
          product_id: number
          score: number
        }[]
      }
      find_stash_overlaps: {
        Args: { p_min_score?: number }
        Returns: {
          a_hex: string
          a_id: number
          a_label: string
          a_price: number
          b_hex: string
          b_id: number
          b_label: string
          b_price: number
          delta_e: number
          ing_sim: number
          score: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hex_to_lab: {
        Args: { p_hex: string }
        Returns: number[]
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      lab_delta_e: {
        Args: { lab1: number[]; lab2: number[] }
        Returns: number
      }
      mod_deg: {
        Args: { x: number }
        Returns: number
      }
      recompute_review_trust: {
        Args: { p_product_id: number }
        Returns: undefined
      }
      refresh_ingredient_idf: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

