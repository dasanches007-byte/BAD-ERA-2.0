import "server-only";

import { createAdminClient } from "@/lib/db/admin";
import {
  CHROME_TEMPLATE,
  PRODUCT_TEMPLATE,
  SHOP_TEMPLATE,
} from "@/lib/cms/edit-targets";

/**
 * Pages whose words became editable after the content model was first
 * seeded: the menu and footer, the Shop page, and the product page wording.
 *
 * They are registered by the application, not by a migration, because the
 * application is what needs them: the routes exist in code, and the editor
 * that opens them is the code below. Registering is an idempotent insert of
 * any row that is missing — never an update — so a title the owner has
 * changed, or a page already published, is left exactly as it is.
 *
 * Only rows in `pages` are written. No revision or section is created here:
 * the first draft is opened by the editor (`ensure_page_draft`), starts from
 * the shipped wording (`TEMPLATE_DEFAULTS`), and nothing reaches customers
 * until the owner presses Publish. Until then the storefront renders the same
 * shipped wording, so registering a page changes nothing anyone can see.
 */

export type EditablePage = {
  pageKey: string;
  title: string;
  /** Where it shows. Null for pages that are not one URL. */
  route: string | null;
  kind: "page" | "global";
  templateKey: string;
  /** One line in Studio → Site, so the owner knows what each one covers. */
  blurb: string;
};

export const EDITABLE_PAGES: readonly EditablePage[] = [
  {
    pageKey: "site",
    title: "Menu & footer",
    route: null,
    kind: "global",
    templateKey: CHROME_TEMPLATE,
    blurb: "The menu at the top and the footer at the bottom of every page, including social links.",
  },
  {
    pageKey: "shop",
    title: "Shop",
    route: "/shop",
    kind: "page",
    templateKey: SHOP_TEMPLATE,
    blurb: "The words above your products. Products themselves are in Studio → Products.",
  },
  {
    pageKey: "product",
    title: "Product pages",
    route: null,
    kind: "page",
    templateKey: PRODUCT_TEMPLATE,
    blurb: "Words every product page shares. Names, prices and photos are in Studio → Products.",
  },
];

export function isEditablePage(pageKey: string): boolean {
  return EDITABLE_PAGES.some((page) => page.pageKey === pageKey);
}

/**
 * Make sure every page in `EDITABLE_PAGES` has its row. One read when they
 * already exist, which after the first visit is always.
 */
export async function ensureEditablePages(): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("pages")
    .select("page_key")
    .in(
      "page_key",
      EDITABLE_PAGES.map((page) => page.pageKey),
    );
  if (error) throw error;

  const present = new Set((data ?? []).map((row) => String(row.page_key)));
  const missing = EDITABLE_PAGES.filter((page) => !present.has(page.pageKey));
  if (missing.length === 0) return;

  const { error: insertError } = await db.from("pages").upsert(
    missing.map((page) => ({
      page_key: page.pageKey,
      page_kind: page.kind,
      title: page.title,
      route: page.route,
      template_key: page.templateKey,
      is_system: true,
    })),
    // Two tabs registering at once is not an error: the second does nothing.
    { onConflict: "page_key", ignoreDuplicates: true },
  );
  if (insertError) throw insertError;
}
