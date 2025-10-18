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
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  // Allow linking accounts with the same email (Google + GitHub)
  // This is safe in our case since both providers verify email
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow sign in with different OAuth providers for the same email
      if (account?.provider && user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (existingUser) {
          // CRITICAL: Update the user object with the existing user's role
          // This ensures the JWT callback receives the correct role
          (user as any).id = existingUser.id;
          (user as any).role = existingUser.role;
          
          console.log("SignIn Callback - Existing user found:", {
            email: user.email,
            id: existingUser.id,
            role: existingUser.role,
          });

          // Check if this provider is already linked
          const accountExists = existingUser.accounts.some(
            (acc) => acc.provider === account.provider
          );

          if (!accountExists) {
            // Link the new provider account to existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
          }
        } else {
          console.log("SignIn Callback - New user, will be created with role USER");
        }
      }
      return true;
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


