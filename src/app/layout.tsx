import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/design-system.css";
import { getServerSession } from "next-auth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientProviders from "./ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Zillowlike - Petrolina e Juazeiro",
  description: "Busca e cadastro de imóveis com mapa, inspirado no Zillow",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Zillowlike - Encontre imóveis em Petrolina e Juazeiro",
    description: "Busque por cidade, bairro ou endereço e explore no mapa.",
    url: "/",
    siteName: "Zillowlike",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zillowlike - Encontre imóveis em Petrolina e Juazeiro",
    description: "Busque por cidade, bairro ou endereço e explore no mapa.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {/* Skip link for keyboard users */}
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:text-blue-700 focus:ring-2 focus:ring-blue-600 focus:px-3 focus:py-2 rounded">
          Pular para o conteúdo
        </a>
        <ClientProviders session={session}>
          <main id="content">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
