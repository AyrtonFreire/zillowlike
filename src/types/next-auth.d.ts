import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string;
    role?: string;
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      mustChangePassword?: boolean;
      recoveryEmail?: string | null;
      recoveryEmailVerifiedAt?: string | null;
    };
  }

  interface User {
    role?: string;
    mustChangePassword?: boolean;
    authVersion?: number;
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
  }
}
