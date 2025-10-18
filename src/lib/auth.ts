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
  session: { strategy: "jwt" },
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
            
            if (oldRole !== dbUser.role) {
              console.log("JWT Callback - Role updated:", {
                email: dbUser.email,
                oldRole,
                newRole: dbUser.role,
              });
            }
          } else {
            console.error("JWT Callback - User not found in database:", token.sub);
            // Fallback to USER if user not found
            token.role = "USER";
          }
        } catch (error) {
          console.error("JWT Callback - Error fetching user role:", error);
          // Keep existing role on error
          token.role = token.role ?? "USER";
        }
      } else if (user) {
        // On first sign in, use the role from user object (set in signIn callback)
        token.role = (user as any).role ?? "USER";
        console.log("JWT Callback - Initial sign in, role:", token.role);
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        (session as any).userId = token.sub;
      }
      if (token?.role) {
        (session as any).role = token.role;
        if ((session as any).user) (session as any).user.role = token.role as any;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);


