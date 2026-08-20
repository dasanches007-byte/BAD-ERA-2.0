import { NextResponse } from "next/server";

import { StudioAuthorizationError } from "@/lib/auth/studio";

/**
 * Map a thrown domain error to a safe HTTP response.
 *
 * Never leak an internal message, a provider payload or a database error to the
 * client. Diagnostics stay server-side (Master Spec §10.5.9, §17).
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof StudioAuthorizationError) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  console.error("[bad-era] unhandled route error", error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/** Marker for a route that exists but is not implemented in this phase. */
export function notImplemented(phase: string): NextResponse {
  return NextResponse.json(
    { error: "not_implemented", implementedIn: phase },
    { status: 501 },
  );
}
