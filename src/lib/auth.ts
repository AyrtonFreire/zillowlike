import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const providers = [] as any[];

const isDev = process.env.NODE_ENV !== "production";
const dbg = (...args: any[]) => {
  if (isDev) console.log(...args);
};

// Email provider removed; using only OAuth providers

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Email e senha",
    credentials: {
      login: { label: "Usuário ou e-mail", type: "text" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.login || !credentials.password) {
        return null;
      }

      const rawLogin = String(credentials.login || "").trim();
      const login = rawLogin.toLowerCase();
      const looksLikeEmail = login.includes("@");

      const user = looksLikeEmail
        ? await prisma.user.findUnique({ where: { email: login } })
        : await (prisma as any).user.findUnique({ where: { username: login } });

      if (!user || !user.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      if ((looksLikeEmail || user.email) && !user.emailVerified) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        authVersion: (user as any).authVersion ?? 0,
        mustChangePassword: (user as any).mustChangePassword ?? false,
      } as any;
    },
  })
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  // REMOVED PrismaAdapter - we manage users manually in signIn callback
  // This prevents the adapter from creating users with default role before our callback runs
  providers,
  session: { 
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 dias de sessão (renovada enquanto houver uso)
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // mesmo prazo da sessão
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        // Login por email/senha já foi validado no authorize
        return true;
      }

      dbg("🔐 SignIn Callback START", {
        email: user?.email,
        provider: account?.provider,
        hasAccount: !!account,
      });
      
      // Manually manage users and accounts (no PrismaAdapter)
      if (!account?.provider || !user?.email) {
        console.error("❌ SignIn - Missing required data", { 
          hasProvider: !!account?.provider, 
          hasEmail: !!user?.email 
        });
        return false;
      }

      try {
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (dbUser) {
          // EXISTING USER - Use role from database
          dbg("✅ SignIn - EXISTING USER FOUND", {
            email: user.email,
            dbRole: dbUser.role,
            userId: dbUser.id,
          });
          
          // CRITICAL: Set user properties that will be passed to JWT callback
          user.id = dbUser.id;
          (user as any).role = dbUser.role;
          (user as any).authVersion = (dbUser as any).authVersion ?? 0;
          
          dbg("✅ SignIn - User object updated with DB role:", {
            "user.id": user.id,
            "user.role": (user as any).role,
          });

          // Check if this OAuth account is linked
          const accountExists = dbUser.accounts.some(
            (acc: any) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          );

          if (!accountExists) {
            dbg("🔗 SignIn - Linking new OAuth provider:", account.provider);
            // Link new OAuth provider to existing user
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });

            try {
              const updated = await (prisma as any).user.update({
                where: { id: dbUser.id },
                data: { authVersion: { increment: 1 } },
                select: { authVersion: true },
              });
              (user as any).authVersion = updated.authVersion;
            } catch {}
            dbg("✅ SignIn - OAuth provider linked successfully");
          } else {
            dbg("✅ SignIn - OAuth account already linked");
          }
        } else {
          // NEW USER - Create with role USER
          dbg("🆕 SignIn - Creating NEW user:", user.email);
          
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: "USER",
              emailVerified: new Date(),
            },
          });

          // Create OAuth account
          await prisma.account.create({
            data: {
              userId: newUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          });

          user.id = newUser.id;
          (user as any).role = "USER";
          (user as any).authVersion = (newUser as any).authVersion ?? 0;
          
          dbg("✅ SignIn - New user created successfully:", {
            email: user.email,
            role: "USER",
            userId: newUser.id,
          });
        }

        dbg("🔐 SignIn Callback SUCCESS - Returning true");
        return true;
      } catch (error) {
        console.error("❌❌❌ SignIn callback FATAL ERROR:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        // DO NOT return false - let the error propagate
        throw error;
      }
    },
    async jwt({ token, user, trigger }) {
      const nowMs = Date.now();
      const ROLE_REFRESH_MS = 10 * 60 * 1000;

      if (user) {
        // First sign in: role comes from user object
        token.role = (user as any).role ?? token.role ?? "USER";
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.picture = (user as any).image ?? (token as any).picture;
        (token as any).authVersion = (user as any).authVersion ?? (token as any).authVersion ?? 0;
        (token as any).mustChangePassword =
          (user as any).mustChangePassword ?? (token as any).mustChangePassword ?? false;
        (token as any).roleCheckedAt = nowMs;
        dbg("🔑 JWT Callback - Initial sign in, role:", token.role);
        return token;
      }

      if (token.sub) {
        const lastCheckedAt = Number((token as any).roleCheckedAt || 0);
        const shouldRefresh = !lastCheckedAt || nowMs - lastCheckedAt > ROLE_REFRESH_MS || trigger === "update";
        if (shouldRefresh) {
          try {
            const dbUser = await (prisma as any).user.findUnique({
              where: { id: token.sub },
              select: {
                role: true,
                email: true,
                name: true,
                image: true,
                authVersion: true,
                mustChangePassword: true,
                recoveryEmail: true,
                recoveryEmailVerifiedAt: true,
              },
            });

            const dbAuthVersion = (dbUser as any)?.authVersion ?? 0;
            const tokenAuthVersion = Number((token as any).authVersion ?? 0);

            if (dbAuthVersion !== tokenAuthVersion) {
              if (trigger === "update") {
                delete (token as any).error;
                (token as any).authVersion = dbAuthVersion;
              } else {
                (token as any).error = "SESSION_REVOKED";
                (token as any).authVersion = dbAuthVersion;
                (token as any).roleCheckedAt = nowMs;
                return token;
              }
            }

            token.role = dbUser?.role ?? token.role ?? "USER";
            token.email = dbUser?.email ?? token.email;
            token.name = dbUser?.name ?? token.name;
            token.picture = dbUser?.image ?? (token as any).picture;
            (token as any).authVersion = dbAuthVersion;
            (token as any).mustChangePassword = (dbUser as any)?.mustChangePassword ?? false;
            (token as any).recoveryEmail = (dbUser as any)?.recoveryEmail ?? null;
            (token as any).recoveryEmailVerifiedAt = (dbUser as any)?.recoveryEmailVerifiedAt
              ? new Date((dbUser as any).recoveryEmailVerifiedAt).toISOString()
              : null;
            (token as any).roleCheckedAt = nowMs;
          } catch (error) {
            console.error("❌ JWT Callback - Error fetching user role:", error);
            token.role = token.role ?? "USER";
            (token as any).authVersion = Number((token as any).authVersion ?? 0);
            (token as any).roleCheckedAt = nowMs;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as any)?.error === "SESSION_REVOKED") {
        return null as any;
      }
      // CRITICAL: Must add role to BOTH session and session.user
      // NextAuth client reads from session.user
      if (token?.sub) {
        (session as any).userId = token.sub;
        if (session.user) {
          (session.user as any).id = token.sub;
        }
      }
      
      if (token?.role) {
        // Add to session root (for server-side)
        (session as any).role = token.role;
        
        // Add to session.user (for client-side useSession hook)
        if (session.user) {
          (session.user as any).role = token.role;
        }
      } else {
        console.error("❌ Session callback - NO ROLE IN TOKEN!", {
          token,
          hasRole: !!token?.role,
        });
      }

      if (session.user) {
        if (token?.email) session.user.email = token.email as string;
        if (token?.name) session.user.name = token.name as string;
        if ((token as any)?.picture) (session.user as any).image = (token as any).picture as string;
        (session.user as any).mustChangePassword = (token as any)?.mustChangePassword ?? false;
        (session.user as any).recoveryEmail = (token as any)?.recoveryEmail ?? null;
        (session.user as any).recoveryEmailVerifiedAt = (token as any)?.recoveryEmailVerifiedAt ?? null;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);


