import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Providers } from "@/components/Providers";

const display = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AchievHQ — Steam Achievements",
  description: "Track Steam achievements, rarity, and progress.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "AchievHQ",
  },
};

export const viewport: Viewport = {
  themeColor: "#00b4d8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen min-h-[100dvh] bg-bg font-display text-zinc-100 antialiased supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <Providers>
          <OfflineBanner />
          <Navbar />
          <main
            id="main-content"
            className="mx-auto max-w-6xl animate-fade-up px-4 py-6 sm:px-6 sm:py-8 md:py-10"
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
