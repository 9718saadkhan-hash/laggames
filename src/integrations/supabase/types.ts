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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      collab_videos: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          platform: string
          source: string
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          url: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          platform?: string
          source?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          url?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          platform?: string
          source?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          url?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_discount: number | null
          max_uses: number | null
          min_order: number | null
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_order?: number | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      customer_activity: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          last_active_at: string
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          last_active_at?: string
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          last_active_at?: string
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deal_games: {
        Row: {
          deal_id: string
          display_order: number
          game_id: string
        }
        Insert: {
          deal_id: string
          display_order?: number
          game_id: string
        }
        Update: {
          deal_id?: string
          display_order?: number
          game_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_games_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          badge: string | null
          created_at: string
          cta_label: string
          cta_link: string | null
          description: string | null
          discount: string | null
          display_order: number
          end_date: string | null
          featured: boolean
          id: string
          image_position: string | null
          image_url: string | null
          show_in_hero: boolean
          slug: string | null
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          badge?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          description?: string | null
          discount?: string | null
          display_order?: number
          end_date?: string | null
          featured?: boolean
          id?: string
          image_position?: string | null
          image_url?: string | null
          show_in_hero?: boolean
          slug?: string | null
          start_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          badge?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          description?: string | null
          discount?: string | null
          display_order?: number
          end_date?: string | null
          featured?: boolean
          id?: string
          image_position?: string | null
          image_url?: string | null
          show_in_hero?: boolean
          slug?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      game_editions: {
        Row: {
          created_at: string
          display_order: number
          game_id: string
          id: string
          name: string
          note: string | null
          old_price: number | null
          price_30: number | null
          price_30_secondary: number | null
          price_60: number | null
          price_60_secondary: number | null
          price_permanent: number | null
          price_permanent_secondary: number | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          game_id: string
          id?: string
          name: string
          note?: string | null
          old_price?: number | null
          price_30?: number | null
          price_30_secondary?: number | null
          price_60?: number | null
          price_60_secondary?: number | null
          price_permanent?: number | null
          price_permanent_secondary?: number | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          game_id?: string
          id?: string
          name?: string
          note?: string | null
          old_price?: number | null
          price_30?: number | null
          price_30_secondary?: number | null
          price_60?: number | null
          price_60_secondary?: number | null
          price_permanent?: number | null
          price_permanent_secondary?: number | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_editions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_media_autofill_history: {
        Row: {
          applied_values: Json
          confidence: number
          created_at: string
          created_by: string | null
          fields: string[]
          game_id: string
          id: string
          match_name: string | null
          operation_id: string
          previous_values: Json
          source: string
          undone_at: string | null
        }
        Insert: {
          applied_values?: Json
          confidence?: number
          created_at?: string
          created_by?: string | null
          fields?: string[]
          game_id: string
          id?: string
          match_name?: string | null
          operation_id?: string
          previous_values?: Json
          source: string
          undone_at?: string | null
        }
        Update: {
          applied_values?: Json
          confidence?: number
          created_at?: string
          created_by?: string | null
          fields?: string[]
          game_id?: string
          id?: string
          match_name?: string | null
          operation_id?: string
          previous_values?: Json
          source?: string
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_media_autofill_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          availability: string
          banner_position: string | null
          banner_url: string | null
          cover_position: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          developer: string | null
          display_order: number | null
          featured: boolean
          gallery: string[]
          game_size: string | null
          genre: string | null
          hot_deal: boolean
          id: string
          igdb_id: number | null
          metadata_fields: Json | null
          metadata_note: string | null
          metadata_source: string | null
          metadata_status: string | null
          metadata_updated_at: string | null
          new_release: boolean
          old_price: number | null
          platform: string
          pre_order: boolean
          price_30: number | null
          price_30_secondary: number | null
          price_60: number | null
          price_60_secondary: number | null
          price_permanent: number | null
          price_permanent_secondary: number | null
          primary_available: boolean
          primary_description: string | null
          publisher: string | null
          rating: number | null
          release_date: string | null
          secondary_available: boolean
          secondary_description: string | null
          short_description: string | null
          slug: string
          title: string
          trailer_url: string | null
          trending: boolean
          updated_at: string
          visible: boolean
        }
        Insert: {
          availability?: string
          banner_position?: string | null
          banner_url?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          display_order?: number | null
          featured?: boolean
          gallery?: string[]
          game_size?: string | null
          genre?: string | null
          hot_deal?: boolean
          id?: string
          igdb_id?: number | null
          metadata_fields?: Json | null
          metadata_note?: string | null
          metadata_source?: string | null
          metadata_status?: string | null
          metadata_updated_at?: string | null
          new_release?: boolean
          old_price?: number | null
          platform?: string
          pre_order?: boolean
          price_30?: number | null
          price_30_secondary?: number | null
          price_60?: number | null
          price_60_secondary?: number | null
          price_permanent?: number | null
          price_permanent_secondary?: number | null
          primary_available?: boolean
          primary_description?: string | null
          publisher?: string | null
          rating?: number | null
          release_date?: string | null
          secondary_available?: boolean
          secondary_description?: string | null
          short_description?: string | null
          slug: string
          title: string
          trailer_url?: string | null
          trending?: boolean
          updated_at?: string
          visible?: boolean
        }
        Update: {
          availability?: string
          banner_position?: string | null
          banner_url?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          display_order?: number | null
          featured?: boolean
          gallery?: string[]
          game_size?: string | null
          genre?: string | null
          hot_deal?: boolean
          id?: string
          igdb_id?: number | null
          metadata_fields?: Json | null
          metadata_note?: string | null
          metadata_source?: string | null
          metadata_status?: string | null
          metadata_updated_at?: string | null
          new_release?: boolean
          old_price?: number | null
          platform?: string
          pre_order?: boolean
          price_30?: number | null
          price_30_secondary?: number | null
          price_60?: number | null
          price_60_secondary?: number | null
          price_permanent?: number | null
          price_permanent_secondary?: number | null
          primary_available?: boolean
          primary_description?: string | null
          publisher?: string | null
          rating?: number | null
          release_date?: string | null
          secondary_available?: boolean
          secondary_description?: string | null
          short_description?: string | null
          slug?: string
          title?: string
          trailer_url?: string | null
          trending?: boolean
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          availability: string | null
          badge: string | null
          created_at: string
          cta_label: string
          cta_link: string | null
          deal_id: string | null
          description: string | null
          discount: string | null
          display_order: number
          game_slug: string | null
          id: string
          image_position: string | null
          image_url: string | null
          platform: string | null
          price_from: number | null
          release_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          availability?: string | null
          badge?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          deal_id?: string | null
          description?: string | null
          discount?: string | null
          display_order?: number
          game_slug?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          platform?: string | null
          price_from?: number | null
          release_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          availability?: string | null
          badge?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          deal_id?: string | null
          description?: string | null
          discount?: string | null
          display_order?: number
          game_slug?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          platform?: string | null
          price_from?: number | null
          release_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hero_banners_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      image_compress_backups: {
        Row: {
          compressed: string
          compressed_bytes: number
          created_at: string
          field: string
          id: string
          original: string
          original_bytes: number
          path: string
          row_key: string
          source_table: string
        }
        Insert: {
          compressed: string
          compressed_bytes: number
          created_at?: string
          field: string
          id?: string
          original: string
          original_bytes: number
          path?: string
          row_key: string
          source_table: string
        }
        Update: {
          compressed?: string
          compressed_bytes?: number
          created_at?: string
          field?: string
          id?: string
          original?: string
          original_bytes?: number
          path?: string
          row_key?: string
          source_table?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          created_at: string
          folder: string
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          name: string
          size: number | null
          storage_path: string | null
          uploaded_by: string | null
          url: string
          usage: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          folder?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          name: string
          size?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          url: string
          usage?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          folder?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          size?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          url?: string
          usage?: string | null
          width?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          duration: string | null
          id: string
          notes: string | null
          option_type: string | null
          order_code: string
          platform: string | null
          price: number | null
          product_id: string | null
          product_name: string
          product_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          duration?: string | null
          id?: string
          notes?: string | null
          option_type?: string | null
          order_code?: string
          platform?: string | null
          price?: number | null
          product_id?: string | null
          product_name: string
          product_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          duration?: string | null
          id?: string
          notes?: string | null
          option_type?: string | null
          order_code?: string
          platform?: string | null
          price?: number | null
          product_id?: string | null
          product_name?: string
          product_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ott_plans: {
        Row: {
          availability: string
          created_at: string
          description: string | null
          display_order: number
          duration: string
          id: string
          image_position: string | null
          logo_url: string | null
          name: string
          old_price: number | null
          plan: string
          price: number | null
          quality: string | null
          screens: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          availability?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration: string
          id?: string
          image_position?: string | null
          logo_url?: string | null
          name: string
          old_price?: number | null
          plan?: string
          price?: number | null
          quality?: string | null
          screens?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          availability?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string
          id?: string
          image_position?: string | null
          logo_url?: string | null
          name?: string
          old_price?: number | null
          plan?: string
          price?: number | null
          quality?: string | null
          screens?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      ps_plus_plans: {
        Row: {
          availability: string
          created_at: string
          description: string | null
          display_order: number
          duration: string
          features: string[]
          id: string
          image_position: string | null
          image_url: string | null
          name: string
          old_price: number | null
          platform: string
          price: number | null
          price_12m: number | null
          price_1m: number | null
          price_3m: number | null
          region: string
          tier: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          availability?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration: string
          features?: string[]
          id?: string
          image_position?: string | null
          image_url?: string | null
          name: string
          old_price?: number | null
          platform?: string
          price?: number | null
          price_12m?: number | null
          price_1m?: number | null
          price_3m?: number | null
          region?: string
          tier?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          availability?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string
          features?: string[]
          id?: string
          image_position?: string | null
          image_url?: string | null
          name?: string
          old_price?: number | null
          platform?: string
          price?: number | null
          price_12m?: number | null
          price_1m?: number | null
          price_3m?: number | null
          region?: string
          tier?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_note: string | null
          avatar_url: string | null
          created_at: string
          featured: boolean
          id: string
          image_position: string | null
          image_url: string | null
          name: string
          rating: number
          review: string
          status: string
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          image_position?: string | null
          image_url?: string | null
          name: string
          rating?: number
          review: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          image_position?: string | null
          image_url?: string | null
          name?: string
          rating?: number
          review?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      upcoming_games: {
        Row: {
          banner_position: string | null
          banner_url: string | null
          cover_position: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          developer: string | null
          display_order: number
          featured: boolean
          gallery: string[]
          genre: string | null
          id: string
          platform: string
          publisher: string | null
          release_date: string | null
          release_note: string | null
          short_description: string | null
          slug: string
          title: string
          trailer_url: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          banner_position?: string | null
          banner_url?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          display_order?: number
          featured?: boolean
          gallery?: string[]
          genre?: string | null
          id?: string
          platform?: string
          publisher?: string | null
          release_date?: string | null
          release_note?: string | null
          short_description?: string | null
          slug: string
          title: string
          trailer_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          banner_position?: string | null
          banner_url?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          display_order?: number
          featured?: boolean
          gallery?: string[]
          genre?: string | null
          id?: string
          platform?: string
          publisher?: string | null
          release_date?: string | null
          release_note?: string | null
          short_description?: string | null
          slug?: string
          title?: string
          trailer_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          code: string
          discount: number
          message: string
        }[]
      }
      game_media_presence: {
        Args: never
        Returns: {
          gallery_count: number
          has_banner: boolean
          has_cover: boolean
          has_trailer: boolean
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          code: string
          discount: number
          message: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
      app_role: ["admin", "customer"],
    },
  },
} as const
