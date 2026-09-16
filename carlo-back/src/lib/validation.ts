import { HttpError } from "./errors";
export function objectBody(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "INVALID_BODY");
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, "UNKNOWN_FIELD");
  return body;
}
export function text(input: unknown, max: number, required = false, preserve = false): string | null {
  if (input === undefined || input === null) {
    if (required) throw new HttpError(400, "REQUIRED_FIELD");
    return null;
  }
  if (typeof input !== "string" || input.length > max || input.includes("\0")) throw new HttpError(400, "INVALID_TEXT");
  const value = preserve ? input : input.trim();
  if (required && !value.trim()) throw new HttpError(400, "REQUIRED_FIELD");
  return value || null;
}
export function id(input: unknown): string {
  const value = text(input, 100, true)!;
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new HttpError(400, "INVALID_ID");
  return value;
}
export function bool(input: unknown): boolean {
  if (typeof input !== "boolean") throw new HttpError(400, "INVALID_BOOLEAN");
  return input;
}
export function finite(input: unknown, min: number, max: number, integer = false): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "number" || !Number.isFinite(input) || input < min || input > max || (integer && !Number.isInteger(input))) throw new HttpError(400, "INVALID_NUMBER");
  return input;
}
export function strings(input: unknown, maxItems: number, maxLength: number): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > maxItems) throw new HttpError(400, "INVALID_ARRAY");
  return input.map((value) => text(value, maxLength, true)!);
}
export function imageUrl(input: unknown): string | null {
  const value = text(input, 2000);
  if (value && !(value.startsWith("/") && !value.startsWith("//"))) {
    let url: URL;
    try { url = new URL(value); } catch { throw new HttpError(400, "INVALID_URL"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new HttpError(400, "INVALID_URL");
  }
  return value;
}
export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
