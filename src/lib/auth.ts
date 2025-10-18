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
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On sign in, persist role into the token
      if (user) {
        // @ts-ignore user may have role
        token.role = (user as any).role ?? token.role ?? "USER";
      }
      
      // Always fetch fresh role from database to ensure updates are reflected
      // This ensures role changes (like USER -> ADMIN) are picked up immediately
      if (token.sub) {
        try {
          const u = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true } });
          if (u?.role) {
            // @ts-ignore augment token
            token.role = u.role;
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
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


