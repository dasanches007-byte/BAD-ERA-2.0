import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

/**
 * Editorial display serif. Used for headlines and brand moments.
 *
 * This font must NEVER be used to reconstruct the BAD ERA logos. They are
 * owner-supplied locked artwork, always rendered from the source assets
 * (`BrandMark`, `SecondaryBrandMark`; brand/logo/README.md).
 */
const display = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bad-era-display",
});

/** Compact sans for utility labels, navigation and operational Studio text. */
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bad-era-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "BAD ERA",
    template: "%s — BAD ERA",
  },
  description:
    "A California based brand built on authenticity, purpose, and progression.",
  openGraph: {
    siteName: "BAD ERA",
    type: "website",
  },
  // Icons use the compact BAD secondary artwork, never a redrawn mark: 180 and
  // 512 are the owner's square image scaled; 32 is the same mark on black.
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
