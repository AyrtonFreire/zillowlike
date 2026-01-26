import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rotas que requerem autenticação
const protectedPaths = ["/admin", "/owner", "/dashboard", "/realtor", "/broker", "/agency"];

// Mapeamento de paths para roles permitidos
const roleBasedPaths: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/realtor": ["REALTOR", "ADMIN"],
  "/broker": ["REALTOR", "ADMIN"],
  "/owner": ["OWNER", "REALTOR", "AGENCY", "ADMIN"],
  "/agency": ["AGENCY", "ADMIN"],
  "/dashboard": ["USER", "REALTOR", "AGENCY", "OWNER", "ADMIN"], // Todos autenticados
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDeprecatedApiPath =
    pathname.startsWith("/api/leads/mural") ||
    /^\/api\/leads\/[^/]+\/(candidate|distribute|select-priority)\/?$/.test(pathname) ||
    /^\/api\/admin\/leads\/[^/]+\/mural\/?$/.test(pathname) ||
    pathname.startsWith("/api/realtor/apply");

  if (isDeprecatedApiPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (pathname === "/broker") {
    const url = request.nextUrl.clone();
    url.pathname = "/broker/dashboard";
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/broker/agenda" ||
    pathname === "/broker/agenda/" ||
    pathname === "/broker/queue" ||
    pathname === "/broker/queue/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/broker/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/broker/apply")) {
    return NextResponse.redirect(new URL("/broker/dashboard", request.url));
  }

  if (pathname.startsWith("/become-realtor")) {
    return NextResponse.redirect(new URL("/realtor/register", request.url));
  }

  const segments = pathname.split("/").filter(Boolean);
  const isPublicRealtorProfile =
    segments.length === 2 &&
    segments[0] === "realtor" &&
    !["register", "leads"].includes(segments[1]);
  const isPublicOwnerProfile =
    segments.length === 2 &&
    segments[0] === "owner" &&
    !["dashboard", "analytics", "leads", "new", "edit", "properties"].includes(segments[1]);

  // Este middleware deve rodar apenas nas rotas protegidas (ver matcher abaixo)
  // Mantemos uma verificação defensiva para evitar custos inesperados.
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected || isPublicRealtorProfile || isPublicOwnerProfile) {
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

  if (pathname.startsWith("/realtor/register")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/agency/register")) {
    return NextResponse.next();
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

  return response;
}

// Configuração de quais paths o middleware deve rodar
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/broker/:path*",
    "/agency/:path*",
    "/owner/dashboard/:path*",
    "/owner/analytics/:path*",
    "/owner/leads/:path*",
    "/owner/new/:path*",
    "/owner/edit/:path*",
    "/owner/properties/:path*",
    "/realtor/register/:path*",
    "/realtor/leads/:path*",
    "/api/leads/mural/:path*",
    "/api/realtor/apply/:path*",
    "/api/leads/:id/candidate/:path*",
    "/api/leads/:id/distribute/:path*",
    "/api/leads/:id/select-priority/:path*",
    "/api/admin/leads/:id/mural/:path*",
  ],
};
