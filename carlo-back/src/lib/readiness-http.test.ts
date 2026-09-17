import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

vi.mock("./prisma", () => ({ prisma: {} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("readiness HTTP response", () => {
  it("returns one deterministic failure and keeps health independent of the database", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const generic = vi.spyOn(console, "error").mockImplementation(() => {});
    const server: Server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      expect(await (await fetch(`${origin}/health`)).json()).toEqual({ ok: true });
      const ready = await fetch(`${origin}/ready`);
      expect(ready.status).toBe(503);
      expect(await ready.json()).toEqual({ error: "DATABASE_NOT_READY", failureStage: "ENV_CONFIGURATION", safeCode: "DATABASE_URL_MISSING" });
      expect(log).toHaveBeenCalledOnce();expect(log.mock.calls[0][0]).toBe("DB_READINESS_DIAGNOSTIC");
      expect(generic).not.toHaveBeenCalled();
    } finally { server.closeAllConnections();await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
