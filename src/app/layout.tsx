import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "../styles/design-system.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientProviders from "./ClientProviders";
import LinkToOverlayInterceptor from "@/components/LinkToOverlayInterceptor";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fontDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
export const metadata: Metadata = {
  title: "OggaHub - Petrolina e Juazeiro",
  description: "Seu hub imobiliário em Petrolina e Juazeiro.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://oggahub.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "OggaHub - Encontre imóveis em Petrolina e Juazeiro",
    description: "Busque por cidade, bairro ou endereço e explore no mapa.",
    url: "/",
    siteName: "OggaHub",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OggaHub - Encontre imóveis em Petrolina e Juazeiro",
    description: "Busque por cidade, bairro ou endereço e explore no mapa.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}>
        {/* Skip link for keyboard users */}
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:text-blue-700 focus:ring-2 focus:ring-blue-600 focus:px-3 focus:py-2 rounded">
          Pular para o conteúdo
        </a>
        {/* Global live region for polite status/toast updates */}
        <div aria-live="polite" className="sr-only" />
        <ClientProviders session={session}>
          <LinkToOverlayInterceptor />
          <main id="content" role="main">{children}</main>
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
