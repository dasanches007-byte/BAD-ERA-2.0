import type { ReactNode } from "react";

/**
 * The preview renders inside an iframe and must present the STOREFRONT, not
 * Studio. This layout deliberately renders children bare so the parent Studio
 * chrome (navigation rail and top bar) does not appear inside the frame.
 *
 * It is not an authorization boundary — the preview page re-checks the Studio
 * identity itself, and the Studio layout above still gates the segment.
 */
export default function PreviewLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
