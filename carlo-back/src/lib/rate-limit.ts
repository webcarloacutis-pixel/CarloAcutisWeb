import { clientAddress } from "./client-address";
import type { RequestHandler } from "express";
type Bucket = { count: number; reset: number };
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const buckets = new Map<string, Bucket>();
  return (req, res, next) => {
    const now = Date.now();
    const key = clientAddress(req);
    let entry = buckets.get(key);
    if (!entry || entry.reset <= now) {
      if (buckets.size >= 10000) {
        for (const [oldKey, old] of buckets) if (old.reset <= now) buckets.delete(oldKey);
        if (buckets.size >= 10000) { res.status(429).json({ error: "RATE_LIMITED" }); return; }
      }
      entry = { count: 0, reset: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((entry.reset - now) / 1000))));
      res.status(429).json({ error: "RATE_LIMITED" }); return;
    }
    next();
  };
}
