import { requireStudioOwner } from "@/lib/auth/studio";
import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Publish draft content.
 *
 * Phase 8 contract: validate, create an immutable revision snapshot, move the
 * live pointer and revalidate affected paths. If any step fails, live remains
 * on the last known-good revision (Master Spec §11.4.5, §13.1).
 */
export async function POST() {
  try {
    await requireStudioOwner();
    return notImplemented("Phase 8");
  } catch (error) {
    return toErrorResponse(error);
  }
}
