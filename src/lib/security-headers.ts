import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Adiciona headers de segurança às respostas
 * Baseado nas recomendações do Helmet.js
 */
export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    // Scripts do Next e inline necessários
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    // Estilos inline + Google Fonts (alguns navegadores usam style-src-elem)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'self' 'unsafe-inline'",
    // Imagens locais, blob (previews) e remotas (Cloudinary, etc.)
    "img-src 'self' data: blob: https: https://res.cloudinary.com",
    // Fontes locais + Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    // Conexões XHR/fetch/WebSocket necessárias (Vercel vitals, Cloudinary API, Supabase, Pusher)
    "connect-src 'self' https://vitals.vercel-insights.com https://api.cloudinary.com https://*.supabase.co https://*.pusher.com wss://*.pusher.com",
    // Ifra mes bloqueados
    "frame-ancestors 'none'",
  ];
  
  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.join("; ")
  );

  // Strict Transport Security (HTTPS only)
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  // X-Frame-Options (clickjacking protection)
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options (prevent MIME sniffing)
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // X-DNS-Prefetch-Control
  response.headers.set("X-DNS-Prefetch-Control", "on");

  return response;
}
