import { requireStudioOwner } from "@/lib/auth/studio";
import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Owner-audited inventory adjustment.
 *
 * Phase 3 contract: validate the reason against the allowed adjustment reasons,
 * then call studio_adjust_inventory(), which blocks system-only movement
 * reasons and writes an append-only ledger entry (Master Spec §10.3.4).
 */
export async function POST() {
  try {
    await requireStudioOwner();
    return notImplemented("Phase 3");
  } catch (error) {
    return toErrorResponse(error);
  }
}
