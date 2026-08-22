import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type {
  IssueRow,
  ProviderCard,
  ReadyToShipRow,
  ShipmentRow,
  SupplierTaskRow,
} from "@/lib/fulfillment/types";

/**
 * Fulfillment workspace reads (Master Spec §10.4, §10.5).
 *
 * Studio-only. These carry supplier cost and provider identity, which must
 * never reach the storefront or a client bundle.
 *
 * Every count here is derived from real records. Provider metrics that cannot
 * be computed truthfully are reported as unavailable rather than estimated
 * (Master Spec §10.4.7).
 */

export async function listProviders(): Promise<ProviderCard[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("fulfillment_providers")
    .select(
      `id, provider_key, name, provider_type, connection_mode, lifecycle_status,
       health_status, ordering_url,
       provider_variant_mappings(id, variant_id, active, last_synced_at,
         product_variants(product_id)),
       fulfillment_groups(id, canonical_status,
         fulfillment_issues(id, resolved_at))`,
    )
    .order("name");

  if (error) throw error;

  return (data ?? []).map((p) => {
    const mappings = (p.provider_variant_mappings ?? []) as {
      id: string;
      variant_id: string;
      active: boolean;
      last_synced_at: string | null;
      product_variants: { product_id: string } | null;
    }[];
    const groups = (p.fulfillment_groups ?? []) as {
      id: string;
      canonical_status: string;
      fulfillment_issues: { id: string; resolved_at: string | null }[] | null;
    }[];

    const activeMappings = mappings.filter((m) => m.active);
    const productIds = new Set(
      activeMappings
        .map((m) => m.product_variants?.product_id)
        .filter((id): id is string => Boolean(id)),
    );

    const openStatuses = new Set([
      "pending_submission",
      "submitted",
      "accepted",
      "in_production",
      "action_required",
    ]);

    const actionRequired = groups.reduce((count, g) => {
      const unresolved = (g.fulfillment_issues ?? []).filter(
        (i) => i.resolved_at === null,
      ).length;
      return count + unresolved;
    }, 0);

    // Internal and manual providers have no synchronisation. Reporting a
    // timestamp for them would be inventing a fact (Master Spec §10.4.3).
    const lastSyncedAt =
      p.connection_mode === "api"
        ? mappings
            .map((m) => m.last_synced_at)
            .filter((t): t is string => Boolean(t))
            .sort()
            .at(-1) ?? null
        : null;

    return {
      id: p.id,
      providerKey: p.provider_key,
      name: p.name,
      providerType: p.provider_type,
      connectionMode: p.connection_mode,
      lifecycleStatus: p.lifecycle_status,
      healthStatus: p.health_status,
      orderingUrl: p.ordering_url,
      mappedVariantCount: activeMappings.length,
      mappedProductCount: productIds.size,
      openFulfillments: groups.filter((g) => openStatuses.has(g.canonical_status))
        .length,
      actionRequiredCount: actionRequired,
      lastSyncedAt,
    };
  });
}

export async function getProvider(providerId: string): Promise<ProviderCard | null> {
  const all = await listProviders();
  return all.find((p) => p.id === providerId) ?? null;
}

/**
 * Paid, internally-stocked groups awaiting the owner's own fulfillment
 * (Master Spec §8.1). This is the Pirate Ship queue.
 */
export async function listReadyToShip(): Promise<ReadyToShipRow[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("fulfillment_groups")
    .select(
      `id, canonical_status, effective_shipping_address_snapshot,
       inventory_locations(name),
       orders!inner(id, order_number, paid_at, customer_email, payment_status),
       fulfillment_group_items(
         quantity_required,
         product_variants(title, sku, products(title))
       )`,
    )
    .eq("routing_mode", "internal")
    .eq("orders.payment_status", "paid")
    .in("canonical_status", ["pending_submission", "accepted", "in_production"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((g) => {
    const order = g.orders as unknown as {
      id: string;
      order_number: string;
      paid_at: string | null;
      customer_email: string;
    };
    const location = g.inventory_locations as unknown as { name: string } | null;
    const items = (g.fulfillment_group_items ?? []) as unknown as {
      quantity_required: number;
      product_variants: {
        title: string;
        sku: string | null;
        products: { title: string };
      } | null;
    }[];

    return {
      fulfillmentGroupId: g.id,
      orderId: order.id,
      orderNumber: order.order_number,
      orderPaidAt: order.paid_at,
      customerEmail: order.customer_email,
      locationName: location?.name ?? null,
      canonicalStatus: g.canonical_status,
      items: items.map((i) => ({
        productTitle: i.product_variants?.products.title ?? "Unknown product",
        variantTitle: i.product_variants?.title ?? "Unknown variant",
        sku: i.product_variants?.sku ?? null,
        quantity: i.quantity_required,
      })),
      shippingAddress: (g.effective_shipping_address_snapshot ?? {}) as Record<
        string,
        unknown
      >,
    };
  });
}

/**
 * Manual supplier tasks (Master Spec §10.5.2).
 *
 * A verified paid order routed to MANUAL_SUPPLIER creates exactly one durable
 * task. Opening the supplier portal changes nothing; only an explicit
 * Mark as Submitted moves state.
 */
export async function listSupplierTasks(
  includeCompleted = false,
): Promise<SupplierTaskRow[]> {
  const db = createAdminClient();

  let query = db
    .from("supplier_tasks")
    .select(
      `id, status, ordering_url_snapshot, supplier_reference, expected_cost_cents,
       currency, submitted_at,
       fulfillment_groups!inner(
         id, effective_shipping_address_snapshot,
         fulfillment_providers(id, name),
         orders!inner(id, order_number, paid_at, customer_email),
         fulfillment_group_items(
           quantity_required,
           product_variants(
             title, sku, products(title),
             provider_variant_mappings(supplier_sku, provider_id)
           )
         )
       )`,
    )
    .order("created_at", { ascending: true });

  if (!includeCompleted) {
    query = query.in("status", ["required", "in_progress"]);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((t) => {
    const group = t.fulfillment_groups as unknown as {
      id: string;
      effective_shipping_address_snapshot: unknown;
      fulfillment_providers: { id: string; name: string } | null;
      orders: {
        id: string;
        order_number: string;
        paid_at: string | null;
        customer_email: string;
      };
      fulfillment_group_items: {
        quantity_required: number;
        product_variants: {
          title: string;
          sku: string | null;
          products: { title: string };
          provider_variant_mappings: {
            supplier_sku: string | null;
            provider_id: string;
          }[] | null;
        } | null;
      }[];
    };

    const providerId = group.fulfillment_providers?.id ?? "";

    return {
      taskId: t.id,
      fulfillmentGroupId: group.id,
      status: t.status,
      orderId: group.orders.id,
      orderNumber: group.orders.order_number,
      orderPaidAt: group.orders.paid_at,
      customerEmail: group.orders.customer_email,
      providerId,
      providerName: group.fulfillment_providers?.name ?? "Unknown provider",
      orderingUrl: t.ordering_url_snapshot,
      supplierReference: t.supplier_reference,
      expectedCostCents:
        t.expected_cost_cents === null ? null : Number(t.expected_cost_cents),
      currency: t.currency,
      submittedAt: t.submitted_at,
      items: (group.fulfillment_group_items ?? []).map((i) => ({
        productTitle: i.product_variants?.products.title ?? "Unknown product",
        variantTitle: i.product_variants?.title ?? "Unknown variant",
        // The supplier SKU for THIS provider, not whichever mapping came first.
        supplierSku:
          i.product_variants?.provider_variant_mappings?.find(
            (m) => m.provider_id === providerId,
          )?.supplier_sku ?? null,
        quantity: i.quantity_required,
      })),
      shippingAddress: (group.effective_shipping_address_snapshot ?? {}) as Record<
        string,
        unknown
      >,
    };
  });
}

/** Unresolved fulfillment exceptions, oldest customer-impacting first. */
export async function listIssues(resolved = false): Promise<IssueRow[]> {
  const db = createAdminClient();

  const query = db
    .from("fulfillment_issues")
    .select(
      `id, issue_code, severity, retryable, owner_summary, opened_at,
       last_attempt_at, resolved_at, resolution_type,
       fulfillment_providers(name),
       fulfillment_groups!inner(
         id,
         orders!inner(id, order_number, customer_email, payment_status)
       ),
       fulfillment_recovery_attempts(id)`,
    )
    .order("opened_at", { ascending: true });

  const { data, error } = resolved
    ? await query.not("resolved_at", "is", null)
    : await query.is("resolved_at", null);

  if (error) throw error;

  return (data ?? []).map((i) => {
    const group = i.fulfillment_groups as unknown as {
      id: string;
      orders: {
        id: string;
        order_number: string;
        customer_email: string;
        payment_status: string;
      };
    };
    const provider = i.fulfillment_providers as unknown as { name: string } | null;
    const attempts = (i.fulfillment_recovery_attempts ?? []) as { id: string }[];

    return {
      issueId: i.id,
      fulfillmentGroupId: group.id,
      orderId: group.orders.id,
      orderNumber: group.orders.order_number,
      customerEmail: group.orders.customer_email,
      providerName: provider?.name ?? "Unknown provider",
      issueCode: i.issue_code,
      severity: i.severity,
      retryable: i.retryable,
      ownerSummary: i.owner_summary,
      openedAt: i.opened_at,
      lastAttemptAt: i.last_attempt_at,
      attemptCount: attempts.length,
      paymentStatus: group.orders.payment_status,
      resolvedAt: i.resolved_at,
      resolutionType: i.resolution_type,
    };
  });
}

export async function listShipments(limit = 100): Promise<ShipmentRow[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("shipments")
    .select(
      `id, carrier, tracking_number, tracking_url, status, shipped_at, delivered_at,
       fulfillment_groups!inner(id, orders!inner(id, order_number))`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((s) => {
    const group = s.fulfillment_groups as unknown as {
      id: string;
      orders: { id: string; order_number: string };
    };
    return {
      id: s.id,
      fulfillmentGroupId: group.id,
      orderId: group.orders.id,
      orderNumber: group.orders.order_number,
      carrier: s.carrier,
      trackingNumber: s.tracking_number,
      trackingUrl: s.tracking_url,
      status: s.status,
      shippedAt: s.shipped_at,
      deliveredAt: s.delivered_at,
    };
  });
}

/** Counts for the Fulfillment overview and navigation badges. */
export async function getFulfillmentCounts(): Promise<{
  readyToShip: number;
  supplierOrders: number;
  actionRequired: number;
  shipped: number;
}> {
  const db = createAdminClient();

  const [ready, supplier, issues, shipped] = await Promise.all([
    db
      .from("fulfillment_groups")
      .select("id, orders!inner(payment_status)", { count: "exact", head: true })
      .eq("routing_mode", "internal")
      .eq("orders.payment_status", "paid")
      .in("canonical_status", ["pending_submission", "accepted", "in_production"]),
    db
      .from("supplier_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["required", "in_progress"]),
    db
      .from("fulfillment_issues")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    db
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .in("status", ["shipped", "delivered"]),
  ]);

  if (ready.error) throw ready.error;
  if (supplier.error) throw supplier.error;
  if (issues.error) throw issues.error;
  if (shipped.error) throw shipped.error;

  return {
    readyToShip: ready.count ?? 0,
    supplierOrders: supplier.count ?? 0,
    actionRequired: issues.count ?? 0,
    shipped: shipped.count ?? 0,
  };
}
