/** Client-safe shapes for the order confirmation email's status. */

export type OrderEmailState = "received" | "sent" | "failed" | "ignored";

export type OrderEmailStatus = {
  state: OrderEmailState;
  at: string;
  error: string | null;
} | null;
