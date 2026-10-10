import { clientAddress } from "./client-address";
import type { RequestHandler } from "express";
type Bucket = { count: number; reset: number };
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const buckets = new Map<string, Bucket>();
  return (req, res, next) => {
    const now = Date.now();
    const key = clientAddress(req);
    const headers = (remaining: number, reset: number) => {
      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(Math.max(0, remaining)));
      // Relative seconds, consistent with Retry-After; this is the local IP bucket.
      res.set("RateLimit-Reset", String(Math.max(1, Math.ceil((reset - now) / 1000))));
    };
    const reject = (reset: number) => {
      headers(0, reset);
      res.locals.aiCode = "RATE_LIMITED";
      res.set("Retry-After", String(Math.max(1, Math.ceil((reset - now) / 1000))));
      res.status(429).json({ error: "RATE_LIMITED" });
    };
    let entry = buckets.get(key);
    if (!entry || entry.reset <= now) {
      if (buckets.size >= 10000) {
        let earliestReset = now + windowMs;
        for (const [oldKey, old] of buckets) {
          if (old.reset <= now) buckets.delete(oldKey);
          else earliestReset = Math.min(earliestReset, old.reset);
        }
        if (buckets.size >= 10000) { reject(earliestReset); return; }
      }
      entry = { count: 0, reset: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    headers(max - entry.count, entry.reset);
    if (entry.count > max) {
      reject(entry.reset); return;
    }
    next();
  };
}
