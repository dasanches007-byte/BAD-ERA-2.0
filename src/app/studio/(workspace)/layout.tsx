import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StudioNav } from "@/components/studio/studio-nav";
import { StudioTopBar } from "@/components/studio/top-bar";
import { getStudioIdentityForRender } from "@/lib/auth/studio";

/**
 * Studio chrome: navigation rail, top bar and the main landmark.
 *
 * Every Studio screen except the Site Editor's preview frame sits in this
 * group. The gate (sign-in, second factor) is the parent `studio/layout.tsx`;
 * the identity read here is the same request-scoped one, not a second call to
 * Supabase Auth.
 */
export default async function StudioWorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const identity = await getStudioIdentityForRender();
  // The gate above has already redirected; this only satisfies the type.
  if (!identity) redirect("/sign-in?next=/studio");

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink lg:flex-row">
      {/* Studio has a long nav rail; skipping it matters more here, not less. */}
      <a href="#main-content" className="skip-link label">
        Skip to content
      </a>
      <StudioNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudioTopBar
          displayName={identity.displayName}
          environment={
            process.env.NODE_ENV === "production" ? "production" : "development"
          }
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-6 py-8 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
