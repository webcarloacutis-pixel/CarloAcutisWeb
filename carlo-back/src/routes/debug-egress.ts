import type { Express, Request, Response } from "express";

async function probe(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const t0 = Date.now();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, { signal: controller.signal });
    const ms = Date.now() - t0;
    return { url, ok: r.ok, status: r.status, ms };
  } catch (e: any) {
    const ms = Date.now() - t0;
    return { url, ok: false, status: 0, ms, error: e?.name || e?.message || String(e) };
  } finally {
    clearTimeout(to);
  }
}

export function registerDebugEgressRoute(app: Express) {
  app.get("/debug/egress", async (_req: Request, res: Response) => {
    const a = await probe("https://example.com");
    const b = await probe("https://api.openai.com/v1/models"); // sin auth: 401 rápido si hay internet
    return res.json({ example: a, openai: b, now: new Date().toISOString() });
  });
}
