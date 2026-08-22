import type { Enums } from "@/lib/db/generated.types";

/**
 * Support (Master Spec §9.2).
 *
 * Owner-first and deliberately small: no teams, no SLAs, no agent routing. The
 * owner is the only operator in v1 and overbuilding here would add ceremony
 * without adding capability.
 *
 * The one rule that matters: INTERNAL NOTES ARE NEVER CUSTOMER-VISIBLE. They
 * live in a different table from messages, so a rendering mistake cannot leak
 * them.
 */

export type SupportCaseSummary = {
  id: string;
  caseNumber: string;
  subject: string;
  status: Enums<"support_case_status">;
  priority: string;
  customerEmail: string | null;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type SupportMessage = {
  id: string;
  authorType: Enums<"support_author_type">;
  body: string;
  customerVisible: boolean;
  createdAt: string;
};

export type SupportNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type SupportCaseDetail = SupportCaseSummary & {
  customerId: string | null;
  orderId: string | null;
  messages: SupportMessage[];
  /** Studio-only. Never passed to a customer-facing component. */
  notes: SupportNote[];
};

export const SUPPORT_STATUS_LABEL: Record<Enums<"support_case_status">, string> = {
  open: "Open",
  waiting_customer: "Waiting on customer",
  waiting_internal: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const SUPPORT_STATUSES: Enums<"support_case_status">[] = [
  "open",
  "waiting_internal",
  "waiting_customer",
  "resolved",
  "closed",
];
