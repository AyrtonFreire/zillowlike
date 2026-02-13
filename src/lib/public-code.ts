import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type PublicCodePrefix = "P" | "L";

export function createPublicCode(prefix: PublicCodePrefix, size = 8) {
  const nano = customAlphabet(alphabet, size);
  return `${prefix}${nano()}`;
}

export function normalizePublicCodeInput(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

export function formatPublicCode(code: string) {
  const raw = normalizePublicCodeInput(code);
  if (raw.length <= 1) return raw;
  return `${raw.slice(0, 1)}-${raw.slice(1)}`;
}
