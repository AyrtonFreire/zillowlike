import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { applySecurityHeaders } from "@/lib/security-headers";

// Rotas que requerem autenticação
const protectedPaths = ["/broker", "/admin", "/owner", "/dashboard", "/realtor"];

// Mapeamento de paths para roles permitidos
const roleBasedPaths: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/broker": ["REALTOR", "AGENCY", "ADMIN"],
  "/realtor": ["REALTOR", "AGENCY", "ADMIN"],
  "/owner": ["OWNER", "REALTOR", "AGENCY", "ADMIN"],
  "/dashboard": ["USER", "REALTOR", "AGENCY", "OWNER", "ADMIN"], // Todos autenticados
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Este middleware deve rodar apenas nas rotas protegidas (ver matcher abaixo)
  // Mantemos uma verificação defensiva para evitar custos inesperados.
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

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

  // Removido: fluxo automático de onboarding que promovia USER para OWNER/REALTOR

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
    "/admin/:path*",
    "/broker/:path*",
    "/realtor/:path*",
    "/owner/:path*",
    "/dashboard/:path*",
  ],
};
