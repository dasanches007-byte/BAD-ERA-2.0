import { requireStudioOwner } from "@/lib/auth/studio";
import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Retry a failed provider submission.
 *
 * Phase 6 contract: reuse the SAME submission key / idempotency context so
 * repeated clicks can never create a second provider order, and reconcile
 * against the provider before resubmitting after a timeout
 * (Master Spec §10.5.6, §14.5.17).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> },
) {
  try {
    await requireStudioOwner();
    await params;
    return notImplemented("Phase 6");
  } catch (error) {
    return toErrorResponse(error);
  }
}
