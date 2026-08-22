import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import type {
  SupportCaseDetail,
  SupportCaseSummary,
} from "@/lib/support/types";

/**
 * Support reads.
 *
 * `getSupportCase` returns internal notes and is STUDIO ONLY.
 * `getCustomerSupportCase` returns customer-visible messages only and never
 * touches the notes table at all.
 */

export async function listSupportCases(): Promise<SupportCaseSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("support_cases")
    .select(
      `id, case_number, subject, status, priority, created_at, updated_at,
       customers(email), orders(order_number), support_messages(id)`,
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((c) => {
    const customer = c.customers as unknown as { email: string } | null;
    const order = c.orders as unknown as { order_number: string } | null;
    return {
      id: c.id,
      caseNumber: c.case_number,
      subject: c.subject,
      status: c.status,
      priority: c.priority,
      customerEmail: customer?.email ?? null,
      orderNumber: order?.order_number ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      messageCount: ((c.support_messages ?? []) as { id: string }[]).length,
    };
  });
}

/** Studio view. Includes internal notes. */
export async function getSupportCase(
  caseId: string,
): Promise<SupportCaseDetail | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("support_cases")
    .select(
      `id, case_number, subject, status, priority, created_at, updated_at,
       customer_id, order_id,
       customers(email), orders(order_number),
       support_messages(id, author_type, body, customer_visible, created_at),
       support_notes(id, body, created_at)`,
    )
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const customer = data.customers as unknown as { email: string } | null;
  const order = data.orders as unknown as { order_number: string } | null;
  const messages = (data.support_messages ?? []) as unknown as SupportCaseDetail["messages"];
  const notes = (data.support_notes ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
  }[];

  return {
    id: data.id,
    caseNumber: data.case_number,
    subject: data.subject,
    status: data.status,
    priority: data.priority,
    customerId: data.customer_id,
    orderId: data.order_id,
    customerEmail: customer?.email ?? null,
    orderNumber: order?.order_number ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    messageCount: messages.length,
    messages: (
      messages as unknown as {
        id: string;
        author_type: SupportCaseDetail["messages"][number]["authorType"];
        body: string;
        customer_visible: boolean;
        created_at: string;
      }[]
    )
      .map((m) => ({
        id: m.id,
        authorType: m.author_type,
        body: m.body,
        customerVisible: m.customer_visible,
        createdAt: m.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    notes: notes
      .map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/** Customer's own cases. Never includes internal notes. */
export async function listCustomerSupportCases(
  customerId: string,
): Promise<SupportCaseSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("support_cases")
    .select(
      `id, case_number, subject, status, priority, created_at, updated_at,
       orders(order_number), support_messages(id)`,
    )
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((c) => {
    const order = c.orders as unknown as { order_number: string } | null;
    return {
      id: c.id,
      caseNumber: c.case_number,
      subject: c.subject,
      status: c.status,
      priority: c.priority,
      customerEmail: null,
      orderNumber: order?.order_number ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      messageCount: ((c.support_messages ?? []) as { id: string }[]).length,
    };
  });
}
