import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashToken(token: string, salt?: string): string {
  const value = String(token ?? "");
  return sha256(salt ? `${salt}:${value}` : value);
}
