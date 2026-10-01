import Link from "next/link";
import { cookies } from "next/headers";

import { getStudioIdentityForRender } from "@/lib/auth/studio";

/**
 * "Edit this page" — shown on a Studio-managed storefront page to the signed-in
 * owner, and to nobody else.
 *
 * It is how the owner starts from the live site: browse to the page, press
 * this, and the same page opens in the on-page editor. It is a plain link; the
 * editor route sits behind the Studio gate and checks ownership again, so this
 * button grants nothing by being visible.
 *
 * Cheap for everyone else: a visitor without a Supabase session cookie costs
 * one cookie-name check and no network call. Only a signed-in visitor's
 * session is verified, and only an active owner sees the button.
 */
export async function OwnerEditLink({ pageKey }: { pageKey: string }) {
  const jar = await cookies();
  const hasSession = jar
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  if (!hasSession) return null;

  const owner = await getStudioIdentityForRender().catch(() => null);
  if (!owner) return null;

  return (
    <Link
      href={`/studio/edit/${encodeURIComponent(pageKey)}`}
      prefetch={false}
      className="label fixed bottom-5 right-5 z-[60] inline-flex min-h-12 items-center gap-2.5 border border-line-strong bg-surface-overlay px-5 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.5)] transition-colors hover:border-ink"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z" />
      </svg>
      Edit this page
    </Link>
  );
}
