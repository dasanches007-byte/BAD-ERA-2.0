/**
 * Supabase generated types.
 *
 * DO NOT EDIT BY HAND. Regenerate after any migration:
 *   npm run db:types                       (local validation cluster)
 * or the Supabase MCP `generate_typescript_types` tool against the hosted
 * project. The two output shapes are interchangeable.
 *
 * Generated from the hosted BAD ERA project after migrations 0001-0011.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after_state: Json | null;
          before_state: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          request_id?: string | null;
        };
        Relationships: [];
      };
      bundle_components: {
        Row: {
          bundle_variant_id: string;
          component_variant_id: string;
          created_at: string;
          quantity_required: number;
        };
        Insert: {
          bundle_variant_id: string;
          component_variant_id: string;
          created_at?: string;
          quantity_required: number;
        };
        Update: {
          bundle_variant_id?: string;
          component_variant_id?: string;
          created_at?: string;
          quantity_required?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bundle_components_bundle_variant_id_fkey";
            columns: ["bundle_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bundle_components_component_variant_id_fkey";
            columns: ["component_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          cart_id: string;
          created_at: string;
          id: string;
          quantity: number;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          cart_id: string;
          created_at?: string;
          id?: string;
          quantity: number;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          cart_id?: string;
          created_at?: string;
          id?: string;
          quantity?: number;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          converted_order_id: string | null;
          created_at: string;
          currency: string;
          customer_id: string | null;
          expires_at: string | null;
          id: string;
          metadata: Json;
          session_token: string;
          status: Database["public"]["Enums"]["cart_status"];
          updated_at: string;
        };
        Insert: {
          converted_order_id?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          session_token?: string;
          status?: Database["public"]["Enums"]["cart_status"];
          updated_at?: string;
        };
        Update: {
          converted_order_id?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          session_token?: string;
          status?: Database["public"]["Enums"]["cart_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_converted_order_fk";
            columns: ["converted_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_line_components: {
        Row: {
          checkout_line_id: string;
          component_sku_snapshot: string | null;
          component_title_snapshot: string;
          component_variant_id: string;
          created_at: string;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id: string;
          location_id_snapshot: string | null;
          provider_id_snapshot: string | null;
          quantity_per_parent: number;
          total_quantity: number;
        };
        Insert: {
          checkout_line_id: string;
          component_sku_snapshot?: string | null;
          component_title_snapshot: string;
          component_variant_id: string;
          created_at?: string;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          location_id_snapshot?: string | null;
          provider_id_snapshot?: string | null;
          quantity_per_parent: number;
          total_quantity: number;
        };
        Update: {
          checkout_line_id?: string;
          component_sku_snapshot?: string | null;
          component_title_snapshot?: string;
          component_variant_id?: string;
          created_at?: string;
          fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          location_id_snapshot?: string | null;
          provider_id_snapshot?: string | null;
          quantity_per_parent?: number;
          total_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_line_components_checkout_line_id_fkey";
            columns: ["checkout_line_id"];
            isOneToOne: false;
            referencedRelation: "checkout_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_line_components_component_variant_id_fkey";
            columns: ["component_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_line_components_location_id_snapshot_fkey";
            columns: ["location_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_line_components_provider_id_snapshot_fkey";
            columns: ["provider_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_lines: {
        Row: {
          checkout_session_id: string;
          created_at: string;
          discount_cents: number;
          display_snapshot: Json;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id: string;
          is_bundle: boolean;
          line_key: string;
          line_total_cents: number;
          options_snapshot: Json;
          product_handle_snapshot: string;
          product_id: string;
          product_title_snapshot: string;
          provider_id_snapshot: string | null;
          quantity: number;
          sku_snapshot: string | null;
          source_cart_item_id: string | null;
          tax_cents: number;
          unit_price_cents: number;
          variant_id: string;
          variant_title_snapshot: string;
        };
        Insert: {
          checkout_session_id: string;
          created_at?: string;
          discount_cents?: number;
          display_snapshot?: Json;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          is_bundle?: boolean;
          line_key: string;
          line_total_cents: number;
          options_snapshot?: Json;
          product_handle_snapshot: string;
          product_id: string;
          product_title_snapshot: string;
          provider_id_snapshot?: string | null;
          quantity: number;
          sku_snapshot?: string | null;
          source_cart_item_id?: string | null;
          tax_cents?: number;
          unit_price_cents: number;
          variant_id: string;
          variant_title_snapshot: string;
        };
        Update: {
          checkout_session_id?: string;
          created_at?: string;
          discount_cents?: number;
          display_snapshot?: Json;
          fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          is_bundle?: boolean;
          line_key?: string;
          line_total_cents?: number;
          options_snapshot?: Json;
          product_handle_snapshot?: string;
          product_id?: string;
          product_title_snapshot?: string;
          provider_id_snapshot?: string | null;
          quantity?: number;
          sku_snapshot?: string | null;
          source_cart_item_id?: string | null;
          tax_cents?: number;
          unit_price_cents?: number;
          variant_id?: string;
          variant_title_snapshot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_lines_checkout_session_id_fkey";
            columns: ["checkout_session_id"];
            isOneToOne: false;
            referencedRelation: "checkout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_lines_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_lines_provider_id_snapshot_fkey";
            columns: ["provider_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_lines_source_cart_item_id_fkey";
            columns: ["source_cart_item_id"];
            isOneToOne: false;
            referencedRelation: "cart_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_lines_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_sessions: {
        Row: {
          billing_address_snapshot: Json | null;
          cart_id: string | null;
          checkout_token: string;
          created_at: string;
          currency: string;
          customer_email: string;
          customer_id: string | null;
          customer_phone: string | null;
          customer_snapshot: Json;
          discount_cents: number;
          id: string;
          paid_at: string | null;
          paid_order_id: string | null;
          reservation_expires_at: string;
          shipping_address_snapshot: Json;
          shipping_cents: number;
          shipping_method_snapshot: Json;
          status: Database["public"]["Enums"]["checkout_snapshot_status"];
          stripe_checkout_session_id: string | null;
          stripe_expires_at: string | null;
          stripe_payment_intent_id: string | null;
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          billing_address_snapshot?: Json | null;
          cart_id?: string | null;
          checkout_token?: string;
          created_at?: string;
          currency?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          customer_snapshot?: Json;
          discount_cents?: number;
          id?: string;
          paid_at?: string | null;
          paid_order_id?: string | null;
          reservation_expires_at: string;
          shipping_address_snapshot: Json;
          shipping_cents?: number;
          shipping_method_snapshot?: Json;
          status?: Database["public"]["Enums"]["checkout_snapshot_status"];
          stripe_checkout_session_id?: string | null;
          stripe_expires_at?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents: number;
          tax_cents?: number;
          total_cents: number;
          updated_at?: string;
        };
        Update: {
          billing_address_snapshot?: Json | null;
          cart_id?: string | null;
          checkout_token?: string;
          created_at?: string;
          currency?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          customer_snapshot?: Json;
          discount_cents?: number;
          id?: string;
          paid_at?: string | null;
          paid_order_id?: string | null;
          reservation_expires_at?: string;
          shipping_address_snapshot?: Json;
          shipping_cents?: number;
          shipping_method_snapshot?: Json;
          status?: Database["public"]["Enums"]["checkout_snapshot_status"];
          stripe_checkout_session_id?: string | null;
          stripe_expires_at?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_sessions_paid_order_id_fkey";
            columns: ["paid_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_products: {
        Row: {
          card_media_asset_id: string | null;
          collection_id: string;
          created_at: string;
          hidden: boolean;
          pinned: boolean;
          position: number;
          product_id: string;
        };
        Insert: {
          card_media_asset_id?: string | null;
          collection_id: string;
          created_at?: string;
          hidden?: boolean;
          pinned?: boolean;
          position?: number;
          product_id: string;
        };
        Update: {
          card_media_asset_id?: string | null;
          collection_id?: string;
          created_at?: string;
          hidden?: boolean;
          pinned?: boolean;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_products_card_media_asset_id_fkey";
            columns: ["card_media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          collection_type: string;
          created_at: string;
          description: string | null;
          dynamic_rule: Json | null;
          handle: string;
          hero_media_asset_id: string | null;
          id: string;
          seo_description: string | null;
          seo_title: string | null;
          status: Database["public"]["Enums"]["product_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          collection_type?: string;
          created_at?: string;
          description?: string | null;
          dynamic_rule?: Json | null;
          handle: string;
          hero_media_asset_id?: string | null;
          id?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          status?: Database["public"]["Enums"]["product_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          collection_type?: string;
          created_at?: string;
          description?: string | null;
          dynamic_rule?: Json | null;
          handle?: string;
          hero_media_asset_id?: string | null;
          id?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          status?: Database["public"]["Enums"]["product_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_hero_media_asset_id_fkey";
            columns: ["hero_media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_addresses: {
        Row: {
          city: string;
          company: string | null;
          country_code: string;
          created_at: string;
          customer_id: string;
          id: string;
          is_default_shipping: boolean;
          label: string | null;
          line1: string;
          line2: string | null;
          phone: string | null;
          postal_code: string;
          recipient_name: string;
          region: string;
          updated_at: string;
        };
        Insert: {
          city: string;
          company?: string | null;
          country_code: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          is_default_shipping?: boolean;
          label?: string | null;
          line1: string;
          line2?: string | null;
          phone?: string | null;
          postal_code: string;
          recipient_name: string;
          region: string;
          updated_at?: string;
        };
        Update: {
          city?: string;
          company?: string | null;
          country_code?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          is_default_shipping?: boolean;
          label?: string | null;
          line1?: string;
          line2?: string | null;
          phone?: string | null;
          postal_code?: string;
          recipient_name?: string;
          region?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_fulfillment_consents: {
        Row: {
          consent_type: string;
          customer_response: string;
          evidence_reference: string | null;
          fulfillment_group_id: string | null;
          id: string;
          order_id: string;
          proposed_change: Json;
          recorded_at: string;
          recorded_by: string | null;
        };
        Insert: {
          consent_type: string;
          customer_response: string;
          evidence_reference?: string | null;
          fulfillment_group_id?: string | null;
          id?: string;
          order_id: string;
          proposed_change: Json;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          consent_type?: string;
          customer_response?: string;
          evidence_reference?: string | null;
          fulfillment_group_id?: string | null;
          id?: string;
          order_id?: string;
          proposed_change?: Json;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_fulfillment_consents_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_fulfillment_consents_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          marketing_opt_in: boolean;
          metadata: Json;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          metadata?: Json;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          metadata?: Json;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fulfillment_address_corrections: {
        Row: {
          actor_user_id: string | null;
          corrected_address_snapshot: Json;
          created_at: string;
          fulfillment_group_id: string;
          id: string;
          original_order_address_snapshot: Json;
          reason: string;
        };
        Insert: {
          actor_user_id?: string | null;
          corrected_address_snapshot: Json;
          created_at?: string;
          fulfillment_group_id: string;
          id?: string;
          original_order_address_snapshot: Json;
          reason: string;
        };
        Update: {
          actor_user_id?: string | null;
          corrected_address_snapshot?: Json;
          created_at?: string;
          fulfillment_group_id?: string;
          id?: string;
          original_order_address_snapshot?: Json;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_address_corrections_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_group_items: {
        Row: {
          created_at: string;
          fulfillment_group_id: string;
          id: string;
          order_item_component_id: string | null;
          order_item_id: string;
          quantity_fulfilled: number;
          quantity_required: number;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          fulfillment_group_id: string;
          id?: string;
          order_item_component_id?: string | null;
          order_item_id: string;
          quantity_fulfilled?: number;
          quantity_required: number;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          fulfillment_group_id?: string;
          id?: string;
          order_item_component_id?: string | null;
          order_item_id?: string;
          quantity_fulfilled?: number;
          quantity_required?: number;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_group_items_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_group_items_order_item_component_id_fkey";
            columns: ["order_item_component_id"];
            isOneToOne: false;
            referencedRelation: "order_item_components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_group_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_group_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_groups: {
        Row: {
          accepted_at: string | null;
          actual_cost_cents: number | null;
          auto_submit: boolean;
          cancelled_at: string | null;
          canonical_status: Database["public"]["Enums"]["fulfillment_group_status"];
          created_at: string;
          currency: string;
          delivered_at: string | null;
          effective_shipping_address_snapshot: Json;
          estimated_cost_cents: number | null;
          id: string;
          location_id: string | null;
          order_id: string;
          production_started_at: string | null;
          provider_id: string;
          provider_order_id: string | null;
          raw_provider_status: string | null;
          routing_mode: Database["public"]["Enums"]["fulfillment_routing_mode"];
          shipped_at: string | null;
          submission_key: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          actual_cost_cents?: number | null;
          auto_submit?: boolean;
          cancelled_at?: string | null;
          canonical_status?: Database["public"]["Enums"]["fulfillment_group_status"];
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          effective_shipping_address_snapshot: Json;
          estimated_cost_cents?: number | null;
          id?: string;
          location_id?: string | null;
          order_id: string;
          production_started_at?: string | null;
          provider_id: string;
          provider_order_id?: string | null;
          raw_provider_status?: string | null;
          routing_mode: Database["public"]["Enums"]["fulfillment_routing_mode"];
          shipped_at?: string | null;
          submission_key?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          actual_cost_cents?: number | null;
          auto_submit?: boolean;
          cancelled_at?: string | null;
          canonical_status?: Database["public"]["Enums"]["fulfillment_group_status"];
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          effective_shipping_address_snapshot?: Json;
          estimated_cost_cents?: number | null;
          id?: string;
          location_id?: string | null;
          order_id?: string;
          production_started_at?: string | null;
          provider_id?: string;
          provider_order_id?: string | null;
          raw_provider_status?: string | null;
          routing_mode?: Database["public"]["Enums"]["fulfillment_routing_mode"];
          shipped_at?: string | null;
          submission_key?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_groups_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_groups_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_groups_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_issues: {
        Row: {
          diagnostic_reference: string | null;
          fulfillment_group_id: string;
          id: string;
          issue_code: string;
          last_attempt_at: string | null;
          opened_at: string;
          owner_summary: string;
          provider_id: string;
          resolution_type: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          retryable: boolean;
          severity: Database["public"]["Enums"]["issue_severity"];
        };
        Insert: {
          diagnostic_reference?: string | null;
          fulfillment_group_id: string;
          id?: string;
          issue_code: string;
          last_attempt_at?: string | null;
          opened_at?: string;
          owner_summary: string;
          provider_id: string;
          resolution_type?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          retryable?: boolean;
          severity?: Database["public"]["Enums"]["issue_severity"];
        };
        Update: {
          diagnostic_reference?: string | null;
          fulfillment_group_id?: string;
          id?: string;
          issue_code?: string;
          last_attempt_at?: string | null;
          opened_at?: string;
          owner_summary?: string;
          provider_id?: string;
          resolution_type?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          retryable?: boolean;
          severity?: Database["public"]["Enums"]["issue_severity"];
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_issues_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_issues_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_providers: {
        Row: {
          connection_mode: Database["public"]["Enums"]["provider_connection_mode"];
          contact_email: string | null;
          contact_name: string | null;
          created_at: string;
          credentials_secret_ref: string | null;
          health_status: Database["public"]["Enums"]["provider_health_status"];
          id: string;
          lifecycle_status: Database["public"]["Enums"]["provider_lifecycle_status"];
          name: string;
          ordering_url: string | null;
          provider_key: string;
          provider_type: Database["public"]["Enums"]["provider_type"];
          settings: Json;
          typical_production_max_days: number | null;
          typical_production_min_days: number | null;
          typical_shipping_max_days: number | null;
          typical_shipping_min_days: number | null;
          updated_at: string;
        };
        Insert: {
          connection_mode: Database["public"]["Enums"]["provider_connection_mode"];
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          credentials_secret_ref?: string | null;
          health_status?: Database["public"]["Enums"]["provider_health_status"];
          id?: string;
          lifecycle_status?: Database["public"]["Enums"]["provider_lifecycle_status"];
          name: string;
          ordering_url?: string | null;
          provider_key: string;
          provider_type: Database["public"]["Enums"]["provider_type"];
          settings?: Json;
          typical_production_max_days?: number | null;
          typical_production_min_days?: number | null;
          typical_shipping_max_days?: number | null;
          typical_shipping_min_days?: number | null;
          updated_at?: string;
        };
        Update: {
          connection_mode?: Database["public"]["Enums"]["provider_connection_mode"];
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          credentials_secret_ref?: string | null;
          health_status?: Database["public"]["Enums"]["provider_health_status"];
          id?: string;
          lifecycle_status?: Database["public"]["Enums"]["provider_lifecycle_status"];
          name?: string;
          ordering_url?: string | null;
          provider_key?: string;
          provider_type?: Database["public"]["Enums"]["provider_type"];
          settings?: Json;
          typical_production_max_days?: number | null;
          typical_production_min_days?: number | null;
          typical_shipping_max_days?: number | null;
          typical_shipping_min_days?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fulfillment_recovery_attempts: {
        Row: {
          actor_user_id: string | null;
          attempt_number: number;
          completed_at: string | null;
          error_code: string | null;
          fulfillment_group_id: string;
          id: string;
          issue_id: string;
          operation: string;
          provider_reference: string | null;
          result: Database["public"]["Enums"]["recovery_result"];
          started_at: string;
          submission_key: string;
        };
        Insert: {
          actor_user_id?: string | null;
          attempt_number: number;
          completed_at?: string | null;
          error_code?: string | null;
          fulfillment_group_id: string;
          id?: string;
          issue_id: string;
          operation: string;
          provider_reference?: string | null;
          result?: Database["public"]["Enums"]["recovery_result"];
          started_at?: string;
          submission_key: string;
        };
        Update: {
          actor_user_id?: string | null;
          attempt_number?: number;
          completed_at?: string | null;
          error_code?: string | null;
          fulfillment_group_id?: string;
          id?: string;
          issue_id?: string;
          operation?: string;
          provider_reference?: string | null;
          result?: Database["public"]["Enums"]["recovery_result"];
          started_at?: string;
          submission_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_recovery_attempts_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_recovery_attempts_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_routing_overrides: {
        Row: {
          created_at: string;
          created_by: string | null;
          fulfillment_group_id: string;
          id: string;
          manual_mode: boolean;
          original_provider_id: string;
          override_provider_id: string | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          fulfillment_group_id: string;
          id?: string;
          manual_mode?: boolean;
          original_provider_id: string;
          override_provider_id?: string | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          fulfillment_group_id?: string;
          id?: string;
          manual_mode?: boolean;
          original_provider_id?: string;
          override_provider_id?: string | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_routing_overrides_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_routing_overrides_original_provider_id_fkey";
            columns: ["original_provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_routing_overrides_override_provider_id_fkey";
            columns: ["override_provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      idempotency_records: {
        Row: {
          created_at: string;
          id: string;
          idempotency_key: string;
          reference_id: string | null;
          reference_type: string | null;
          result: Json | null;
          scope: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          idempotency_key: string;
          reference_id?: string | null;
          reference_type?: string | null;
          result?: Json | null;
          scope: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          result?: Json | null;
          scope?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      integration_events: {
        Row: {
          created_at: string;
          direction: string;
          error_message: string | null;
          event_type: string;
          external_event_id: string | null;
          id: string;
          integration_key: string;
          payload_hash: string | null;
          processed_at: string | null;
          reference_id: string | null;
          reference_type: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          direction: string;
          error_message?: string | null;
          event_type: string;
          external_event_id?: string | null;
          id?: string;
          integration_key: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status: string;
        };
        Update: {
          created_at?: string;
          direction?: string;
          error_message?: string | null;
          event_type?: string;
          external_event_id?: string | null;
          id?: string;
          integration_key?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      inventory_levels: {
        Row: {
          available: number | null;
          backordered: number;
          committed: number;
          incoming: number;
          location_id: string;
          on_hand: number;
          unavailable: number;
          updated_at: string;
          variant_id: string;
          version: number;
        };
        Insert: {
          available?: number | null;
          backordered?: number;
          committed?: number;
          incoming?: number;
          location_id: string;
          on_hand?: number;
          unavailable?: number;
          updated_at?: string;
          variant_id: string;
          version?: number;
        };
        Update: {
          available?: number | null;
          backordered?: number;
          committed?: number;
          incoming?: number;
          location_id?: string;
          on_hand?: number;
          unavailable?: number;
          updated_at?: string;
          variant_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_locations: {
        Row: {
          active: boolean;
          address: Json | null;
          code: string;
          created_at: string;
          fulfills_online_orders: boolean;
          id: string;
          name: string;
          provider_id: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: Json | null;
          code: string;
          created_at?: string;
          fulfills_online_orders?: boolean;
          id?: string;
          name: string;
          provider_id?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: Json | null;
          code?: string;
          created_at?: string;
          fulfills_online_orders?: boolean;
          id?: string;
          name?: string;
          provider_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_locations_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          actor_user_id: string | null;
          after_state: Json;
          before_state: Json;
          created_at: string;
          delta_backordered: number;
          delta_committed: number;
          delta_on_hand: number;
          delta_unavailable: number;
          id: string;
          idempotency_key: string | null;
          location_id: string;
          note: string | null;
          reason: Database["public"]["Enums"]["inventory_reason"];
          source_id: string | null;
          source_reference: string | null;
          source_type: string | null;
          variant_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          after_state: Json;
          before_state: Json;
          created_at?: string;
          delta_backordered?: number;
          delta_committed?: number;
          delta_on_hand?: number;
          delta_unavailable?: number;
          id?: string;
          idempotency_key?: string | null;
          location_id: string;
          note?: string | null;
          reason: Database["public"]["Enums"]["inventory_reason"];
          source_id?: string | null;
          source_reference?: string | null;
          source_type?: string | null;
          variant_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          after_state?: Json;
          before_state?: Json;
          created_at?: string;
          delta_backordered?: number;
          delta_committed?: number;
          delta_on_hand?: number;
          delta_unavailable?: number;
          id?: string;
          idempotency_key?: string | null;
          location_id?: string;
          note?: string | null;
          reason?: Database["public"]["Enums"]["inventory_reason"];
          source_id?: string | null;
          source_reference?: string | null;
          source_type?: string | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          cart_id: string | null;
          cart_item_id: string | null;
          checkout_session_id: string | null;
          checkout_token: string;
          converted_at: string | null;
          converted_order_id: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          location_id: string;
          quantity: number;
          released_at: string | null;
          requested_variant_id: string;
          reserved_backordered: number;
          reserved_on_hand: number;
          source_line_key: string;
          status: Database["public"]["Enums"]["reservation_status"];
          stock_variant_id: string;
        };
        Insert: {
          cart_id?: string | null;
          cart_item_id?: string | null;
          checkout_session_id?: string | null;
          checkout_token: string;
          converted_at?: string | null;
          converted_order_id?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          location_id: string;
          quantity: number;
          released_at?: string | null;
          requested_variant_id: string;
          reserved_backordered?: number;
          reserved_on_hand?: number;
          source_line_key: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stock_variant_id: string;
        };
        Update: {
          cart_id?: string | null;
          cart_item_id?: string | null;
          checkout_session_id?: string | null;
          checkout_token?: string;
          converted_at?: string | null;
          converted_order_id?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          location_id?: string;
          quantity?: number;
          released_at?: string | null;
          requested_variant_id?: string;
          reserved_backordered?: number;
          reserved_on_hand?: number;
          source_line_key?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stock_variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_cart_item_id_fkey";
            columns: ["cart_item_id"];
            isOneToOne: false;
            referencedRelation: "cart_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_checkout_session_id_fkey";
            columns: ["checkout_session_id"];
            isOneToOne: false;
            referencedRelation: "checkout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_converted_order_fk";
            columns: ["converted_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_requested_variant_id_fkey";
            columns: ["requested_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_stock_variant_id_fkey";
            columns: ["stock_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      media_asset_usages: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          media_asset_id: string;
          placement_key: string | null;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          media_asset_id: string;
          placement_key?: string | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          media_asset_id?: string;
          placement_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_usages_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          archived_at: string | null;
          bucket: string;
          byte_size: number | null;
          checksum_sha256: string | null;
          created_at: string;
          created_by: string | null;
          duration_ms: number | null;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          metadata: Json;
          mime_type: string | null;
          original_filename: string | null;
          status: Database["public"]["Enums"]["media_status"];
          storage_path: string;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          archived_at?: string | null;
          bucket: string;
          byte_size?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_ms?: number | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          metadata?: Json;
          mime_type?: string | null;
          original_filename?: string | null;
          status?: Database["public"]["Enums"]["media_status"];
          storage_path: string;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          archived_at?: string | null;
          bucket?: string;
          byte_size?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_ms?: number | null;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          metadata?: Json;
          mime_type?: string | null;
          original_filename?: string | null;
          status?: Database["public"]["Enums"]["media_status"];
          storage_path?: string;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [];
      };
      navigation_items: {
        Row: {
          created_at: string;
          destination: string;
          enabled: boolean;
          id: string;
          label: string;
          menu_key: string;
          metadata: Json;
          parent_item_id: string | null;
          position: number;
          revision_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          destination: string;
          enabled?: boolean;
          id?: string;
          label: string;
          menu_key: string;
          metadata?: Json;
          parent_item_id?: string | null;
          position?: number;
          revision_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          destination?: string;
          enabled?: boolean;
          id?: string;
          label?: string;
          menu_key?: string;
          metadata?: Json;
          parent_item_id?: string | null;
          position?: number;
          revision_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_item_id_fkey";
            columns: ["parent_item_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_items_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_components: {
        Row: {
          component_sku_snapshot: string | null;
          component_title_snapshot: string;
          component_variant_id: string;
          created_at: string;
          id: string;
          location_id_snapshot: string | null;
          order_item_id: string;
          provider_id_snapshot: string | null;
          quantity_per_parent: number;
          total_quantity: number;
        };
        Insert: {
          component_sku_snapshot?: string | null;
          component_title_snapshot: string;
          component_variant_id: string;
          created_at?: string;
          id?: string;
          location_id_snapshot?: string | null;
          order_item_id: string;
          provider_id_snapshot?: string | null;
          quantity_per_parent: number;
          total_quantity: number;
        };
        Update: {
          component_sku_snapshot?: string | null;
          component_title_snapshot?: string;
          component_variant_id?: string;
          created_at?: string;
          id?: string;
          location_id_snapshot?: string | null;
          order_item_id?: string;
          provider_id_snapshot?: string | null;
          quantity_per_parent?: number;
          total_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_components_component_variant_id_fkey";
            columns: ["component_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_components_location_id_snapshot_fkey";
            columns: ["location_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_components_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_components_provider_id_snapshot_fkey";
            columns: ["provider_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          discount_cents: number;
          display_snapshot: Json;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id: string;
          is_bundle: boolean;
          line_total_cents: number;
          options_snapshot: Json;
          order_id: string;
          product_handle_snapshot: string;
          product_id: string;
          product_title_snapshot: string;
          provider_id_snapshot: string | null;
          quantity: number;
          sku_snapshot: string | null;
          tax_cents: number;
          unit_price_cents: number;
          variant_id: string;
          variant_title_snapshot: string;
        };
        Insert: {
          created_at?: string;
          discount_cents?: number;
          display_snapshot?: Json;
          fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          is_bundle?: boolean;
          line_total_cents: number;
          options_snapshot?: Json;
          order_id: string;
          product_handle_snapshot: string;
          product_id: string;
          product_title_snapshot: string;
          provider_id_snapshot?: string | null;
          quantity: number;
          sku_snapshot?: string | null;
          tax_cents?: number;
          unit_price_cents: number;
          variant_id: string;
          variant_title_snapshot: string;
        };
        Update: {
          created_at?: string;
          discount_cents?: number;
          display_snapshot?: Json;
          fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
          id?: string;
          is_bundle?: boolean;
          line_total_cents?: number;
          options_snapshot?: Json;
          order_id?: string;
          product_handle_snapshot?: string;
          product_id?: string;
          product_title_snapshot?: string;
          provider_id_snapshot?: string | null;
          quantity?: number;
          sku_snapshot?: string | null;
          tax_cents?: number;
          unit_price_cents?: number;
          variant_id?: string;
          variant_title_snapshot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_provider_id_snapshot_fkey";
            columns: ["provider_id_snapshot"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          billing_address_snapshot: Json | null;
          cancelled_at: string | null;
          cart_id: string | null;
          created_at: string;
          currency: string;
          customer_email: string;
          customer_id: string | null;
          customer_phone: string | null;
          customer_snapshot: Json;
          discount_cents: number;
          fulfillment_status: Database["public"]["Enums"]["order_fulfillment_status"];
          id: string;
          metadata: Json;
          order_number: string;
          paid_at: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          placed_at: string;
          refund_status: Database["public"]["Enums"]["order_refund_status"];
          return_status: Database["public"]["Enums"]["order_return_status"];
          shipping_address_snapshot: Json;
          shipping_cents: number;
          shipping_method_snapshot: Json | null;
          source: Database["public"]["Enums"]["order_source"];
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          billing_address_snapshot?: Json | null;
          cancelled_at?: string | null;
          cart_id?: string | null;
          created_at?: string;
          currency?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          customer_snapshot: Json;
          discount_cents?: number;
          fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"];
          id?: string;
          metadata?: Json;
          order_number?: string;
          paid_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          refund_status?: Database["public"]["Enums"]["order_refund_status"];
          return_status?: Database["public"]["Enums"]["order_return_status"];
          shipping_address_snapshot: Json;
          shipping_cents?: number;
          shipping_method_snapshot?: Json | null;
          source?: Database["public"]["Enums"]["order_source"];
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents: number;
          tax_cents?: number;
          total_cents: number;
          updated_at?: string;
        };
        Update: {
          billing_address_snapshot?: Json | null;
          cancelled_at?: string | null;
          cart_id?: string | null;
          created_at?: string;
          currency?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          customer_snapshot?: Json;
          discount_cents?: number;
          fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"];
          id?: string;
          metadata?: Json;
          order_number?: string;
          paid_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          refund_status?: Database["public"]["Enums"]["order_refund_status"];
          return_status?: Database["public"]["Enums"]["order_return_status"];
          shipping_address_snapshot?: Json;
          shipping_cents?: number;
          shipping_method_snapshot?: Json | null;
          source?: Database["public"]["Enums"]["order_source"];
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: true;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      page_drafts: {
        Row: {
          autosaved_at: string;
          lock_expires_at: string | null;
          locked_by: string | null;
          page_id: string;
          revision_id: string;
        };
        Insert: {
          autosaved_at?: string;
          lock_expires_at?: string | null;
          locked_by?: string | null;
          page_id: string;
          revision_id: string;
        };
        Update: {
          autosaved_at?: string;
          lock_expires_at?: string | null;
          locked_by?: string | null;
          page_id?: string;
          revision_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "page_drafts_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: true;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_drafts_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: true;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      page_revisions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          page_id: string;
          published_at: string | null;
          revision_number: number;
          source_revision_id: string | null;
          state: Database["public"]["Enums"]["revision_state"];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          page_id: string;
          published_at?: string | null;
          revision_number: number;
          source_revision_id?: string | null;
          state?: Database["public"]["Enums"]["revision_state"];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          page_id?: string;
          published_at?: string | null;
          revision_number?: number;
          source_revision_id?: string | null;
          state?: Database["public"]["Enums"]["revision_state"];
        };
        Relationships: [
          {
            foreignKeyName: "page_revisions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_revisions_source_revision_id_fkey";
            columns: ["source_revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      page_sections: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          payload: Json;
          position: number;
          revision_id: string;
          schema_version: number;
          section_key: string;
          section_type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          payload?: Json;
          position?: number;
          revision_id: string;
          schema_version?: number;
          section_key: string;
          section_type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          payload?: Json;
          position?: number;
          revision_id?: string;
          schema_version?: number;
          section_key?: string;
          section_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "page_sections_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_system: boolean;
          page_key: string;
          page_kind: Database["public"]["Enums"]["page_kind"];
          published_revision_id: string | null;
          route: string | null;
          template_key: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_system?: boolean;
          page_key: string;
          page_kind?: Database["public"]["Enums"]["page_kind"];
          published_revision_id?: string | null;
          route?: string | null;
          template_key: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_system?: boolean;
          page_key?: string;
          page_kind?: Database["public"]["Enums"]["page_kind"];
          published_revision_id?: string | null;
          route?: string | null;
          template_key?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pages_published_revision_fk";
            columns: ["published_revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_authorized_cents: number;
          amount_captured_cents: number;
          amount_refunded_cents: number;
          created_at: string;
          currency: string;
          external_payment_intent_id: string | null;
          id: string;
          order_id: string;
          provider: string;
          raw_status: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_authorized_cents?: number;
          amount_captured_cents?: number;
          amount_refunded_cents?: number;
          created_at?: string;
          currency?: string;
          external_payment_intent_id?: string | null;
          id?: string;
          order_id: string;
          provider?: string;
          raw_status?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_authorized_cents?: number;
          amount_captured_cents?: number;
          amount_refunded_cents?: number;
          created_at?: string;
          currency?: string;
          external_payment_intent_id?: string | null;
          id?: string;
          order_id?: string;
          provider?: string;
          raw_status?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_media: {
        Row: {
          created_at: string;
          focal_x: number | null;
          focal_y: number | null;
          id: string;
          media_asset_id: string;
          position: number;
          product_id: string;
          role: string;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          focal_x?: number | null;
          focal_y?: number | null;
          id?: string;
          media_asset_id: string;
          position?: number;
          product_id: string;
          role?: string;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          focal_x?: number | null;
          focal_y?: number | null;
          id?: string;
          media_asset_id?: string;
          position?: number;
          product_id?: string;
          role?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_values: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          position: number;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          position?: number;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          position?: number;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          product_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          active: boolean;
          barcode: string | null;
          compare_at_price_cents: number | null;
          continue_selling_when_out_of_stock: boolean;
          created_at: string;
          currency: string;
          fulfillment_provider_id: string | null;
          id: string;
          inventory_mode: Database["public"]["Enums"]["inventory_mode"];
          is_default: boolean;
          low_stock_threshold: number;
          metadata: Json;
          position: number;
          price_cents: number;
          product_id: string;
          sku: string | null;
          title: string;
          track_inventory: boolean;
          updated_at: string;
          weight_grams: number | null;
        };
        Insert: {
          active?: boolean;
          barcode?: string | null;
          compare_at_price_cents?: number | null;
          continue_selling_when_out_of_stock?: boolean;
          created_at?: string;
          currency?: string;
          fulfillment_provider_id?: string | null;
          id?: string;
          inventory_mode?: Database["public"]["Enums"]["inventory_mode"];
          is_default?: boolean;
          low_stock_threshold?: number;
          metadata?: Json;
          position?: number;
          price_cents: number;
          product_id: string;
          sku?: string | null;
          title: string;
          track_inventory?: boolean;
          updated_at?: string;
          weight_grams?: number | null;
        };
        Update: {
          active?: boolean;
          barcode?: string | null;
          compare_at_price_cents?: number | null;
          continue_selling_when_out_of_stock?: boolean;
          created_at?: string;
          currency?: string;
          fulfillment_provider_id?: string | null;
          id?: string;
          inventory_mode?: Database["public"]["Enums"]["inventory_mode"];
          is_default?: boolean;
          low_stock_threshold?: number;
          metadata?: Json;
          position?: number;
          price_cents?: number;
          product_id?: string;
          sku?: string | null;
          title?: string;
          track_inventory?: boolean;
          updated_at?: string;
          weight_grams?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_fulfillment_provider_id_fkey";
            columns: ["fulfillment_provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          handle: string;
          id: string;
          kind: Database["public"]["Enums"]["product_kind"];
          product_type: string | null;
          requires_shipping: boolean;
          seo_description: string | null;
          seo_title: string | null;
          social_media_asset_id: string | null;
          status: Database["public"]["Enums"]["product_status"];
          subtitle: string | null;
          tags: string[];
          taxable: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          handle: string;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          product_type?: string | null;
          requires_shipping?: boolean;
          seo_description?: string | null;
          seo_title?: string | null;
          social_media_asset_id?: string | null;
          status?: Database["public"]["Enums"]["product_status"];
          subtitle?: string | null;
          tags?: string[];
          taxable?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          handle?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          product_type?: string | null;
          requires_shipping?: boolean;
          seo_description?: string | null;
          seo_title?: string | null;
          social_media_asset_id?: string | null;
          status?: Database["public"]["Enums"]["product_status"];
          subtitle?: string | null;
          tags?: string[];
          taxable?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_social_media_asset_id_fkey";
            columns: ["social_media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_attempts: {
        Row: {
          attempt_number: number;
          completed_at: string | null;
          error_code: string | null;
          error_message: string | null;
          fulfillment_group_id: string;
          id: string;
          operation: string;
          provider_reference: string | null;
          result: Database["public"]["Enums"]["recovery_result"];
          started_at: string;
          submission_key: string;
        };
        Insert: {
          attempt_number: number;
          completed_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          fulfillment_group_id: string;
          id?: string;
          operation: string;
          provider_reference?: string | null;
          result?: Database["public"]["Enums"]["recovery_result"];
          started_at?: string;
          submission_key: string;
        };
        Update: {
          attempt_number?: number;
          completed_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          fulfillment_group_id?: string;
          id?: string;
          operation?: string;
          provider_reference?: string | null;
          result?: Database["public"]["Enums"]["recovery_result"];
          started_at?: string;
          submission_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_attempts_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_events: {
        Row: {
          error_message: string | null;
          event_type: string;
          external_event_id: string | null;
          id: string;
          payload_hash: string | null;
          processed_at: string | null;
          processing_status: string;
          provider_id: string;
          received_at: string;
        };
        Insert: {
          error_message?: string | null;
          event_type: string;
          external_event_id?: string | null;
          id?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          processing_status?: string;
          provider_id: string;
          received_at?: string;
        };
        Update: {
          error_message?: string | null;
          event_type?: string;
          external_event_id?: string | null;
          id?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          processing_status?: string;
          provider_id?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_events_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_variant_availability: {
        Row: {
          checked_at: string;
          is_available: boolean;
          mapping_id: string;
          metadata: Json;
          payload_hash: string | null;
          reported_quantity: number | null;
          sellable_quantity: number | null;
          source_status: string | null;
        };
        Insert: {
          checked_at?: string;
          is_available?: boolean;
          mapping_id: string;
          metadata?: Json;
          payload_hash?: string | null;
          reported_quantity?: number | null;
          sellable_quantity?: number | null;
          source_status?: string | null;
        };
        Update: {
          checked_at?: string;
          is_available?: boolean;
          mapping_id?: string;
          metadata?: Json;
          payload_hash?: string | null;
          reported_quantity?: number | null;
          sellable_quantity?: number | null;
          source_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "provider_variant_availability_mapping_id_fkey";
            columns: ["mapping_id"];
            isOneToOne: true;
            referencedRelation: "provider_variant_mappings";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_variant_mappings: {
        Row: {
          active: boolean;
          auto_submit: boolean;
          availability_mode: Database["public"]["Enums"]["availability_mode"];
          created_at: string;
          currency: string;
          id: string;
          last_synced_at: string | null;
          metadata: Json;
          production_max_days: number | null;
          production_min_days: number | null;
          provider_id: string;
          provider_product_id: string | null;
          provider_variant_id: string | null;
          return_destination_mode: string;
          shipping_max_days: number | null;
          shipping_min_days: number | null;
          stock_buffer: number;
          supplier_cost_cents: number | null;
          supplier_sku: string | null;
          sync_status: Database["public"]["Enums"]["availability_sync_status"];
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          active?: boolean;
          auto_submit?: boolean;
          availability_mode?: Database["public"]["Enums"]["availability_mode"];
          created_at?: string;
          currency?: string;
          id?: string;
          last_synced_at?: string | null;
          metadata?: Json;
          production_max_days?: number | null;
          production_min_days?: number | null;
          provider_id: string;
          provider_product_id?: string | null;
          provider_variant_id?: string | null;
          return_destination_mode?: string;
          shipping_max_days?: number | null;
          shipping_min_days?: number | null;
          stock_buffer?: number;
          supplier_cost_cents?: number | null;
          supplier_sku?: string | null;
          sync_status?: Database["public"]["Enums"]["availability_sync_status"];
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          active?: boolean;
          auto_submit?: boolean;
          availability_mode?: Database["public"]["Enums"]["availability_mode"];
          created_at?: string;
          currency?: string;
          id?: string;
          last_synced_at?: string | null;
          metadata?: Json;
          production_max_days?: number | null;
          production_min_days?: number | null;
          provider_id?: string;
          provider_product_id?: string | null;
          provider_variant_id?: string | null;
          return_destination_mode?: string;
          shipping_max_days?: number | null;
          shipping_min_days?: number | null;
          stock_buffer?: number;
          supplier_cost_cents?: number | null;
          supplier_sku?: string | null;
          sync_status?: Database["public"]["Enums"]["availability_sync_status"];
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_variant_mappings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_variant_mappings_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      publish_set_items: {
        Row: {
          page_id: string;
          previous_revision_id: string | null;
          publish_set_id: string;
          revision_id: string;
        };
        Insert: {
          page_id: string;
          previous_revision_id?: string | null;
          publish_set_id: string;
          revision_id: string;
        };
        Update: {
          page_id?: string;
          previous_revision_id?: string | null;
          publish_set_id?: string;
          revision_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publish_set_items_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publish_set_items_previous_revision_id_fkey";
            columns: ["previous_revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publish_set_items_publish_set_id_fkey";
            columns: ["publish_set_id"];
            isOneToOne: false;
            referencedRelation: "publish_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publish_set_items_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "page_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      publish_sets: {
        Row: {
          created_at: string;
          created_by: string | null;
          failed_at: string | null;
          id: string;
          note: string | null;
          published_at: string | null;
          status: Database["public"]["Enums"]["publish_set_status"];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          failed_at?: string | null;
          id?: string;
          note?: string | null;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["publish_set_status"];
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          failed_at?: string | null;
          id?: string;
          note?: string | null;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["publish_set_status"];
        };
        Relationships: [];
      };
      refund_items: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          order_item_id: string;
          quantity: number;
          refund_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          order_item_id: string;
          quantity: number;
          refund_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          order_item_id?: string;
          quantity?: number;
          refund_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refund_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_items_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "refunds";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          failed_at: string | null;
          id: string;
          initiated_by: string | null;
          order_id: string;
          payment_id: string | null;
          reason: string | null;
          status: Database["public"]["Enums"]["refund_status"];
          stripe_refund_id: string | null;
          succeeded_at: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          failed_at?: string | null;
          id?: string;
          initiated_by?: string | null;
          order_id: string;
          payment_id?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          stripe_refund_id?: string | null;
          succeeded_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          failed_at?: string | null;
          id?: string;
          initiated_by?: string | null;
          order_id?: string;
          payment_id?: string | null;
          reason?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          stripe_refund_id?: string | null;
          succeeded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      return_items: {
        Row: {
          created_at: string;
          destination_location_id: string | null;
          destination_provider_id: string | null;
          disposition: Database["public"]["Enums"]["return_disposition"];
          id: string;
          item_condition: Database["public"]["Enums"]["return_item_condition"];
          notes: string | null;
          order_item_component_id: string | null;
          order_item_id: string;
          quantity: number;
          restocked_at: string | null;
          return_id: string;
        };
        Insert: {
          created_at?: string;
          destination_location_id?: string | null;
          destination_provider_id?: string | null;
          disposition?: Database["public"]["Enums"]["return_disposition"];
          id?: string;
          item_condition?: Database["public"]["Enums"]["return_item_condition"];
          notes?: string | null;
          order_item_component_id?: string | null;
          order_item_id: string;
          quantity: number;
          restocked_at?: string | null;
          return_id: string;
        };
        Update: {
          created_at?: string;
          destination_location_id?: string | null;
          destination_provider_id?: string | null;
          disposition?: Database["public"]["Enums"]["return_disposition"];
          id?: string;
          item_condition?: Database["public"]["Enums"]["return_item_condition"];
          notes?: string | null;
          order_item_component_id?: string | null;
          order_item_id?: string;
          quantity?: number;
          restocked_at?: string | null;
          return_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "return_items_destination_location_id_fkey";
            columns: ["destination_location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_items_destination_provider_id_fkey";
            columns: ["destination_provider_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_items_order_item_component_id_fkey";
            columns: ["order_item_component_id"];
            isOneToOne: false;
            referencedRelation: "order_item_components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "returns";
            referencedColumns: ["id"];
          },
        ];
      };
      returns: {
        Row: {
          approved_at: string | null;
          closed_at: string | null;
          created_at: string;
          customer_id: string | null;
          customer_note: string | null;
          id: string;
          order_id: string;
          reason: string;
          received_at: string | null;
          requested_at: string;
          return_number: string;
          status: Database["public"]["Enums"]["return_status"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_note?: string | null;
          id?: string;
          order_id: string;
          reason: string;
          received_at?: string | null;
          requested_at?: string;
          return_number?: string;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_note?: string | null;
          id?: string;
          order_id?: string;
          reason?: string;
          received_at?: string | null;
          requested_at?: string;
          return_number?: string;
          status?: Database["public"]["Enums"]["return_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_items: {
        Row: {
          fulfillment_group_item_id: string;
          quantity: number;
          shipment_id: string;
        };
        Insert: {
          fulfillment_group_item_id: string;
          quantity: number;
          shipment_id: string;
        };
        Update: {
          fulfillment_group_item_id?: string;
          quantity?: number;
          shipment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_items_fulfillment_group_item_id_fkey";
            columns: ["fulfillment_group_item_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_group_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          carrier: string | null;
          created_at: string;
          delivered_at: string | null;
          fulfillment_group_id: string;
          id: string;
          service_level: string | null;
          shipped_at: string | null;
          status: Database["public"]["Enums"]["shipment_status"];
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
        };
        Insert: {
          carrier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          fulfillment_group_id: string;
          id?: string;
          service_level?: string | null;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Update: {
          carrier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          fulfillment_group_id?: string;
          id?: string;
          service_level?: string | null;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: false;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
          visibility: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
          visibility?: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
          visibility?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          error_message: string | null;
          event_type: string;
          id: string;
          payload_hash: string | null;
          processed_at: string | null;
          processing_status: string;
          received_at: string;
          stripe_event_id: string;
        };
        Insert: {
          error_message?: string | null;
          event_type: string;
          id?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          processing_status?: string;
          received_at?: string;
          stripe_event_id: string;
        };
        Update: {
          error_message?: string | null;
          event_type?: string;
          id?: string;
          payload_hash?: string | null;
          processed_at?: string | null;
          processing_status?: string;
          received_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      studio_users: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string | null;
          role: Database["public"]["Enums"]["studio_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["studio_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string | null;
          role?: Database["public"]["Enums"]["studio_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      supplier_tasks: {
        Row: {
          actual_cost_cents: number | null;
          assigned_to: string | null;
          created_at: string;
          currency: string;
          expected_cost_cents: number | null;
          fulfillment_group_id: string;
          id: string;
          notes: string | null;
          ordering_url_snapshot: string | null;
          status: Database["public"]["Enums"]["supplier_task_status"];
          submitted_at: string | null;
          submitted_by: string | null;
          supplier_reference: string | null;
          updated_at: string;
        };
        Insert: {
          actual_cost_cents?: number | null;
          assigned_to?: string | null;
          created_at?: string;
          currency?: string;
          expected_cost_cents?: number | null;
          fulfillment_group_id: string;
          id?: string;
          notes?: string | null;
          ordering_url_snapshot?: string | null;
          status?: Database["public"]["Enums"]["supplier_task_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          supplier_reference?: string | null;
          updated_at?: string;
        };
        Update: {
          actual_cost_cents?: number | null;
          assigned_to?: string | null;
          created_at?: string;
          currency?: string;
          expected_cost_cents?: number | null;
          fulfillment_group_id?: string;
          id?: string;
          notes?: string | null;
          ordering_url_snapshot?: string | null;
          status?: Database["public"]["Enums"]["supplier_task_status"];
          submitted_at?: string | null;
          submitted_by?: string | null;
          supplier_reference?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_tasks_fulfillment_group_id_fkey";
            columns: ["fulfillment_group_id"];
            isOneToOne: true;
            referencedRelation: "fulfillment_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      support_cases: {
        Row: {
          case_number: string;
          closed_at: string | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          order_id: string | null;
          priority: string;
          status: Database["public"]["Enums"]["support_case_status"];
          subject: string;
          updated_at: string;
        };
        Insert: {
          case_number?: string;
          closed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          order_id?: string | null;
          priority?: string;
          status?: Database["public"]["Enums"]["support_case_status"];
          subject: string;
          updated_at?: string;
        };
        Update: {
          case_number?: string;
          closed_at?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          order_id?: string | null;
          priority?: string;
          status?: Database["public"]["Enums"]["support_case_status"];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_cases_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_cases_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          author_type: Database["public"]["Enums"]["support_author_type"];
          author_user_id: string | null;
          body: string;
          case_id: string;
          created_at: string;
          customer_visible: boolean;
          id: string;
        };
        Insert: {
          author_type: Database["public"]["Enums"]["support_author_type"];
          author_user_id?: string | null;
          body: string;
          case_id: string;
          created_at?: string;
          customer_visible?: boolean;
          id?: string;
        };
        Update: {
          author_type?: Database["public"]["Enums"]["support_author_type"];
          author_user_id?: string | null;
          body?: string;
          case_id?: string;
          created_at?: string;
          customer_visible?: boolean;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "support_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      support_notes: {
        Row: {
          author_user_id: string | null;
          body: string;
          case_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          author_user_id?: string | null;
          body: string;
          case_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          author_user_id?: string | null;
          body?: string;
          case_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_notes_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "support_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_financials: {
        Row: {
          currency: string;
          internal_unit_cost_cents: number | null;
          notes: string | null;
          updated_at: string;
          updated_by: string | null;
          variant_id: string;
        };
        Insert: {
          currency?: string;
          internal_unit_cost_cents?: number | null;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          variant_id: string;
        };
        Update: {
          currency?: string;
          internal_unit_cost_cents?: number | null;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_financials_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_option_values: {
        Row: {
          option_id: string;
          option_value_id: string;
          variant_id: string;
        };
        Insert: {
          option_id: string;
          option_value_id: string;
          variant_id: string;
        };
        Update: {
          option_id?: string;
          option_value_id?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_option_values_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "product_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_option_values_option_value_id_fkey";
            columns: ["option_value_id"];
            isOneToOne: false;
            referencedRelation: "product_option_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_option_values_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_stripe_event: {
        Args: {
          p_event_type: string;
          p_payload_hash?: string;
          p_stripe_event_id: string;
        };
        Returns: boolean;
      };
      convert_paid_checkout: {
        Args: {
          p_checkout_session_id: string;
          p_paid_at?: string;
          p_stripe_checkout_session_id: string;
          p_stripe_payment_intent_id: string;
        };
        Returns: string;
      };
      finish_stripe_event: {
        Args: {
          p_error_message?: string;
          p_processing_status: string;
          p_stripe_event_id: string;
        };
        Returns: undefined;
      };
      mark_checkout_payment_pending: {
        Args: { p_checkout_session_id: string };
        Returns: undefined;
      };
      next_bad_era_order_number: { Args: never; Returns: string };
      next_bad_era_return_number: { Args: never; Returns: string };
      next_bad_era_support_number: { Args: never; Returns: string };
      release_checkout_inventory: {
        Args: {
          p_checkout_session_id: string;
          p_checkout_status?: Database["public"]["Enums"]["checkout_snapshot_status"];
        };
        Returns: Json;
      };
      release_expired_checkout_inventory: {
        Args: { p_limit?: number };
        Returns: number;
      };
      reserve_checkout_inventory: {
        Args: { p_checkout_session_id: string };
        Returns: Json;
      };
      studio_adjust_inventory: {
        Args: {
          p_delta_on_hand: number;
          p_location_id: string;
          p_note?: string;
          p_reason: Database["public"]["Enums"]["inventory_reason"];
          p_variant_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      availability_mode:
        | "api_sync"
        | "webhook_sync"
        | "manual"
        | "made_to_order";
      availability_sync_status: "ok" | "stale" | "error" | "manual";
      cart_status: "active" | "converted" | "abandoned" | "expired";
      checkout_snapshot_status:
        | "prepared"
        | "stripe_created"
        | "payment_pending"
        | "paid"
        | "expired"
        | "payment_failed"
        | "cancelled";
      fulfillment_group_status:
        | "pending_submission"
        | "submitted"
        | "accepted"
        | "in_production"
        | "shipped"
        | "delivered"
        | "action_required"
        | "rejected"
        | "cancelled";
      fulfillment_routing_mode: "internal" | "manual" | "automatic";
      inventory_mode:
        | "stocked"
        | "supplier_stocked"
        | "made_to_order"
        | "manual_supplier"
        | "untracked"
        | "preorder";
      inventory_reason:
        | "initial_stock"
        | "checkout_reserve"
        | "reservation_release"
        | "order_sale"
        | "stock_recount"
        | "found_stock"
        | "damaged"
        | "lost"
        | "return_restock"
        | "manual_correction"
        | "order_correction"
        | "cancellation_release"
        | "backorder_created"
        | "other";
      issue_severity: "info" | "warning" | "critical";
      media_kind: "image" | "video" | "document";
      media_status: "draft" | "approved" | "restricted" | "archived";
      order_fulfillment_status:
        | "unfulfilled"
        | "partial"
        | "fulfilled"
        | "cancelled";
      order_refund_status: "none" | "partial" | "full";
      order_return_status:
        | "none"
        | "requested"
        | "approved"
        | "in_transit"
        | "received"
        | "partial"
        | "returned"
        | "rejected"
        | "closed";
      order_source: "storefront" | "studio" | "import";
      page_kind: "page" | "global";
      payment_status:
        | "pending"
        | "paid"
        | "partially_refunded"
        | "refunded"
        | "failed";
      product_kind: "standard" | "bundle";
      product_status: "draft" | "active" | "archived";
      provider_connection_mode: "internal" | "api" | "manual";
      provider_health_status:
        | "connected"
        | "degraded"
        | "error"
        | "manual"
        | "disabled";
      provider_lifecycle_status:
        | "draft"
        | "sample_testing"
        | "test"
        | "live_manual"
        | "live_automated"
        | "disabled";
      provider_type: "internal" | "api" | "manual";
      publish_set_status: "prepared" | "published" | "failed" | "rolled_back";
      recovery_result:
        | "started"
        | "succeeded"
        | "failed"
        | "no_op"
        | "needs_review";
      refund_status: "pending" | "succeeded" | "failed" | "cancelled";
      reservation_status:
        | "active"
        | "converted"
        | "released"
        | "expired"
        | "payment_pending";
      return_disposition:
        | "restock"
        | "damaged"
        | "nonrestockable"
        | "manual_review";
      return_item_condition: "unopened" | "resellable" | "damaged" | "unknown";
      return_status:
        | "requested"
        | "approved"
        | "rejected"
        | "in_transit"
        | "received"
        | "closed"
        | "cancelled";
      revision_state: "draft" | "published" | "archived";
      shipment_status:
        | "pending"
        | "shipped"
        | "delivered"
        | "exception"
        | "returned";
      studio_role: "owner" | "content" | "fulfillment" | "support";
      supplier_task_status:
        | "required"
        | "in_progress"
        | "submitted"
        | "completed"
        | "cancelled";
      support_author_type: "customer" | "studio_user" | "system";
      support_case_status:
        | "open"
        | "waiting_customer"
        | "waiting_internal"
        | "resolved"
        | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      availability_mode: [
        "api_sync",
        "webhook_sync",
        "manual",
        "made_to_order",
      ],
      availability_sync_status: ["ok", "stale", "error", "manual"],
      cart_status: ["active", "converted", "abandoned", "expired"],
      checkout_snapshot_status: [
        "prepared",
        "stripe_created",
        "payment_pending",
        "paid",
        "expired",
        "payment_failed",
        "cancelled",
      ],
      fulfillment_group_status: [
        "pending_submission",
        "submitted",
        "accepted",
        "in_production",
        "shipped",
        "delivered",
        "action_required",
        "rejected",
        "cancelled",
      ],
      fulfillment_routing_mode: ["internal", "manual", "automatic"],
      inventory_mode: [
        "stocked",
        "supplier_stocked",
        "made_to_order",
        "manual_supplier",
        "untracked",
        "preorder",
      ],
      inventory_reason: [
        "initial_stock",
        "checkout_reserve",
        "reservation_release",
        "order_sale",
        "stock_recount",
        "found_stock",
        "damaged",
        "lost",
        "return_restock",
        "manual_correction",
        "order_correction",
        "cancellation_release",
        "backorder_created",
        "other",
      ],
      issue_severity: ["info", "warning", "critical"],
      media_kind: ["image", "video", "document"],
      media_status: ["draft", "approved", "restricted", "archived"],
      order_fulfillment_status: [
        "unfulfilled",
        "partial",
        "fulfilled",
        "cancelled",
      ],
      order_refund_status: ["none", "partial", "full"],
      order_return_status: [
        "none",
        "requested",
        "approved",
        "in_transit",
        "received",
        "partial",
        "returned",
        "rejected",
        "closed",
      ],
      order_source: ["storefront", "studio", "import"],
      page_kind: ["page", "global"],
      payment_status: [
        "pending",
        "paid",
        "partially_refunded",
        "refunded",
        "failed",
      ],
      product_kind: ["standard", "bundle"],
      product_status: ["draft", "active", "archived"],
      provider_connection_mode: ["internal", "api", "manual"],
      provider_health_status: [
        "connected",
        "degraded",
        "error",
        "manual",
        "disabled",
      ],
      provider_lifecycle_status: [
        "draft",
        "sample_testing",
        "test",
        "live_manual",
        "live_automated",
        "disabled",
      ],
      provider_type: ["internal", "api", "manual"],
      publish_set_status: ["prepared", "published", "failed", "rolled_back"],
      recovery_result: [
        "started",
        "succeeded",
        "failed",
        "no_op",
        "needs_review",
      ],
      refund_status: ["pending", "succeeded", "failed", "cancelled"],
      reservation_status: [
        "active",
        "converted",
        "released",
        "expired",
        "payment_pending",
      ],
      return_disposition: [
        "restock",
        "damaged",
        "nonrestockable",
        "manual_review",
      ],
      return_item_condition: ["unopened", "resellable", "damaged", "unknown"],
      return_status: [
        "requested",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "closed",
        "cancelled",
      ],
      revision_state: ["draft", "published", "archived"],
      shipment_status: [
        "pending",
        "shipped",
        "delivered",
        "exception",
        "returned",
      ],
      studio_role: ["owner", "content", "fulfillment", "support"],
      supplier_task_status: [
        "required",
        "in_progress",
        "submitted",
        "completed",
        "cancelled",
      ],
      support_author_type: ["customer", "studio_user", "system"],
      support_case_status: [
        "open",
        "waiting_customer",
        "waiting_internal",
        "resolved",
        "closed",
      ],
    },
  },
} as const;
