import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/returns` in the public IA (Master Spec §2).
 *
 * Starting a return requires knowing which order it is against, so this is a
 * signpost rather than a page of its own: it sends the visitor to their own
 * returns, which redirects to sign-in when they are signed out.
 *
 * The POLICY text lives at `/returns-policy`, which is a separate, public,
 * indexable document. Two different things: what the rules are, and doing it.
 */
export default function ReturnsPage() {
  redirect("/account/returns");
}
