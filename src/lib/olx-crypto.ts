import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(): Buffer {
  const raw = String(process.env.OLX_TOKEN_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    throw new Error("Missing OLX_TOKEN_ENCRYPTION_KEY");
  }

  const maybeHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0;
  const bytes = maybeHex ? Buffer.from(raw, "hex") : Buffer.from(raw, "utf8");

  if (bytes.length === 32) return bytes;

  return createHash("sha256").update(bytes).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string): string {
  const raw = String(value || "").trim();
  const parts = raw.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid secret format");
  }

  const key = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
