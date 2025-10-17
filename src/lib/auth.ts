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
  callbacks: {
    async jwt({ token, user }) {
      // On sign in, persist role into the token
      if (user) {
        // @ts-ignore user may have role
        token.role = (user as any).role ?? token.role ?? "USER";
      } else if (!token.role && token.sub) {
        try {
          const u = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true } });
          // @ts-ignore augment token
          token.role = u?.role ?? "USER";
        } catch {}
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


