import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string;
    role?: string;
    sessionKey?: string;
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      mustChangePassword?: boolean;
      recoveryEmail?: string | null;
      recoveryEmailVerifiedAt?: string | null;
      sessionKey?: string;
    };
  }

  interface User {
    role?: string;
    mustChangePassword?: boolean;
    authVersion?: number;
    sessionKey?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    authVersion?: number;
    mustChangePassword?: boolean;
    recoveryEmail?: string | null;
    recoveryEmailVerifiedAt?: string | null;
    roleCheckedAt?: number;
    error?: string;
    sessionKey?: string;
    sessionCreatedAt?: number;
    sessionProvider?: string;
  }
}
