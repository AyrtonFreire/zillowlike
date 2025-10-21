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
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js precisa de unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", // permite previews blob: e imagens remotas
    "font-src 'self' data:",
    // permite chamadas para Vercel vitals e Cloudinary API; adicione outros backends aqui se necessário
    "connect-src 'self' https://vitals.vercel-insights.com https://api.cloudinary.com",
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
