/**
 * AUTO-GENERATED. DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   npm run db:types
 *
 * Source: BAD ERA Supabase schema, migrations 0001-0010.
 * Tables: 62. Enums: 36.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
    audit_events: {
      Row: {
        id: string;
        actor_user_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        request_id: string | null;
        before_state: Json | null;
        after_state: Json | null;
        metadata: Json;
        created_at: string;
      };
      Insert: {
        id?: string;
        actor_user_id?: string | null;
        action: string;
        entity_type: string;
        entity_id?: string | null;
        request_id?: string | null;
        before_state?: Json | null;
        after_state?: Json | null;
        metadata?: Json;
        created_at?: string;
      };
      Update: {
        id?: string;
        actor_user_id?: string | null;
        action?: string;
        entity_type?: string;
        entity_id?: string | null;
        request_id?: string | null;
        before_state?: Json | null;
        after_state?: Json | null;
        metadata?: Json;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "audit_events_actor_user_id_fkey";
          columns: ["actor_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    bundle_components: {
      Row: {
        bundle_variant_id: string;
        component_variant_id: string;
        quantity_required: number;
        created_at: string;
      };
      Insert: {
        bundle_variant_id: string;
        component_variant_id: string;
        quantity_required: number;
        created_at?: string;
      };
      Update: {
        bundle_variant_id?: string;
        component_variant_id?: string;
        quantity_required?: number;
        created_at?: string;
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
        }
      ];
    };
    cart_items: {
      Row: {
        id: string;
        cart_id: string;
        variant_id: string;
        quantity: number;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        cart_id: string;
        variant_id: string;
        quantity: number;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        cart_id?: string;
        variant_id?: string;
        quantity?: number;
        created_at?: string;
        updated_at?: string;
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
        }
      ];
    };
    carts: {
      Row: {
        id: string;
        session_token: string;
        customer_id: string | null;
        status: Database["public"]["Enums"]["cart_status"];
        currency: string;
        expires_at: string | null;
        converted_order_id: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        session_token?: string;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["cart_status"];
        currency?: string;
        expires_at?: string | null;
        converted_order_id?: string | null;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        session_token?: string;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["cart_status"];
        currency?: string;
        expires_at?: string | null;
        converted_order_id?: string | null;
        metadata?: Json;
        created_at?: string;
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
        }
      ];
    };
    checkout_line_components: {
      Row: {
        id: string;
        checkout_line_id: string;
        component_variant_id: string;
        component_title_snapshot: string;
        component_sku_snapshot: string | null;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot: string | null;
        location_id_snapshot: string | null;
        quantity_per_parent: number;
        total_quantity: number;
        created_at: string;
      };
      Insert: {
        id?: string;
        checkout_line_id: string;
        component_variant_id: string;
        component_title_snapshot: string;
        component_sku_snapshot?: string | null;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        location_id_snapshot?: string | null;
        quantity_per_parent: number;
        total_quantity: number;
        created_at?: string;
      };
      Update: {
        id?: string;
        checkout_line_id?: string;
        component_variant_id?: string;
        component_title_snapshot?: string;
        component_sku_snapshot?: string | null;
        fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        location_id_snapshot?: string | null;
        quantity_per_parent?: number;
        total_quantity?: number;
        created_at?: string;
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
        }
      ];
    };
    checkout_lines: {
      Row: {
        id: string;
        checkout_session_id: string;
        source_cart_item_id: string | null;
        line_key: string;
        product_id: string;
        variant_id: string;
        product_handle_snapshot: string;
        product_title_snapshot: string;
        variant_title_snapshot: string;
        sku_snapshot: string | null;
        options_snapshot: Json;
        display_snapshot: Json;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot: string | null;
        quantity: number;
        unit_price_cents: number;
        discount_cents: number;
        tax_cents: number;
        line_total_cents: number;
        is_bundle: boolean;
        created_at: string;
      };
      Insert: {
        id?: string;
        checkout_session_id: string;
        source_cart_item_id?: string | null;
        line_key: string;
        product_id: string;
        variant_id: string;
        product_handle_snapshot: string;
        product_title_snapshot: string;
        variant_title_snapshot: string;
        sku_snapshot?: string | null;
        options_snapshot?: Json;
        display_snapshot?: Json;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        quantity: number;
        unit_price_cents: number;
        discount_cents?: number;
        tax_cents?: number;
        line_total_cents: number;
        is_bundle?: boolean;
        created_at?: string;
      };
      Update: {
        id?: string;
        checkout_session_id?: string;
        source_cart_item_id?: string | null;
        line_key?: string;
        product_id?: string;
        variant_id?: string;
        product_handle_snapshot?: string;
        product_title_snapshot?: string;
        variant_title_snapshot?: string;
        sku_snapshot?: string | null;
        options_snapshot?: Json;
        display_snapshot?: Json;
        fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        quantity?: number;
        unit_price_cents?: number;
        discount_cents?: number;
        tax_cents?: number;
        line_total_cents?: number;
        is_bundle?: boolean;
        created_at?: string;
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
        }
      ];
    };
    checkout_sessions: {
      Row: {
        id: string;
        checkout_token: string;
        cart_id: string | null;
        customer_id: string | null;
        status: Database["public"]["Enums"]["checkout_snapshot_status"];
        currency: string;
        customer_email: string;
        customer_phone: string | null;
        customer_snapshot: Json;
        shipping_address_snapshot: Json;
        billing_address_snapshot: Json | null;
        shipping_method_snapshot: Json;
        subtotal_cents: number;
        discount_cents: number;
        shipping_cents: number;
        tax_cents: number;
        total_cents: number;
        stripe_checkout_session_id: string | null;
        stripe_payment_intent_id: string | null;
        reservation_expires_at: string;
        stripe_expires_at: string | null;
        paid_order_id: string | null;
        created_at: string;
        updated_at: string;
        paid_at: string | null;
      };
      Insert: {
        id?: string;
        checkout_token?: string;
        cart_id?: string | null;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["checkout_snapshot_status"];
        currency?: string;
        customer_email: string;
        customer_phone?: string | null;
        customer_snapshot?: Json;
        shipping_address_snapshot: Json;
        billing_address_snapshot?: Json | null;
        shipping_method_snapshot?: Json;
        subtotal_cents: number;
        discount_cents?: number;
        shipping_cents?: number;
        tax_cents?: number;
        total_cents: number;
        stripe_checkout_session_id?: string | null;
        stripe_payment_intent_id?: string | null;
        reservation_expires_at: string;
        stripe_expires_at?: string | null;
        paid_order_id?: string | null;
        created_at?: string;
        updated_at?: string;
        paid_at?: string | null;
      };
      Update: {
        id?: string;
        checkout_token?: string;
        cart_id?: string | null;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["checkout_snapshot_status"];
        currency?: string;
        customer_email?: string;
        customer_phone?: string | null;
        customer_snapshot?: Json;
        shipping_address_snapshot?: Json;
        billing_address_snapshot?: Json | null;
        shipping_method_snapshot?: Json;
        subtotal_cents?: number;
        discount_cents?: number;
        shipping_cents?: number;
        tax_cents?: number;
        total_cents?: number;
        stripe_checkout_session_id?: string | null;
        stripe_payment_intent_id?: string | null;
        reservation_expires_at?: string;
        stripe_expires_at?: string | null;
        paid_order_id?: string | null;
        created_at?: string;
        updated_at?: string;
        paid_at?: string | null;
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
        }
      ];
    };
    collection_products: {
      Row: {
        collection_id: string;
        product_id: string;
        position: number;
        pinned: boolean;
        hidden: boolean;
        card_media_asset_id: string | null;
        created_at: string;
      };
      Insert: {
        collection_id: string;
        product_id: string;
        position?: number;
        pinned?: boolean;
        hidden?: boolean;
        card_media_asset_id?: string | null;
        created_at?: string;
      };
      Update: {
        collection_id?: string;
        product_id?: string;
        position?: number;
        pinned?: boolean;
        hidden?: boolean;
        card_media_asset_id?: string | null;
        created_at?: string;
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
        }
      ];
    };
    collections: {
      Row: {
        id: string;
        handle: string;
        title: string;
        description: string | null;
        status: Database["public"]["Enums"]["product_status"];
        collection_type: string;
        dynamic_rule: Json | null;
        hero_media_asset_id: string | null;
        seo_title: string | null;
        seo_description: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        handle: string;
        title: string;
        description?: string | null;
        status?: Database["public"]["Enums"]["product_status"];
        collection_type?: string;
        dynamic_rule?: Json | null;
        hero_media_asset_id?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        handle?: string;
        title?: string;
        description?: string | null;
        status?: Database["public"]["Enums"]["product_status"];
        collection_type?: string;
        dynamic_rule?: Json | null;
        hero_media_asset_id?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "collections_hero_media_asset_id_fkey";
          columns: ["hero_media_asset_id"];
          isOneToOne: false;
          referencedRelation: "media_assets";
          referencedColumns: ["id"];
        }
      ];
    };
    customer_addresses: {
      Row: {
        id: string;
        customer_id: string;
        label: string | null;
        recipient_name: string;
        company: string | null;
        line1: string;
        line2: string | null;
        city: string;
        region: string;
        postal_code: string;
        country_code: string;
        phone: string | null;
        is_default_shipping: boolean;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        customer_id: string;
        label?: string | null;
        recipient_name: string;
        company?: string | null;
        line1: string;
        line2?: string | null;
        city: string;
        region: string;
        postal_code: string;
        country_code: string;
        phone?: string | null;
        is_default_shipping?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        customer_id?: string;
        label?: string | null;
        recipient_name?: string;
        company?: string | null;
        line1?: string;
        line2?: string | null;
        city?: string;
        region?: string;
        postal_code?: string;
        country_code?: string;
        phone?: string | null;
        is_default_shipping?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "customer_addresses_customer_id_fkey";
          columns: ["customer_id"];
          isOneToOne: false;
          referencedRelation: "customers";
          referencedColumns: ["id"];
        }
      ];
    };
    customer_fulfillment_consents: {
      Row: {
        id: string;
        order_id: string;
        fulfillment_group_id: string | null;
        consent_type: string;
        proposed_change: Json;
        customer_response: string;
        evidence_reference: string | null;
        recorded_at: string;
        recorded_by: string | null;
      };
      Insert: {
        id?: string;
        order_id: string;
        fulfillment_group_id?: string | null;
        consent_type: string;
        proposed_change: Json;
        customer_response: string;
        evidence_reference?: string | null;
        recorded_at?: string;
        recorded_by?: string | null;
      };
      Update: {
        id?: string;
        order_id?: string;
        fulfillment_group_id?: string | null;
        consent_type?: string;
        proposed_change?: Json;
        customer_response?: string;
        evidence_reference?: string | null;
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
        {
          foreignKeyName: "customer_fulfillment_consents_recorded_by_fkey";
          columns: ["recorded_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    customers: {
      Row: {
        id: string;
        auth_user_id: string | null;
        email: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        marketing_opt_in: boolean;
        metadata: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        auth_user_id?: string | null;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        marketing_opt_in?: boolean;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        auth_user_id?: string | null;
        email?: string;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        marketing_opt_in?: boolean;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "customers_auth_user_id_fkey";
          columns: ["auth_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    fulfillment_address_corrections: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        original_order_address_snapshot: Json;
        corrected_address_snapshot: Json;
        reason: string;
        actor_user_id: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        original_order_address_snapshot: Json;
        corrected_address_snapshot: Json;
        reason: string;
        actor_user_id?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        original_order_address_snapshot?: Json;
        corrected_address_snapshot?: Json;
        reason?: string;
        actor_user_id?: string | null;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "fulfillment_address_corrections_actor_user_id_fkey";
          columns: ["actor_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "fulfillment_address_corrections_fulfillment_group_id_fkey";
          columns: ["fulfillment_group_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_groups";
          referencedColumns: ["id"];
        }
      ];
    };
    fulfillment_group_items: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        order_item_id: string;
        order_item_component_id: string | null;
        variant_id: string;
        quantity_required: number;
        quantity_fulfilled: number;
        created_at: string;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        order_item_id: string;
        order_item_component_id?: string | null;
        variant_id: string;
        quantity_required: number;
        quantity_fulfilled?: number;
        created_at?: string;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        order_item_id?: string;
        order_item_component_id?: string | null;
        variant_id?: string;
        quantity_required?: number;
        quantity_fulfilled?: number;
        created_at?: string;
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
        }
      ];
    };
    fulfillment_groups: {
      Row: {
        id: string;
        order_id: string;
        provider_id: string;
        location_id: string | null;
        routing_mode: Database["public"]["Enums"]["fulfillment_routing_mode"];
        canonical_status: Database["public"]["Enums"]["fulfillment_group_status"];
        raw_provider_status: string | null;
        provider_order_id: string | null;
        submission_key: string;
        auto_submit: boolean;
        effective_shipping_address_snapshot: Json;
        estimated_cost_cents: number | null;
        actual_cost_cents: number | null;
        currency: string;
        submitted_at: string | null;
        accepted_at: string | null;
        production_started_at: string | null;
        shipped_at: string | null;
        delivered_at: string | null;
        cancelled_at: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        order_id: string;
        provider_id: string;
        location_id?: string | null;
        routing_mode: Database["public"]["Enums"]["fulfillment_routing_mode"];
        canonical_status?: Database["public"]["Enums"]["fulfillment_group_status"];
        raw_provider_status?: string | null;
        provider_order_id?: string | null;
        submission_key?: string;
        auto_submit?: boolean;
        effective_shipping_address_snapshot: Json;
        estimated_cost_cents?: number | null;
        actual_cost_cents?: number | null;
        currency?: string;
        submitted_at?: string | null;
        accepted_at?: string | null;
        production_started_at?: string | null;
        shipped_at?: string | null;
        delivered_at?: string | null;
        cancelled_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        order_id?: string;
        provider_id?: string;
        location_id?: string | null;
        routing_mode?: Database["public"]["Enums"]["fulfillment_routing_mode"];
        canonical_status?: Database["public"]["Enums"]["fulfillment_group_status"];
        raw_provider_status?: string | null;
        provider_order_id?: string | null;
        submission_key?: string;
        auto_submit?: boolean;
        effective_shipping_address_snapshot?: Json;
        estimated_cost_cents?: number | null;
        actual_cost_cents?: number | null;
        currency?: string;
        submitted_at?: string | null;
        accepted_at?: string | null;
        production_started_at?: string | null;
        shipped_at?: string | null;
        delivered_at?: string | null;
        cancelled_at?: string | null;
        created_at?: string;
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
        }
      ];
    };
    fulfillment_issues: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        provider_id: string;
        issue_code: string;
        severity: Database["public"]["Enums"]["issue_severity"];
        retryable: boolean;
        owner_summary: string;
        diagnostic_reference: string | null;
        opened_at: string;
        last_attempt_at: string | null;
        resolved_at: string | null;
        resolution_type: string | null;
        resolved_by: string | null;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        provider_id: string;
        issue_code: string;
        severity?: Database["public"]["Enums"]["issue_severity"];
        retryable?: boolean;
        owner_summary: string;
        diagnostic_reference?: string | null;
        opened_at?: string;
        last_attempt_at?: string | null;
        resolved_at?: string | null;
        resolution_type?: string | null;
        resolved_by?: string | null;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        provider_id?: string;
        issue_code?: string;
        severity?: Database["public"]["Enums"]["issue_severity"];
        retryable?: boolean;
        owner_summary?: string;
        diagnostic_reference?: string | null;
        opened_at?: string;
        last_attempt_at?: string | null;
        resolved_at?: string | null;
        resolution_type?: string | null;
        resolved_by?: string | null;
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
        {
          foreignKeyName: "fulfillment_issues_resolved_by_fkey";
          columns: ["resolved_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    fulfillment_providers: {
      Row: {
        id: string;
        provider_key: string;
        name: string;
        provider_type: Database["public"]["Enums"]["provider_type"];
        connection_mode: Database["public"]["Enums"]["provider_connection_mode"];
        lifecycle_status: Database["public"]["Enums"]["provider_lifecycle_status"];
        health_status: Database["public"]["Enums"]["provider_health_status"];
        contact_name: string | null;
        contact_email: string | null;
        ordering_url: string | null;
        credentials_secret_ref: string | null;
        typical_production_min_days: number | null;
        typical_production_max_days: number | null;
        typical_shipping_min_days: number | null;
        typical_shipping_max_days: number | null;
        settings: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        provider_key: string;
        name: string;
        provider_type: Database["public"]["Enums"]["provider_type"];
        connection_mode: Database["public"]["Enums"]["provider_connection_mode"];
        lifecycle_status?: Database["public"]["Enums"]["provider_lifecycle_status"];
        health_status?: Database["public"]["Enums"]["provider_health_status"];
        contact_name?: string | null;
        contact_email?: string | null;
        ordering_url?: string | null;
        credentials_secret_ref?: string | null;
        typical_production_min_days?: number | null;
        typical_production_max_days?: number | null;
        typical_shipping_min_days?: number | null;
        typical_shipping_max_days?: number | null;
        settings?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        provider_key?: string;
        name?: string;
        provider_type?: Database["public"]["Enums"]["provider_type"];
        connection_mode?: Database["public"]["Enums"]["provider_connection_mode"];
        lifecycle_status?: Database["public"]["Enums"]["provider_lifecycle_status"];
        health_status?: Database["public"]["Enums"]["provider_health_status"];
        contact_name?: string | null;
        contact_email?: string | null;
        ordering_url?: string | null;
        credentials_secret_ref?: string | null;
        typical_production_min_days?: number | null;
        typical_production_max_days?: number | null;
        typical_shipping_min_days?: number | null;
        typical_shipping_max_days?: number | null;
        settings?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [];
    };
    fulfillment_recovery_attempts: {
      Row: {
        id: string;
        issue_id: string;
        fulfillment_group_id: string;
        operation: string;
        attempt_number: number;
        submission_key: string;
        result: Database["public"]["Enums"]["recovery_result"];
        provider_reference: string | null;
        error_code: string | null;
        started_at: string;
        completed_at: string | null;
        actor_user_id: string | null;
      };
      Insert: {
        id?: string;
        issue_id: string;
        fulfillment_group_id: string;
        operation: string;
        attempt_number: number;
        submission_key: string;
        result?: Database["public"]["Enums"]["recovery_result"];
        provider_reference?: string | null;
        error_code?: string | null;
        started_at?: string;
        completed_at?: string | null;
        actor_user_id?: string | null;
      };
      Update: {
        id?: string;
        issue_id?: string;
        fulfillment_group_id?: string;
        operation?: string;
        attempt_number?: number;
        submission_key?: string;
        result?: Database["public"]["Enums"]["recovery_result"];
        provider_reference?: string | null;
        error_code?: string | null;
        started_at?: string;
        completed_at?: string | null;
        actor_user_id?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "fulfillment_recovery_attempts_actor_user_id_fkey";
          columns: ["actor_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
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
        }
      ];
    };
    fulfillment_routing_overrides: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        original_provider_id: string;
        override_provider_id: string | null;
        manual_mode: boolean;
        reason: string;
        created_by: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        original_provider_id: string;
        override_provider_id?: string | null;
        manual_mode?: boolean;
        reason: string;
        created_by?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        original_provider_id?: string;
        override_provider_id?: string | null;
        manual_mode?: boolean;
        reason?: string;
        created_by?: string | null;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "fulfillment_routing_overrides_created_by_fkey";
          columns: ["created_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
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
        }
      ];
    };
    idempotency_records: {
      Row: {
        id: string;
        scope: string;
        idempotency_key: string;
        status: string;
        reference_type: string | null;
        reference_id: string | null;
        result: Json | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        scope: string;
        idempotency_key: string;
        status: string;
        reference_type?: string | null;
        reference_id?: string | null;
        result?: Json | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        scope?: string;
        idempotency_key?: string;
        status?: string;
        reference_type?: string | null;
        reference_id?: string | null;
        result?: Json | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [];
    };
    integration_events: {
      Row: {
        id: string;
        integration_key: string;
        external_event_id: string | null;
        event_type: string;
        direction: string;
        status: string;
        payload_hash: string | null;
        reference_type: string | null;
        reference_id: string | null;
        error_message: string | null;
        created_at: string;
        processed_at: string | null;
      };
      Insert: {
        id?: string;
        integration_key: string;
        external_event_id?: string | null;
        event_type: string;
        direction: string;
        status: string;
        payload_hash?: string | null;
        reference_type?: string | null;
        reference_id?: string | null;
        error_message?: string | null;
        created_at?: string;
        processed_at?: string | null;
      };
      Update: {
        id?: string;
        integration_key?: string;
        external_event_id?: string | null;
        event_type?: string;
        direction?: string;
        status?: string;
        payload_hash?: string | null;
        reference_type?: string | null;
        reference_id?: string | null;
        error_message?: string | null;
        created_at?: string;
        processed_at?: string | null;
      };
      Relationships: [];
    };
    inventory_levels: {
      Row: {
        variant_id: string;
        location_id: string;
        on_hand: number;
        committed: number;
        unavailable: number;
        incoming: number;
        backordered: number;
        available: number | null;
        version: number;
        updated_at: string;
      };
      Insert: {
        variant_id: string;
        location_id: string;
        on_hand?: number;
        committed?: number;
        unavailable?: number;
        incoming?: number;
        backordered?: number;
        version?: number;
        updated_at?: string;
      };
      Update: {
        variant_id?: string;
        location_id?: string;
        on_hand?: number;
        committed?: number;
        unavailable?: number;
        incoming?: number;
        backordered?: number;
        version?: number;
        updated_at?: string;
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
        }
      ];
    };
    inventory_locations: {
      Row: {
        id: string;
        provider_id: string | null;
        code: string;
        name: string;
        active: boolean;
        fulfills_online_orders: boolean;
        address: Json | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        provider_id?: string | null;
        code: string;
        name: string;
        active?: boolean;
        fulfills_online_orders?: boolean;
        address?: Json | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        provider_id?: string | null;
        code?: string;
        name?: string;
        active?: boolean;
        fulfills_online_orders?: boolean;
        address?: Json | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "inventory_locations_provider_id_fkey";
          columns: ["provider_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_providers";
          referencedColumns: ["id"];
        }
      ];
    };
    inventory_movements: {
      Row: {
        id: string;
        variant_id: string;
        location_id: string;
        reason: Database["public"]["Enums"]["inventory_reason"];
        delta_on_hand: number;
        delta_committed: number;
        delta_unavailable: number;
        delta_backordered: number;
        before_state: Json;
        after_state: Json;
        source_type: string | null;
        source_id: string | null;
        source_reference: string | null;
        actor_user_id: string | null;
        idempotency_key: string | null;
        note: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        variant_id: string;
        location_id: string;
        reason: Database["public"]["Enums"]["inventory_reason"];
        delta_on_hand?: number;
        delta_committed?: number;
        delta_unavailable?: number;
        delta_backordered?: number;
        before_state: Json;
        after_state: Json;
        source_type?: string | null;
        source_id?: string | null;
        source_reference?: string | null;
        actor_user_id?: string | null;
        idempotency_key?: string | null;
        note?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        variant_id?: string;
        location_id?: string;
        reason?: Database["public"]["Enums"]["inventory_reason"];
        delta_on_hand?: number;
        delta_committed?: number;
        delta_unavailable?: number;
        delta_backordered?: number;
        before_state?: Json;
        after_state?: Json;
        source_type?: string | null;
        source_id?: string | null;
        source_reference?: string | null;
        actor_user_id?: string | null;
        idempotency_key?: string | null;
        note?: string | null;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "inventory_movements_actor_user_id_fkey";
          columns: ["actor_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
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
        }
      ];
    };
    inventory_reservations: {
      Row: {
        id: string;
        checkout_token: string;
        cart_id: string | null;
        cart_item_id: string | null;
        source_line_key: string;
        requested_variant_id: string;
        stock_variant_id: string;
        location_id: string;
        quantity: number;
        status: Database["public"]["Enums"]["reservation_status"];
        expires_at: string;
        converted_order_id: string | null;
        created_at: string;
        released_at: string | null;
        converted_at: string | null;
        checkout_session_id: string | null;
        reserved_on_hand: number;
        reserved_backordered: number;
      };
      Insert: {
        id?: string;
        checkout_token: string;
        cart_id?: string | null;
        cart_item_id?: string | null;
        source_line_key: string;
        requested_variant_id: string;
        stock_variant_id: string;
        location_id: string;
        quantity: number;
        status?: Database["public"]["Enums"]["reservation_status"];
        expires_at: string;
        converted_order_id?: string | null;
        created_at?: string;
        released_at?: string | null;
        converted_at?: string | null;
        checkout_session_id?: string | null;
        reserved_on_hand?: number;
        reserved_backordered?: number;
      };
      Update: {
        id?: string;
        checkout_token?: string;
        cart_id?: string | null;
        cart_item_id?: string | null;
        source_line_key?: string;
        requested_variant_id?: string;
        stock_variant_id?: string;
        location_id?: string;
        quantity?: number;
        status?: Database["public"]["Enums"]["reservation_status"];
        expires_at?: string;
        converted_order_id?: string | null;
        created_at?: string;
        released_at?: string | null;
        converted_at?: string | null;
        checkout_session_id?: string | null;
        reserved_on_hand?: number;
        reserved_backordered?: number;
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
        }
      ];
    };
    media_asset_usages: {
      Row: {
        id: string;
        media_asset_id: string;
        entity_type: string;
        entity_id: string;
        placement_key: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        media_asset_id: string;
        entity_type: string;
        entity_id: string;
        placement_key?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        media_asset_id?: string;
        entity_type?: string;
        entity_id?: string;
        placement_key?: string | null;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "media_asset_usages_media_asset_id_fkey";
          columns: ["media_asset_id"];
          isOneToOne: false;
          referencedRelation: "media_assets";
          referencedColumns: ["id"];
        }
      ];
    };
    media_assets: {
      Row: {
        id: string;
        status: Database["public"]["Enums"]["media_status"];
        kind: Database["public"]["Enums"]["media_kind"];
        bucket: string;
        storage_path: string;
        original_filename: string | null;
        mime_type: string | null;
        byte_size: number | null;
        width: number | null;
        height: number | null;
        duration_ms: number | null;
        alt_text: string | null;
        checksum_sha256: string | null;
        metadata: Json;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        archived_at: string | null;
      };
      Insert: {
        id?: string;
        status?: Database["public"]["Enums"]["media_status"];
        kind?: Database["public"]["Enums"]["media_kind"];
        bucket: string;
        storage_path: string;
        original_filename?: string | null;
        mime_type?: string | null;
        byte_size?: number | null;
        width?: number | null;
        height?: number | null;
        duration_ms?: number | null;
        alt_text?: string | null;
        checksum_sha256?: string | null;
        metadata?: Json;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        archived_at?: string | null;
      };
      Update: {
        id?: string;
        status?: Database["public"]["Enums"]["media_status"];
        kind?: Database["public"]["Enums"]["media_kind"];
        bucket?: string;
        storage_path?: string;
        original_filename?: string | null;
        mime_type?: string | null;
        byte_size?: number | null;
        width?: number | null;
        height?: number | null;
        duration_ms?: number | null;
        alt_text?: string | null;
        checksum_sha256?: string | null;
        metadata?: Json;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
        archived_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "media_assets_created_by_fkey";
          columns: ["created_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    navigation_items: {
      Row: {
        id: string;
        revision_id: string;
        menu_key: string;
        parent_item_id: string | null;
        label: string;
        destination: string;
        position: number;
        enabled: boolean;
        metadata: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        revision_id: string;
        menu_key: string;
        parent_item_id?: string | null;
        label: string;
        destination: string;
        position?: number;
        enabled?: boolean;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        revision_id?: string;
        menu_key?: string;
        parent_item_id?: string | null;
        label?: string;
        destination?: string;
        position?: number;
        enabled?: boolean;
        metadata?: Json;
        created_at?: string;
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
        }
      ];
    };
    order_item_components: {
      Row: {
        id: string;
        order_item_id: string;
        component_variant_id: string;
        component_title_snapshot: string;
        component_sku_snapshot: string | null;
        quantity_per_parent: number;
        total_quantity: number;
        provider_id_snapshot: string | null;
        location_id_snapshot: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        order_item_id: string;
        component_variant_id: string;
        component_title_snapshot: string;
        component_sku_snapshot?: string | null;
        quantity_per_parent: number;
        total_quantity: number;
        provider_id_snapshot?: string | null;
        location_id_snapshot?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        order_item_id?: string;
        component_variant_id?: string;
        component_title_snapshot?: string;
        component_sku_snapshot?: string | null;
        quantity_per_parent?: number;
        total_quantity?: number;
        provider_id_snapshot?: string | null;
        location_id_snapshot?: string | null;
        created_at?: string;
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
        }
      ];
    };
    order_items: {
      Row: {
        id: string;
        order_id: string;
        product_id: string;
        variant_id: string;
        product_handle_snapshot: string;
        product_title_snapshot: string;
        variant_title_snapshot: string;
        sku_snapshot: string | null;
        options_snapshot: Json;
        display_snapshot: Json;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot: string | null;
        quantity: number;
        unit_price_cents: number;
        discount_cents: number;
        tax_cents: number;
        line_total_cents: number;
        is_bundle: boolean;
        created_at: string;
      };
      Insert: {
        id?: string;
        order_id: string;
        product_id: string;
        variant_id: string;
        product_handle_snapshot: string;
        product_title_snapshot: string;
        variant_title_snapshot: string;
        sku_snapshot?: string | null;
        options_snapshot?: Json;
        display_snapshot?: Json;
        fulfillment_mode_snapshot: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        quantity: number;
        unit_price_cents: number;
        discount_cents?: number;
        tax_cents?: number;
        line_total_cents: number;
        is_bundle?: boolean;
        created_at?: string;
      };
      Update: {
        id?: string;
        order_id?: string;
        product_id?: string;
        variant_id?: string;
        product_handle_snapshot?: string;
        product_title_snapshot?: string;
        variant_title_snapshot?: string;
        sku_snapshot?: string | null;
        options_snapshot?: Json;
        display_snapshot?: Json;
        fulfillment_mode_snapshot?: Database["public"]["Enums"]["inventory_mode"];
        provider_id_snapshot?: string | null;
        quantity?: number;
        unit_price_cents?: number;
        discount_cents?: number;
        tax_cents?: number;
        line_total_cents?: number;
        is_bundle?: boolean;
        created_at?: string;
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
        }
      ];
    };
    orders: {
      Row: {
        id: string;
        order_number: string;
        cart_id: string | null;
        customer_id: string | null;
        source: Database["public"]["Enums"]["order_source"];
        customer_email: string;
        customer_phone: string | null;
        currency: string;
        subtotal_cents: number;
        discount_cents: number;
        shipping_cents: number;
        tax_cents: number;
        total_cents: number;
        payment_status: Database["public"]["Enums"]["payment_status"];
        fulfillment_status: Database["public"]["Enums"]["order_fulfillment_status"];
        return_status: Database["public"]["Enums"]["order_return_status"];
        refund_status: Database["public"]["Enums"]["order_refund_status"];
        stripe_checkout_session_id: string | null;
        stripe_payment_intent_id: string | null;
        customer_snapshot: Json;
        shipping_address_snapshot: Json;
        billing_address_snapshot: Json | null;
        shipping_method_snapshot: Json | null;
        metadata: Json;
        placed_at: string;
        paid_at: string | null;
        cancelled_at: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        order_number?: string;
        cart_id?: string | null;
        customer_id?: string | null;
        source?: Database["public"]["Enums"]["order_source"];
        customer_email: string;
        customer_phone?: string | null;
        currency?: string;
        subtotal_cents: number;
        discount_cents?: number;
        shipping_cents?: number;
        tax_cents?: number;
        total_cents: number;
        payment_status?: Database["public"]["Enums"]["payment_status"];
        fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"];
        return_status?: Database["public"]["Enums"]["order_return_status"];
        refund_status?: Database["public"]["Enums"]["order_refund_status"];
        stripe_checkout_session_id?: string | null;
        stripe_payment_intent_id?: string | null;
        customer_snapshot: Json;
        shipping_address_snapshot: Json;
        billing_address_snapshot?: Json | null;
        shipping_method_snapshot?: Json | null;
        metadata?: Json;
        placed_at?: string;
        paid_at?: string | null;
        cancelled_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        order_number?: string;
        cart_id?: string | null;
        customer_id?: string | null;
        source?: Database["public"]["Enums"]["order_source"];
        customer_email?: string;
        customer_phone?: string | null;
        currency?: string;
        subtotal_cents?: number;
        discount_cents?: number;
        shipping_cents?: number;
        tax_cents?: number;
        total_cents?: number;
        payment_status?: Database["public"]["Enums"]["payment_status"];
        fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"];
        return_status?: Database["public"]["Enums"]["order_return_status"];
        refund_status?: Database["public"]["Enums"]["order_refund_status"];
        stripe_checkout_session_id?: string | null;
        stripe_payment_intent_id?: string | null;
        customer_snapshot?: Json;
        shipping_address_snapshot?: Json;
        billing_address_snapshot?: Json | null;
        shipping_method_snapshot?: Json | null;
        metadata?: Json;
        placed_at?: string;
        paid_at?: string | null;
        cancelled_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "orders_cart_id_fkey";
          columns: ["cart_id"];
          isOneToOne: false;
          referencedRelation: "carts";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "orders_customer_id_fkey";
          columns: ["customer_id"];
          isOneToOne: false;
          referencedRelation: "customers";
          referencedColumns: ["id"];
        }
      ];
    };
    page_drafts: {
      Row: {
        page_id: string;
        revision_id: string;
        locked_by: string | null;
        lock_expires_at: string | null;
        autosaved_at: string;
      };
      Insert: {
        page_id: string;
        revision_id: string;
        locked_by?: string | null;
        lock_expires_at?: string | null;
        autosaved_at?: string;
      };
      Update: {
        page_id?: string;
        revision_id?: string;
        locked_by?: string | null;
        lock_expires_at?: string | null;
        autosaved_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "page_drafts_locked_by_fkey";
          columns: ["locked_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "page_drafts_page_id_fkey";
          columns: ["page_id"];
          isOneToOne: false;
          referencedRelation: "pages";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "page_drafts_revision_id_fkey";
          columns: ["revision_id"];
          isOneToOne: false;
          referencedRelation: "page_revisions";
          referencedColumns: ["id"];
        }
      ];
    };
    page_revisions: {
      Row: {
        id: string;
        page_id: string;
        revision_number: number;
        state: Database["public"]["Enums"]["revision_state"];
        source_revision_id: string | null;
        created_by: string | null;
        created_at: string;
        published_at: string | null;
        note: string | null;
      };
      Insert: {
        id?: string;
        page_id: string;
        revision_number: number;
        state?: Database["public"]["Enums"]["revision_state"];
        source_revision_id?: string | null;
        created_by?: string | null;
        created_at?: string;
        published_at?: string | null;
        note?: string | null;
      };
      Update: {
        id?: string;
        page_id?: string;
        revision_number?: number;
        state?: Database["public"]["Enums"]["revision_state"];
        source_revision_id?: string | null;
        created_by?: string | null;
        created_at?: string;
        published_at?: string | null;
        note?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "page_revisions_created_by_fkey";
          columns: ["created_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
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
        }
      ];
    };
    page_sections: {
      Row: {
        id: string;
        revision_id: string;
        section_key: string;
        section_type: string;
        schema_version: number;
        position: number;
        enabled: boolean;
        payload: Json;
        created_at: string;
        updated_at: string;
        version: number;
      };
      Insert: {
        id?: string;
        revision_id: string;
        section_key: string;
        section_type: string;
        schema_version?: number;
        position?: number;
        enabled?: boolean;
        payload?: Json;
        created_at?: string;
        updated_at?: string;
        version?: number;
      };
      Update: {
        id?: string;
        revision_id?: string;
        section_key?: string;
        section_type?: string;
        schema_version?: number;
        position?: number;
        enabled?: boolean;
        payload?: Json;
        created_at?: string;
        updated_at?: string;
        version?: number;
      };
      Relationships: [
        {
          foreignKeyName: "page_sections_revision_id_fkey";
          columns: ["revision_id"];
          isOneToOne: false;
          referencedRelation: "page_revisions";
          referencedColumns: ["id"];
        }
      ];
    };
    pages: {
      Row: {
        id: string;
        page_key: string;
        page_kind: Database["public"]["Enums"]["page_kind"];
        route: string | null;
        title: string;
        template_key: string;
        is_system: boolean;
        published_revision_id: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        page_key: string;
        page_kind?: Database["public"]["Enums"]["page_kind"];
        route?: string | null;
        title: string;
        template_key: string;
        is_system?: boolean;
        published_revision_id?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        page_key?: string;
        page_kind?: Database["public"]["Enums"]["page_kind"];
        route?: string | null;
        title?: string;
        template_key?: string;
        is_system?: boolean;
        published_revision_id?: string | null;
        created_by?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "pages_created_by_fkey";
          columns: ["created_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "pages_published_revision_fk";
          columns: ["published_revision_id"];
          isOneToOne: false;
          referencedRelation: "page_revisions";
          referencedColumns: ["id"];
        }
      ];
    };
    payments: {
      Row: {
        id: string;
        order_id: string;
        provider: string;
        external_payment_intent_id: string | null;
        status: Database["public"]["Enums"]["payment_status"];
        amount_authorized_cents: number;
        amount_captured_cents: number;
        amount_refunded_cents: number;
        currency: string;
        raw_status: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        order_id: string;
        provider?: string;
        external_payment_intent_id?: string | null;
        status?: Database["public"]["Enums"]["payment_status"];
        amount_authorized_cents?: number;
        amount_captured_cents?: number;
        amount_refunded_cents?: number;
        currency?: string;
        raw_status?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        order_id?: string;
        provider?: string;
        external_payment_intent_id?: string | null;
        status?: Database["public"]["Enums"]["payment_status"];
        amount_authorized_cents?: number;
        amount_captured_cents?: number;
        amount_refunded_cents?: number;
        currency?: string;
        raw_status?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "payments_order_id_fkey";
          columns: ["order_id"];
          isOneToOne: false;
          referencedRelation: "orders";
          referencedColumns: ["id"];
        }
      ];
    };
    product_media: {
      Row: {
        id: string;
        product_id: string;
        variant_id: string | null;
        media_asset_id: string;
        role: string;
        position: number;
        focal_x: number | null;
        focal_y: number | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        product_id: string;
        variant_id?: string | null;
        media_asset_id: string;
        role?: string;
        position?: number;
        focal_x?: number | null;
        focal_y?: number | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        product_id?: string;
        variant_id?: string | null;
        media_asset_id?: string;
        role?: string;
        position?: number;
        focal_x?: number | null;
        focal_y?: number | null;
        created_at?: string;
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
        }
      ];
    };
    product_option_values: {
      Row: {
        id: string;
        option_id: string;
        value: string;
        position: number;
        created_at: string;
      };
      Insert: {
        id?: string;
        option_id: string;
        value: string;
        position?: number;
        created_at?: string;
      };
      Update: {
        id?: string;
        option_id?: string;
        value?: string;
        position?: number;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "product_option_values_option_id_fkey";
          columns: ["option_id"];
          isOneToOne: false;
          referencedRelation: "product_options";
          referencedColumns: ["id"];
        }
      ];
    };
    product_options: {
      Row: {
        id: string;
        product_id: string;
        name: string;
        position: number;
        created_at: string;
      };
      Insert: {
        id?: string;
        product_id: string;
        name: string;
        position?: number;
        created_at?: string;
      };
      Update: {
        id?: string;
        product_id?: string;
        name?: string;
        position?: number;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "product_options_product_id_fkey";
          columns: ["product_id"];
          isOneToOne: false;
          referencedRelation: "products";
          referencedColumns: ["id"];
        }
      ];
    };
    product_variants: {
      Row: {
        id: string;
        product_id: string;
        title: string;
        sku: string | null;
        barcode: string | null;
        price_cents: number;
        compare_at_price_cents: number | null;
        currency: string;
        inventory_mode: Database["public"]["Enums"]["inventory_mode"];
        fulfillment_provider_id: string | null;
        track_inventory: boolean;
        continue_selling_when_out_of_stock: boolean;
        low_stock_threshold: number;
        weight_grams: number | null;
        position: number;
        is_default: boolean;
        active: boolean;
        metadata: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        product_id: string;
        title: string;
        sku?: string | null;
        barcode?: string | null;
        price_cents: number;
        compare_at_price_cents?: number | null;
        currency?: string;
        inventory_mode?: Database["public"]["Enums"]["inventory_mode"];
        fulfillment_provider_id?: string | null;
        track_inventory?: boolean;
        continue_selling_when_out_of_stock?: boolean;
        low_stock_threshold?: number;
        weight_grams?: number | null;
        position?: number;
        is_default?: boolean;
        active?: boolean;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        product_id?: string;
        title?: string;
        sku?: string | null;
        barcode?: string | null;
        price_cents?: number;
        compare_at_price_cents?: number | null;
        currency?: string;
        inventory_mode?: Database["public"]["Enums"]["inventory_mode"];
        fulfillment_provider_id?: string | null;
        track_inventory?: boolean;
        continue_selling_when_out_of_stock?: boolean;
        low_stock_threshold?: number;
        weight_grams?: number | null;
        position?: number;
        is_default?: boolean;
        active?: boolean;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
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
        }
      ];
    };
    products: {
      Row: {
        id: string;
        handle: string;
        title: string;
        subtitle: string | null;
        description: string | null;
        product_type: string | null;
        tags: string[];
        status: Database["public"]["Enums"]["product_status"];
        kind: Database["public"]["Enums"]["product_kind"];
        requires_shipping: boolean;
        taxable: boolean;
        seo_title: string | null;
        seo_description: string | null;
        social_media_asset_id: string | null;
        created_at: string;
        updated_at: string;
        archived_at: string | null;
      };
      Insert: {
        id?: string;
        handle: string;
        title: string;
        subtitle?: string | null;
        description?: string | null;
        product_type?: string | null;
        tags?: string[];
        status?: Database["public"]["Enums"]["product_status"];
        kind?: Database["public"]["Enums"]["product_kind"];
        requires_shipping?: boolean;
        taxable?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        social_media_asset_id?: string | null;
        created_at?: string;
        updated_at?: string;
        archived_at?: string | null;
      };
      Update: {
        id?: string;
        handle?: string;
        title?: string;
        subtitle?: string | null;
        description?: string | null;
        product_type?: string | null;
        tags?: string[];
        status?: Database["public"]["Enums"]["product_status"];
        kind?: Database["public"]["Enums"]["product_kind"];
        requires_shipping?: boolean;
        taxable?: boolean;
        seo_title?: string | null;
        seo_description?: string | null;
        social_media_asset_id?: string | null;
        created_at?: string;
        updated_at?: string;
        archived_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "products_social_media_asset_id_fkey";
          columns: ["social_media_asset_id"];
          isOneToOne: false;
          referencedRelation: "media_assets";
          referencedColumns: ["id"];
        }
      ];
    };
    provider_attempts: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        operation: string;
        attempt_number: number;
        submission_key: string;
        result: Database["public"]["Enums"]["recovery_result"];
        provider_reference: string | null;
        error_code: string | null;
        error_message: string | null;
        started_at: string;
        completed_at: string | null;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        operation: string;
        attempt_number: number;
        submission_key: string;
        result?: Database["public"]["Enums"]["recovery_result"];
        provider_reference?: string | null;
        error_code?: string | null;
        error_message?: string | null;
        started_at?: string;
        completed_at?: string | null;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        operation?: string;
        attempt_number?: number;
        submission_key?: string;
        result?: Database["public"]["Enums"]["recovery_result"];
        provider_reference?: string | null;
        error_code?: string | null;
        error_message?: string | null;
        started_at?: string;
        completed_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "provider_attempts_fulfillment_group_id_fkey";
          columns: ["fulfillment_group_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_groups";
          referencedColumns: ["id"];
        }
      ];
    };
    provider_events: {
      Row: {
        id: string;
        provider_id: string;
        external_event_id: string | null;
        event_type: string;
        payload_hash: string | null;
        received_at: string;
        processed_at: string | null;
        processing_status: string;
        error_message: string | null;
      };
      Insert: {
        id?: string;
        provider_id: string;
        external_event_id?: string | null;
        event_type: string;
        payload_hash?: string | null;
        received_at?: string;
        processed_at?: string | null;
        processing_status?: string;
        error_message?: string | null;
      };
      Update: {
        id?: string;
        provider_id?: string;
        external_event_id?: string | null;
        event_type?: string;
        payload_hash?: string | null;
        received_at?: string;
        processed_at?: string | null;
        processing_status?: string;
        error_message?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "provider_events_provider_id_fkey";
          columns: ["provider_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_providers";
          referencedColumns: ["id"];
        }
      ];
    };
    provider_variant_availability: {
      Row: {
        mapping_id: string;
        reported_quantity: number | null;
        sellable_quantity: number | null;
        is_available: boolean;
        source_status: string | null;
        checked_at: string;
        payload_hash: string | null;
        metadata: Json;
      };
      Insert: {
        mapping_id: string;
        reported_quantity?: number | null;
        sellable_quantity?: number | null;
        is_available?: boolean;
        source_status?: string | null;
        checked_at?: string;
        payload_hash?: string | null;
        metadata?: Json;
      };
      Update: {
        mapping_id?: string;
        reported_quantity?: number | null;
        sellable_quantity?: number | null;
        is_available?: boolean;
        source_status?: string | null;
        checked_at?: string;
        payload_hash?: string | null;
        metadata?: Json;
      };
      Relationships: [
        {
          foreignKeyName: "provider_variant_availability_mapping_id_fkey";
          columns: ["mapping_id"];
          isOneToOne: false;
          referencedRelation: "provider_variant_mappings";
          referencedColumns: ["id"];
        }
      ];
    };
    provider_variant_mappings: {
      Row: {
        id: string;
        variant_id: string;
        provider_id: string;
        provider_product_id: string | null;
        provider_variant_id: string | null;
        supplier_sku: string | null;
        supplier_cost_cents: number | null;
        currency: string;
        availability_mode: Database["public"]["Enums"]["availability_mode"];
        sync_status: Database["public"]["Enums"]["availability_sync_status"];
        stock_buffer: number;
        auto_submit: boolean;
        production_min_days: number | null;
        production_max_days: number | null;
        shipping_min_days: number | null;
        shipping_max_days: number | null;
        return_destination_mode: string;
        active: boolean;
        last_synced_at: string | null;
        metadata: Json;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        variant_id: string;
        provider_id: string;
        provider_product_id?: string | null;
        provider_variant_id?: string | null;
        supplier_sku?: string | null;
        supplier_cost_cents?: number | null;
        currency?: string;
        availability_mode?: Database["public"]["Enums"]["availability_mode"];
        sync_status?: Database["public"]["Enums"]["availability_sync_status"];
        stock_buffer?: number;
        auto_submit?: boolean;
        production_min_days?: number | null;
        production_max_days?: number | null;
        shipping_min_days?: number | null;
        shipping_max_days?: number | null;
        return_destination_mode?: string;
        active?: boolean;
        last_synced_at?: string | null;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        variant_id?: string;
        provider_id?: string;
        provider_product_id?: string | null;
        provider_variant_id?: string | null;
        supplier_sku?: string | null;
        supplier_cost_cents?: number | null;
        currency?: string;
        availability_mode?: Database["public"]["Enums"]["availability_mode"];
        sync_status?: Database["public"]["Enums"]["availability_sync_status"];
        stock_buffer?: number;
        auto_submit?: boolean;
        production_min_days?: number | null;
        production_max_days?: number | null;
        shipping_min_days?: number | null;
        shipping_max_days?: number | null;
        return_destination_mode?: string;
        active?: boolean;
        last_synced_at?: string | null;
        metadata?: Json;
        created_at?: string;
        updated_at?: string;
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
        }
      ];
    };
    publish_set_items: {
      Row: {
        publish_set_id: string;
        page_id: string;
        revision_id: string;
        previous_revision_id: string | null;
      };
      Insert: {
        publish_set_id: string;
        page_id: string;
        revision_id: string;
        previous_revision_id?: string | null;
      };
      Update: {
        publish_set_id?: string;
        page_id?: string;
        revision_id?: string;
        previous_revision_id?: string | null;
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
        }
      ];
    };
    publish_sets: {
      Row: {
        id: string;
        status: Database["public"]["Enums"]["publish_set_status"];
        note: string | null;
        created_by: string | null;
        created_at: string;
        published_at: string | null;
        failed_at: string | null;
      };
      Insert: {
        id?: string;
        status?: Database["public"]["Enums"]["publish_set_status"];
        note?: string | null;
        created_by?: string | null;
        created_at?: string;
        published_at?: string | null;
        failed_at?: string | null;
      };
      Update: {
        id?: string;
        status?: Database["public"]["Enums"]["publish_set_status"];
        note?: string | null;
        created_by?: string | null;
        created_at?: string;
        published_at?: string | null;
        failed_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "publish_sets_created_by_fkey";
          columns: ["created_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    refund_items: {
      Row: {
        id: string;
        refund_id: string;
        order_item_id: string;
        quantity: number;
        amount_cents: number;
        created_at: string;
      };
      Insert: {
        id?: string;
        refund_id: string;
        order_item_id: string;
        quantity: number;
        amount_cents: number;
        created_at?: string;
      };
      Update: {
        id?: string;
        refund_id?: string;
        order_item_id?: string;
        quantity?: number;
        amount_cents?: number;
        created_at?: string;
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
        }
      ];
    };
    refunds: {
      Row: {
        id: string;
        order_id: string;
        payment_id: string | null;
        stripe_refund_id: string | null;
        status: Database["public"]["Enums"]["refund_status"];
        amount_cents: number;
        currency: string;
        reason: string | null;
        initiated_by: string | null;
        created_at: string;
        succeeded_at: string | null;
        failed_at: string | null;
      };
      Insert: {
        id?: string;
        order_id: string;
        payment_id?: string | null;
        stripe_refund_id?: string | null;
        status?: Database["public"]["Enums"]["refund_status"];
        amount_cents: number;
        currency?: string;
        reason?: string | null;
        initiated_by?: string | null;
        created_at?: string;
        succeeded_at?: string | null;
        failed_at?: string | null;
      };
      Update: {
        id?: string;
        order_id?: string;
        payment_id?: string | null;
        stripe_refund_id?: string | null;
        status?: Database["public"]["Enums"]["refund_status"];
        amount_cents?: number;
        currency?: string;
        reason?: string | null;
        initiated_by?: string | null;
        created_at?: string;
        succeeded_at?: string | null;
        failed_at?: string | null;
      };
      Relationships: [
        {
          foreignKeyName: "refunds_initiated_by_fkey";
          columns: ["initiated_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
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
        }
      ];
    };
    return_items: {
      Row: {
        id: string;
        return_id: string;
        order_item_id: string;
        order_item_component_id: string | null;
        quantity: number;
        item_condition: Database["public"]["Enums"]["return_item_condition"];
        disposition: Database["public"]["Enums"]["return_disposition"];
        destination_provider_id: string | null;
        destination_location_id: string | null;
        restocked_at: string | null;
        notes: string | null;
        created_at: string;
      };
      Insert: {
        id?: string;
        return_id: string;
        order_item_id: string;
        order_item_component_id?: string | null;
        quantity: number;
        item_condition?: Database["public"]["Enums"]["return_item_condition"];
        disposition?: Database["public"]["Enums"]["return_disposition"];
        destination_provider_id?: string | null;
        destination_location_id?: string | null;
        restocked_at?: string | null;
        notes?: string | null;
        created_at?: string;
      };
      Update: {
        id?: string;
        return_id?: string;
        order_item_id?: string;
        order_item_component_id?: string | null;
        quantity?: number;
        item_condition?: Database["public"]["Enums"]["return_item_condition"];
        disposition?: Database["public"]["Enums"]["return_disposition"];
        destination_provider_id?: string | null;
        destination_location_id?: string | null;
        restocked_at?: string | null;
        notes?: string | null;
        created_at?: string;
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
        }
      ];
    };
    returns: {
      Row: {
        id: string;
        return_number: string;
        order_id: string;
        customer_id: string | null;
        status: Database["public"]["Enums"]["return_status"];
        reason: string;
        customer_note: string | null;
        requested_at: string;
        approved_at: string | null;
        received_at: string | null;
        closed_at: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        return_number?: string;
        order_id: string;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["return_status"];
        reason: string;
        customer_note?: string | null;
        requested_at?: string;
        approved_at?: string | null;
        received_at?: string | null;
        closed_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        return_number?: string;
        order_id?: string;
        customer_id?: string | null;
        status?: Database["public"]["Enums"]["return_status"];
        reason?: string;
        customer_note?: string | null;
        requested_at?: string;
        approved_at?: string | null;
        received_at?: string | null;
        closed_at?: string | null;
        created_at?: string;
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
        }
      ];
    };
    shipment_items: {
      Row: {
        shipment_id: string;
        fulfillment_group_item_id: string;
        quantity: number;
      };
      Insert: {
        shipment_id: string;
        fulfillment_group_item_id: string;
        quantity: number;
      };
      Update: {
        shipment_id?: string;
        fulfillment_group_item_id?: string;
        quantity?: number;
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
        }
      ];
    };
    shipments: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        status: Database["public"]["Enums"]["shipment_status"];
        carrier: string | null;
        service_level: string | null;
        tracking_number: string | null;
        tracking_url: string | null;
        shipped_at: string | null;
        delivered_at: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        status?: Database["public"]["Enums"]["shipment_status"];
        carrier?: string | null;
        service_level?: string | null;
        tracking_number?: string | null;
        tracking_url?: string | null;
        shipped_at?: string | null;
        delivered_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        status?: Database["public"]["Enums"]["shipment_status"];
        carrier?: string | null;
        service_level?: string | null;
        tracking_number?: string | null;
        tracking_url?: string | null;
        shipped_at?: string | null;
        delivered_at?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "shipments_fulfillment_group_id_fkey";
          columns: ["fulfillment_group_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_groups";
          referencedColumns: ["id"];
        }
      ];
    };
    site_settings: {
      Row: {
        key: string;
        value: Json;
        visibility: string;
        updated_by: string | null;
        updated_at: string;
      };
      Insert: {
        key: string;
        value: Json;
        visibility?: string;
        updated_by?: string | null;
        updated_at?: string;
      };
      Update: {
        key?: string;
        value?: Json;
        visibility?: string;
        updated_by?: string | null;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "site_settings_updated_by_fkey";
          columns: ["updated_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    stripe_events: {
      Row: {
        id: string;
        stripe_event_id: string;
        event_type: string;
        payload_hash: string | null;
        received_at: string;
        processed_at: string | null;
        processing_status: string;
        error_message: string | null;
      };
      Insert: {
        id?: string;
        stripe_event_id: string;
        event_type: string;
        payload_hash?: string | null;
        received_at?: string;
        processed_at?: string | null;
        processing_status?: string;
        error_message?: string | null;
      };
      Update: {
        id?: string;
        stripe_event_id?: string;
        event_type?: string;
        payload_hash?: string | null;
        received_at?: string;
        processed_at?: string | null;
        processing_status?: string;
        error_message?: string | null;
      };
      Relationships: [];
    };
    studio_users: {
      Row: {
        user_id: string;
        role: Database["public"]["Enums"]["studio_role"];
        display_name: string | null;
        active: boolean;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        user_id: string;
        role?: Database["public"]["Enums"]["studio_role"];
        display_name?: string | null;
        active?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        user_id?: string;
        role?: Database["public"]["Enums"]["studio_role"];
        display_name?: string | null;
        active?: boolean;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "studio_users_user_id_fkey";
          columns: ["user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    supplier_tasks: {
      Row: {
        id: string;
        fulfillment_group_id: string;
        status: Database["public"]["Enums"]["supplier_task_status"];
        ordering_url_snapshot: string | null;
        supplier_reference: string | null;
        expected_cost_cents: number | null;
        actual_cost_cents: number | null;
        currency: string;
        assigned_to: string | null;
        submitted_by: string | null;
        submitted_at: string | null;
        notes: string | null;
        created_at: string;
        updated_at: string;
      };
      Insert: {
        id?: string;
        fulfillment_group_id: string;
        status?: Database["public"]["Enums"]["supplier_task_status"];
        ordering_url_snapshot?: string | null;
        supplier_reference?: string | null;
        expected_cost_cents?: number | null;
        actual_cost_cents?: number | null;
        currency?: string;
        assigned_to?: string | null;
        submitted_by?: string | null;
        submitted_at?: string | null;
        notes?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Update: {
        id?: string;
        fulfillment_group_id?: string;
        status?: Database["public"]["Enums"]["supplier_task_status"];
        ordering_url_snapshot?: string | null;
        supplier_reference?: string | null;
        expected_cost_cents?: number | null;
        actual_cost_cents?: number | null;
        currency?: string;
        assigned_to?: string | null;
        submitted_by?: string | null;
        submitted_at?: string | null;
        notes?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "supplier_tasks_assigned_to_fkey";
          columns: ["assigned_to"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "supplier_tasks_fulfillment_group_id_fkey";
          columns: ["fulfillment_group_id"];
          isOneToOne: false;
          referencedRelation: "fulfillment_groups";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "supplier_tasks_submitted_by_fkey";
          columns: ["submitted_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        }
      ];
    };
    support_cases: {
      Row: {
        id: string;
        case_number: string;
        customer_id: string | null;
        order_id: string | null;
        status: Database["public"]["Enums"]["support_case_status"];
        subject: string;
        priority: string;
        created_at: string;
        updated_at: string;
        closed_at: string | null;
      };
      Insert: {
        id?: string;
        case_number?: string;
        customer_id?: string | null;
        order_id?: string | null;
        status?: Database["public"]["Enums"]["support_case_status"];
        subject: string;
        priority?: string;
        created_at?: string;
        updated_at?: string;
        closed_at?: string | null;
      };
      Update: {
        id?: string;
        case_number?: string;
        customer_id?: string | null;
        order_id?: string | null;
        status?: Database["public"]["Enums"]["support_case_status"];
        subject?: string;
        priority?: string;
        created_at?: string;
        updated_at?: string;
        closed_at?: string | null;
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
        }
      ];
    };
    support_messages: {
      Row: {
        id: string;
        case_id: string;
        author_type: Database["public"]["Enums"]["support_author_type"];
        author_user_id: string | null;
        body: string;
        customer_visible: boolean;
        created_at: string;
      };
      Insert: {
        id?: string;
        case_id: string;
        author_type: Database["public"]["Enums"]["support_author_type"];
        author_user_id?: string | null;
        body: string;
        customer_visible?: boolean;
        created_at?: string;
      };
      Update: {
        id?: string;
        case_id?: string;
        author_type?: Database["public"]["Enums"]["support_author_type"];
        author_user_id?: string | null;
        body?: string;
        customer_visible?: boolean;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "support_messages_author_user_id_fkey";
          columns: ["author_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "support_messages_case_id_fkey";
          columns: ["case_id"];
          isOneToOne: false;
          referencedRelation: "support_cases";
          referencedColumns: ["id"];
        }
      ];
    };
    support_notes: {
      Row: {
        id: string;
        case_id: string;
        author_user_id: string | null;
        body: string;
        created_at: string;
      };
      Insert: {
        id?: string;
        case_id: string;
        author_user_id?: string | null;
        body: string;
        created_at?: string;
      };
      Update: {
        id?: string;
        case_id?: string;
        author_user_id?: string | null;
        body?: string;
        created_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "support_notes_author_user_id_fkey";
          columns: ["author_user_id"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "support_notes_case_id_fkey";
          columns: ["case_id"];
          isOneToOne: false;
          referencedRelation: "support_cases";
          referencedColumns: ["id"];
        }
      ];
    };
    variant_financials: {
      Row: {
        variant_id: string;
        internal_unit_cost_cents: number | null;
        currency: string;
        notes: string | null;
        updated_by: string | null;
        updated_at: string;
      };
      Insert: {
        variant_id: string;
        internal_unit_cost_cents?: number | null;
        currency?: string;
        notes?: string | null;
        updated_by?: string | null;
        updated_at?: string;
      };
      Update: {
        variant_id?: string;
        internal_unit_cost_cents?: number | null;
        currency?: string;
        notes?: string | null;
        updated_by?: string | null;
        updated_at?: string;
      };
      Relationships: [
        {
          foreignKeyName: "variant_financials_updated_by_fkey";
          columns: ["updated_by"];
          isOneToOne: false;
          referencedRelation: "users";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "variant_financials_variant_id_fkey";
          columns: ["variant_id"];
          isOneToOne: false;
          referencedRelation: "product_variants";
          referencedColumns: ["id"];
        }
      ];
    };
    variant_option_values: {
      Row: {
        variant_id: string;
        option_id: string;
        option_value_id: string;
      };
      Insert: {
        variant_id: string;
        option_id: string;
        option_value_id: string;
      };
      Update: {
        variant_id?: string;
        option_id?: string;
        option_value_id?: string;
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
        }
      ];
    };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bump_page_section_version: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      claim_stripe_event: {
        Args: {
          p_stripe_event_id: string | null;
          p_event_type: string | null;
          p_payload_hash?: string | null;
        };
        Returns: boolean;
      };
      convert_paid_checkout: {
        Args: {
          p_checkout_session_id: string | null;
          p_stripe_checkout_session_id: string | null;
          p_stripe_payment_intent_id: string | null;
          p_paid_at?: string | null;
        };
        Returns: string;
      };
      finish_stripe_event: {
        Args: {
          p_stripe_event_id: string | null;
          p_processing_status: string | null;
          p_error_message?: string | null;
        };
        Returns: undefined;
      };
      mark_checkout_payment_pending: {
        Args: {
          p_checkout_session_id: string | null;
        };
        Returns: undefined;
      };
      next_bad_era_order_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      next_bad_era_return_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      next_bad_era_support_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      release_checkout_inventory: {
        Args: {
          p_checkout_session_id: string | null;
          p_checkout_status?: Database["public"]["Enums"]["checkout_snapshot_status"] | null;
        };
        Returns: Json;
      };
      release_expired_checkout_inventory: {
        Args: {
          p_limit?: number | null;
        };
        Returns: number;
      };
      reserve_checkout_inventory: {
        Args: {
          p_checkout_session_id: string | null;
        };
        Returns: Json;
      };
      studio_adjust_inventory: {
        Args: {
          p_variant_id: string | null;
          p_location_id: string | null;
          p_delta_on_hand: number | null;
          p_reason: Database["public"]["Enums"]["inventory_reason"] | null;
          p_note?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
    availability_mode: "api_sync" | "webhook_sync" | "manual" | "made_to_order";
    availability_sync_status: "ok" | "stale" | "error" | "manual";
    cart_status: "active" | "converted" | "abandoned" | "expired";
    checkout_snapshot_status: "prepared" | "stripe_created" | "payment_pending" | "paid" | "expired" | "payment_failed" | "cancelled";
    fulfillment_group_status: "pending_submission" | "submitted" | "accepted" | "in_production" | "shipped" | "delivered" | "action_required" | "rejected" | "cancelled";
    fulfillment_routing_mode: "internal" | "manual" | "automatic";
    inventory_mode: "stocked" | "supplier_stocked" | "made_to_order" | "manual_supplier" | "untracked" | "preorder";
    inventory_reason: "initial_stock" | "checkout_reserve" | "reservation_release" | "order_sale" | "stock_recount" | "found_stock" | "damaged" | "lost" | "return_restock" | "manual_correction" | "order_correction" | "cancellation_release" | "backorder_created" | "other";
    issue_severity: "info" | "warning" | "critical";
    media_kind: "image" | "video" | "document";
    media_status: "draft" | "approved" | "restricted" | "archived";
    order_fulfillment_status: "unfulfilled" | "partial" | "fulfilled" | "cancelled";
    order_refund_status: "none" | "partial" | "full";
    order_return_status: "none" | "requested" | "approved" | "in_transit" | "received" | "partial" | "returned" | "rejected" | "closed";
    order_source: "storefront" | "studio" | "import";
    page_kind: "page" | "global";
    payment_status: "pending" | "paid" | "partially_refunded" | "refunded" | "failed";
    product_kind: "standard" | "bundle";
    product_status: "draft" | "active" | "archived";
    provider_connection_mode: "internal" | "api" | "manual";
    provider_health_status: "connected" | "degraded" | "error" | "manual" | "disabled";
    provider_lifecycle_status: "draft" | "sample_testing" | "test" | "live_manual" | "live_automated" | "disabled";
    provider_type: "internal" | "api" | "manual";
    publish_set_status: "prepared" | "published" | "failed" | "rolled_back";
    recovery_result: "started" | "succeeded" | "failed" | "no_op" | "needs_review";
    refund_status: "pending" | "succeeded" | "failed" | "cancelled";
    reservation_status: "active" | "converted" | "released" | "expired" | "payment_pending";
    return_disposition: "restock" | "damaged" | "nonrestockable" | "manual_review";
    return_item_condition: "unopened" | "resellable" | "damaged" | "unknown";
    return_status: "requested" | "approved" | "rejected" | "in_transit" | "received" | "closed" | "cancelled";
    revision_state: "draft" | "published" | "archived";
    shipment_status: "pending" | "shipped" | "delivered" | "exception" | "returned";
    studio_role: "owner" | "content" | "fulfillment" | "support";
    supplier_task_status: "required" | "in_progress" | "submitted" | "completed" | "cancelled";
    support_author_type: "customer" | "studio_user" | "system";
    support_case_status: "open" | "waiting_customer" | "waiting_internal" | "resolved" | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
