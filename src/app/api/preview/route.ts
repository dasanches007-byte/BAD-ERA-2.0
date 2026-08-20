import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Signed draft preview.
 *
 * Phase 4 contract: verify a signed preview token, enable draft mode, and never
 * pollute the public cache or SEO (Master Spec §11.4.5, §13.1).
 */
export async function GET() {
  try {
    return notImplemented("Phase 4");
  } catch (error) {
    return toErrorResponse(error);
  }
}
