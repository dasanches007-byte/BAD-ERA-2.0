import { notImplemented, toErrorResponse } from "@/lib/errors/http";

export const runtime = "nodejs";

/**
 * Fulfillment provider webhook.
 *
 * Phase 6 contract: resolve the adapter from the registry by providerKey, let
 * the adapter verify authenticity and deduplicate against provider_events, then
 * map the provider status onto a canonical BAD ERA fulfillment state.
 * Provider-specific handling stays inside the adapter (Master Spec §14.5.3).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ providerKey: string }> },
) {
  try {
    await params;
    return notImplemented("Phase 6");
  } catch (error) {
    return toErrorResponse(error);
  }
}
