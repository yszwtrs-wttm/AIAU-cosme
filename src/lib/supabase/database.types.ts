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
      maintenance_runs: {
        Row: {
          detail: string | null
          duration_ms: number | null
          finished_at: string | null
          id: number
          ingredients: number | null
          job: string
          products: number | null
          started_at: string
          status: string
        }
        Insert: {
          detail?: string | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: number
          ingredients?: number | null
          job: string
          products?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          detail?: string | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: number
          ingredients?: number | null
          job?: string
          products?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          hex: string
          id: number
          lab: number[] | null
          pos: number
          product_id: number
          shade_name: string
        }
        Insert: {
          hex: string
          id?: never
          lab?: number[] | null
          pos?: number
          product_id: number
          shade_name: string
        }
        Update: {
          hex?: string
          id?: never
          lab?: number[] | null
          pos?: number
          product_id?: number
          shade_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_rating_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_score"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_ranked"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          created_at: string
          id: number
          keyword: string
          note: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          keyword: string
          note?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          keyword?: string
          note?: string | null
          user_id?: string | null
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
      profile_allergens: {
        Row: {
          created_at: string
          ingredient_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          ingredient_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          ingredient_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_allergens_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients_master"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_hue: number
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string
          personal_color: string | null
          skin_tone_hex: string | null
          skin_type: string | null
          stash_public: boolean
          user_id: string
        }
        Insert: {
          avatar_hue?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          handle: string
          personal_color?: string | null
          skin_tone_hex?: string | null
          skin_type?: string | null
          stash_public?: boolean
          user_id: string
        }
        Update: {
          avatar_hue?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          personal_color?: string | null
          skin_tone_hex?: string | null
          skin_type?: string | null
          stash_public?: boolean
          user_id?: string
        }
        Relationships: []
      }
      review_images: {
        Row: {
          created_at: string
          id: number
          path: string
          phash: string | null
          pos: number
          review_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          path: string
          phash?: string | null
          pos?: number
          review_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          path?: string
          phash?: string | null
          pos?: number
          review_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
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
            referencedRelation: "product_score"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "review_investigations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_investigations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_ranked"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: number
          reason: string
          review_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          reason: string
          review_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          reason?: string
          review_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_key: string
          author_name: string
          body: string
          client_hash: string | null
          excluded: boolean
          feel: Json | null
          flags: string[]
          id: number
          image_phash: string | null
          owner_verified: boolean
          posted_at: string
          product_id: number
          rating: number
          report_count: number
          trust_score: number
          user_id: string | null
        }
        Insert: {
          author_key: string
          author_name: string
          body: string
          client_hash?: string | null
          excluded?: boolean
          feel?: Json | null
          flags?: string[]
          id?: never
          image_phash?: string | null
          owner_verified?: boolean
          posted_at?: string
          product_id: number
          rating: number
          report_count?: number
          trust_score?: number
          user_id?: string | null
        }
        Update: {
          author_key?: string
          author_name?: string
          body?: string
          client_hash?: string | null
          excluded?: boolean
          feel?: Json | null
          flags?: string[]
          id?: never
          image_phash?: string | null
          owner_verified?: boolean
          posted_at?: string
          product_id?: number
          rating?: number
          report_count?: number
          trust_score?: number
          user_id?: string | null
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
            referencedRelation: "product_score"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_ranked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          opened_at?: string | null
          product_id: number
          remaining_pct?: number
          source?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          opened_at?: string | null
          product_id?: number
          remaining_pct?: number
          source?: string
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
            referencedRelation: "product_score"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "user_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_ranked"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ingredient_idf_status: {
        Row: {
          detail: string | null
          duration_ms: number | null
          finished_at: string | null
          ingredients: number | null
          products: number | null
          started_at: string | null
          status: string | null
        }
        Relationships: []
      }
      product_feel_summary: {
        Row: {
          feel: Json | null
          feel_count: number | null
          product_id: number | null
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
            referencedRelation: "product_score"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_ranked"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rating_summary: {
        Row: {
          adjusted_rating: number | null
          counted_count: number | null
          excluded_count: number | null
          exclusion_reasons: string[] | null
          owner_count: number | null
          product_id: number | null
          raw_rating: number | null
          review_count: number | null
        }
        Relationships: []
      }
      product_score: {
        Row: {
          adjusted_rating: number | null
          counted_count: number | null
          product_id: number | null
          ranked_rating: number | null
        }
        Relationships: []
      }
      products_ranked: {
        Row: {
          adjusted_rating: number | null
          brand_id: number | null
          category: string | null
          color_hex: string | null
          counted_count: number | null
          created_at: string | null
          id: number | null
          image_url: string | null
          ingredients: string[] | null
          is_mens: boolean | null
          jan: string | null
          name: string | null
          price_yen: number | null
          ranked_rating: number | null
          volume: number | null
          volume_unit: string | null
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
          shade_hex: string
          shade_name: string
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
      find_palette_coverage: {
        Args: { p_max_delta?: number; p_product_id: number }
        Returns: {
          delta_e: number
          owned_hex: string
          owned_label: string
          owned_product_id: number
          owned_shade: string
          pos: number
          shade_hex: string
          shade_name: string
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
      products_min_delta_e: {
        Args: { p_a: number; p_b: number }
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
      refresh_ingredient_idf_logged: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      search_products: {
        Args: {
          p_category?: string
          p_limit?: number
          p_mens?: boolean
          p_q: string
        }
        Returns: {
          product_id: number
          score: number
        }[]
      }
      search_products_page: {
        Args: {
          p_category?: string
          p_limit?: number
          p_mens?: boolean
          p_offset?: number
          p_q?: string
          p_sort?: string
        }
        Returns: {
          avoided: boolean
          brand_name: string
          category: string
          color_hex: string
          id: number
          image_url: string
          ingredients: string[]
          is_mens: boolean
          jan: string
          name: string
          owned: boolean
          price_yen: number
          product_colors: Json
          ranked_rating: number
          total_count: number
          volume: number
          volume_unit: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      suggest_products: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          product_id: number
          sim: number
        }[]
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

