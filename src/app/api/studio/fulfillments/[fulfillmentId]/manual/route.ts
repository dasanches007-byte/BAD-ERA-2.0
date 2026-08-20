import { requireStudioOwner } from "@/lib/auth/studio";
import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Manual supplier submission / manual takeover.
 *
 * Phase 6 contract: Mark as Submitted requires a supplier reference, stores
 * submitted_at + actor + cost snapshot, and writes an audit event. SUBMITTED is
 * not SHIPPED (Master Spec §10.5.3).
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
