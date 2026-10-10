import type { Response } from "express";
import type { Server } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../app";

vi.mock("./prisma", () => ({ prisma: {}, runtimeDatabaseUrl: undefined }));
vi.mock("./catalog-pagination", () => ({
  readCatalogPage: vi.fn(async () => ({ items: [], total: 0, nextCursor: null })),
  sendCatalogPage: (response: Response, page: unknown) => response.json(page),
}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("exposes safe correlation and rate headers to the exact browser origin and keeps four GETs outside the POST limiter", async () => {
  vi.stubEnv("FRONTEND_ORIGIN", "https://visitor.example.test");
  vi.stubEnv("RENDER_GIT_COMMIT", "a".repeat(40));
  vi.stubEnv("AI_ENABLED", "false");
  vi.stubEnv("OPENAI_API_KEY", undefined);
  vi.stubEnv("DATABASE_URL", undefined);
  vi.spyOn(console, "info").mockImplementation(() => {});
  const server: Server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const requestId = "12345678-1234-1234-1234-123456789abc";
  const headers = { Origin: "https://visitor.example.test", "X-Request-Id": requestId };
  try {
    const ready = await fetch(base + "/ready", { headers });
    expect(ready.status).toBe(503);
    expect(ready.headers.get("Access-Control-Allow-Origin")).toBe(headers.Origin);
    expect(ready.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    const exposed = ready.headers.get("Access-Control-Expose-Headers")!.toLowerCase().split(",").map(value => value.trim());
    expect(exposed).toEqual(expect.arrayContaining(["x-request-id", "x-backend-revision", "retry-after", "ratelimit-limit", "ratelimit-remaining", "ratelimit-reset"]));
    expect(ready.headers.get("X-Request-Id")).toBe(requestId);
    expect(ready.headers.get("X-Backend-Revision")).toBe("a".repeat(40));
    expect(ready.headers.get("Retry-After")).toBe("5");
    for (let index = 0; index < 11; index++) {
      const response = await fetch(base + "/api/ai/chat", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "isolated no-provider fixture" }),
      });
      expect(response.status).toBe(index < 10 ? 503 : 429);
      expect(response.headers.get("RateLimit-Limit")).toBe("10");
      expect(response.headers.get("RateLimit-Remaining")).toBe(String(Math.max(0, 9 - index)));
      expect(Number(response.headers.get("RateLimit-Reset"))).toBeGreaterThan(0);
      if (index === 10) {
        expect((await response.json()).error).toBe("RATE_LIMITED");
        expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
      }
    }
    for (const [route, status] of [["/auth/me", 401], ["/ai/chat", 404], ["/saints", 200], ["/miracles", 200]] as const) {
      const response = await fetch(base + route, { headers });
      expect(response.status).toBe(status);
      expect(response.headers.get("RateLimit-Limit")).toBeNull();
      expect(response.headers.get("Retry-After")).toBeNull();
    }
    const other = await fetch(base + "/health", { headers: { Origin: "https://other.example.test" } });
    expect(other.headers.get("Access-Control-Allow-Origin")).not.toBe("https://other.example.test");
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
