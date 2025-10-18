import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { applySecurityHeaders } from "@/lib/security-headers";

// Rotas que requerem autenticação
const protectedPaths = ["/broker", "/admin", "/owner"];

// Mapeamento de paths para roles permitidos
const roleBasedPaths: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/broker": ["REALTOR", "ADMIN"],
  "/owner": ["OWNER", "ADMIN"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip onboarding page and home page
  if (pathname === "/onboarding" || pathname === "/" || pathname === "/auth/signin") {
    return NextResponse.next();
  }

  // Checa se é uma rota protegida
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Obtém token JWT do NextAuth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Se não autenticado, redireciona para login
  if (!token) {
    const url = new URL("/api/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Se autenticado mas sem role definido, redireciona para onboarding
  if (!token.role || token.role === "USER") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Checa role-based access
  for (const [path, allowedRoles] of Object.entries(roleBasedPaths)) {
    if (pathname.startsWith(path)) {
      const userRole = token.role as string;
      
      if (!allowedRoles.includes(userRole)) {
        // Usuário não tem permissão
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  // Adiciona informações do usuário aos headers para uso nas rotas
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", token.sub || "");
  requestHeaders.set("x-user-role", (token.role as string) || "USER");
  requestHeaders.set("x-user-email", (token.email as string) || "");

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Aplica security headers
  return applySecurityHeaders(request, response);
}

// Configuração de quais paths o middleware deve rodar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
