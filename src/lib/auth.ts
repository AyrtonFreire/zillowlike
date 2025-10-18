import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const providers = [] as any[];

// Email provider removed; using only OAuth providers

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days - JWT will be refreshed on each request
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Manually manage users and accounts (no PrismaAdapter)
      if (!account?.provider || !user?.email) {
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
          (user as any).id = dbUser.id;
          (user as any).role = dbUser.role;
          
          console.log("SignIn - Existing user:", {
            email: user.email,
            role: dbUser.role,
          });

          // Check if this OAuth account is linked
          const accountExists = dbUser.accounts.some(
            (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          );

          if (!accountExists) {
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
            console.log("SignIn - Linked new provider:", account.provider);
          }
        } else {
          // NEW USER - Create with role USER
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

          (user as any).id = newUser.id;
          (user as any).role = "USER";
          
          console.log("SignIn - New user created:", {
            email: user.email,
            role: "USER",
          });
        }

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },
    async jwt({ token, user, trigger }) {
      console.log("🔑 JWT Callback CALLED", { 
        trigger, 
        hasSub: !!token.sub,
        hasUser: !!user,
        currentRole: token.role,
      });
      
      // CRITICAL: Always fetch the latest role from database
      // This ensures role is always up-to-date and prevents stale data
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({ 
            where: { id: token.sub }, 
            select: { role: true, email: true } 
          });
          
          if (dbUser) {
            // Always use the role from database as source of truth
            const oldRole = token.role;
            token.role = dbUser.role;
            
            console.log("🔑 JWT Callback - Fetched from DB:", {
              email: dbUser.email,
              oldRole,
              newRole: token.role,
              changed: oldRole !== token.role,
            });
          } else {
            console.error("❌ JWT Callback - User not found in database:", token.sub);
            // Fallback to USER if user not found
            token.role = "USER";
          }
        } catch (error) {
          console.error("❌ JWT Callback - Error fetching user role:", error);
          // Keep existing role on error
          token.role = token.role ?? "USER";
        }
      } else if (user) {
        // On first sign in, use the role from user object (set in signIn callback)
        token.role = (user as any).role ?? "USER";
        console.log("🔑 JWT Callback - Initial sign in, role:", token.role);
      }
      
      console.log("🔑 JWT Callback DONE - Final role:", token.role);
      return token;
    },
    async session({ session, token }) {
      console.log("📋 Session Callback CALLED", {
        hasToken: !!token,
        tokenRole: token?.role,
        hasUser: !!session.user,
      });
      
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
        
        console.log("✅ Session callback - Role set:", {
          "token.role": token.role,
          "session.role": (session as any).role,
          "session.user.role": session.user ? (session.user as any).role : "no user object",
        });
      } else {
        console.error("❌ Session callback - NO ROLE IN TOKEN!", {
          token,
          hasRole: !!token?.role,
        });
      }
      
      console.log("📋 Session Callback DONE");
      return session;
    },
  },
};

export default NextAuth(authOptions);


