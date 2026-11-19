import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Backdrop } from "@/components/layout/Backdrop";
import { SITE } from "@/config/site";
import { DebugBoundary } from "@/components/DebugBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Morrow — ${SITE.tagline}`, template: `%s · Morrow` },
  description: SITE.description,
  openGraph: { type: "website", siteName: "Morrow", url: SITE.url, title: `Morrow — ${SITE.tagline}`, description: SITE.description },
  twitter: { card: "summary_large_image", site: "@morrowswap", creator: "@morrowswap", title: `Morrow — ${SITE.tagline}`, description: SITE.description },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0d0e10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Backdrop />
        <DebugBoundary>
          <Providers>
            <Nav />
            <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
            <Footer />
          </Providers>
        </DebugBoundary>
      </body>
    </html>
  );
}
