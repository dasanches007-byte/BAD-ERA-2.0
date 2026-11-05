import { renderSections } from "@/components/sections/render";
import type { SiteChrome } from "@/lib/cms/default-pages";

/**
 * The storefront around a page: the menu, the page, the footer.
 *
 * One component for the public layout and both editors, so the menu and
 * footer an owner edits are drawn exactly as customers get them. They come
 * from the "Menu & footer" page (`getSiteChrome`) and render through
 * `renderSections` like every other section.
 *
 * `editChrome` is true only in the editors, and only when the page being
 * edited IS the menu and footer — elsewhere they are shown, not edited.
 */
export function StorefrontFrame({
  chrome,
  editChrome = false,
  skipLink = false,
  children,
}: {
  chrome: SiteChrome;
  editChrome?: boolean;
  skipLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      {skipLink ? (
        // First focusable element on every storefront page (Spec §19).
        // Without it, reaching the content by keyboard means tabbing the
        // entire header on every navigation.
        <a href="#main-content" className="skip-link label">
          Skip to content
        </a>
      ) : null}
      {renderSections([chrome.header], [], { editing: editChrome })}
      {/*
        tabIndex={-1} makes the landmark focusable as a skip TARGET without
        putting it in the tab order — the link moves focus here, so the next
        Tab continues from the content rather than restarting at the header.
      */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      {renderSections([chrome.footer], [], { editing: editChrome })}
    </div>
  );
}
